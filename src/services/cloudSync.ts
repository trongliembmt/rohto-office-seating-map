import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Desk, Site, User } from '../types';
import {
  DEFAULT_DESKS,
  DEFAULT_SITES,
  DEFAULT_USERS,
  STORAGE_KEYS,
  SESSION_TIMEOUT_MS,
  parseCleanNumber,
} from '../constants';
import {
  getFirebaseFirestore,
  FirebaseCustomConfig,
} from '../firebaseConfig';

/**
 * Lấy thông tin tài khoản đang đăng nhập trong phiên làm việc (Tự động hết hạn sau 60 phút)
 */
export function getCurrentSessionUser(): User | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    const loginTimeRaw = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
    if (!raw) return null;
    if (loginTimeRaw) {
      const loginTime = Number(loginTimeRaw);
      if (Date.now() - loginTime >= SESSION_TIMEOUT_MS) {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
        sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
        sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
        return null;
      }
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Kiểm tra phân quyền: Quản trị viên (Admin)
 * Có toàn quyền quản lý cấu hình API Cloud, khôi phục hệ thống và phân quyền
 */
export function isCurrentSessionAdmin(): boolean {
  const user = getCurrentSessionUser();
  return user?.role === 'admin';
}

/**
 * Kiểm tra phân quyền thao tác ghi Cloud (Admin & Editor)
 * Cả Admin và Editor đều có quyền thêm/sửa/xóa/di chuyển bàn, đổi tên nhân viên,
 * đổi ảnh sơ đồ, thêm/xóa phòng ban, quản lý user và tự động lưu Realtime lên Cloud.
 * Viewer chỉ có quyền xem (Read-only).
 */
export function canCurrentSessionWriteCloud(): boolean {
  const user = getCurrentSessionUser();
  return user?.role === 'admin' || user?.role === 'editor';
}

// Giữ lại alias cho tính tương thích
export const canCurrentSessionEditDesks = canCurrentSessionWriteCloud;

const SITES_COLLECTION = 'rohto_sites';
const DESKS_COLLECTION = 'rohto_desks';
const USERS_COLLECTION = 'rohto_users';
const SYSTEM_COLLECTION = 'rohto_system';
const SETTINGS_DOC = 'settings';

export interface SystemSettings {
  pinSize?: number;
  activeSiteId?: string;
}

export interface CloudSyncCallbacks {
  onSitesUpdate: (sites: Site[]) => void;
  onDesksUpdate: (desks: Desk[]) => void;
  onUsersUpdate: (users: User[]) => void;
  onSystemSettingsUpdate?: (settings: SystemSettings) => void;
  onSyncStatusChange?: (status: 'connected' | 'syncing' | 'error' | 'offline', message?: string) => void;
}

/**
 * Đăng ký lắng nghe dữ liệu thời gian thực (Realtime onSnapshot) từ Firestore
 */
export function subscribeToCloudDatabase(callbacks: CloudSyncCallbacks): () => void {
  const { db, isReady } = getFirebaseFirestore();

  if (!isReady || !db) {
    callbacks.onSyncStatusChange?.('offline', 'Chưa kết nối Cloud Database');
    return () => {};
  }

  callbacks.onSyncStatusChange?.('syncing', 'Đang kết nối Firestore Cloud...');

  let unsubSites: (() => void) | null = null;
  let unsubDesks: (() => void) | null = null;
  let unsubUsers: (() => void) | null = null;
  let unsubSettings: (() => void) | null = null;
  let hasCheckedSeed = false;
  let hasReceivedFirstSnapshot = false;

  // Lập một bộ hẹn giờ phát hiện nếu kết nối bị treo quá 8s
  const connectionTimer = setTimeout(() => {
    if (!hasReceivedFirstSnapshot) {
      callbacks.onSyncStatusChange?.(
        'syncing',
        'Đang cố gắng kết nối Firestore... (Nếu kéo dài, vui lòng kiểm tra kết nối Internet hoặc Firestore Rules)'
      );
    }
  }, 8000);

  try {
    // 1. Lắng nghe Sites
    const sitesCol = collection(db, SITES_COLLECTION);
    unsubSites = onSnapshot(
      sitesCol,
      async (snapshot) => {
        hasReceivedFirstSnapshot = true;
        clearTimeout(connectionTimer);

        if (!snapshot.empty) {
          const loadedSites: Site[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedSites.push({
              id: data.id || docSnap.id,
              name: data.name || '',
              mapImage: data.mapImage || 'Rohto New Layout - June 2026.png',
              description: data.description || '',
              departments: Array.isArray(data.departments) ? data.departments : [],
              pinSize: typeof data.pinSize === 'number' ? data.pinSize : 13,
            });
          });
          callbacks.onSitesUpdate(loadedSites);
        } else if (!hasCheckedSeed) {
          // Nếu Firestore mới tinh chưa có dữ liệu, tự động đẩy dữ liệu mẫu ban đầu trực tiếp lên Cloud
          hasCheckedSeed = true;
          try {
            console.log('Khởi tạo dữ liệu ban đầu 100% lên Cloud Firestore...');
            await uploadFullStateToCloud(DEFAULT_SITES, DEFAULT_DESKS, DEFAULT_USERS, true);
          } catch (seedErr) {
            console.warn('Lỗi seed dữ liệu ban đầu:', seedErr);
          }
        }
        callbacks.onSyncStatusChange?.('connected', 'Cloud Firestore đã kết nối trực tiếp (Realtime)');
      },
      (error) => {
        clearTimeout(connectionTimer);
        console.error('Lỗi lắng nghe Sites từ Firestore:', error);
        callbacks.onSyncStatusChange?.('error', `Lỗi kết nối Firestore: ${error.message}`);
      }
    );

    // 2. Lắng nghe Desks
    const desksCol = collection(db, DESKS_COLLECTION);
    unsubDesks = onSnapshot(
      desksCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedDesks: Desk[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const rawSize = parseCleanNumber(data.fontSize ?? data.customSize, 13);
            const cleanSize = Math.max(2, Math.min(32, Math.round(rawSize)));
            const cleanRotation = parseCleanNumber(data.rotation, 0);
            const cleanX = parseCleanNumber(data.x, 50);
            const cleanY = parseCleanNumber(data.y, 50);

            loadedDesks.push({
              id: data.id || docSnap.id,
              name: data.name || '',
              dept: data.dept || 'Sale',
              empCode: data.empCode || '',
              title: data.title || '',
              site: data.site || '',
              x: cleanX,
              y: cleanY,
              fontSize: cleanSize,
              customSize: cleanSize,
              rotation: cleanRotation,
            });
          });
          callbacks.onDesksUpdate(loadedDesks);
        }
      },
      (error) => {
        console.error('Lỗi lắng nghe Desks từ Firestore:', error);
        callbacks.onSyncStatusChange?.('error', `Lỗi tải danh sách bàn: ${error.message}`);
      }
    );

    // 3. Lắng nghe Users
    const usersCol = collection(db, USERS_COLLECTION);
    unsubUsers = onSnapshot(
      usersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedUsers: User[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.username) {
              loadedUsers.push({
                username: data.username,
                password: data.password || '123456',
                role: data.role || 'viewer',
              });
            }
          });
          callbacks.onUsersUpdate(loadedUsers);
        }
      },
      (error) => {
        console.error('Lỗi lắng nghe Users từ Firestore:', error);
        callbacks.onSyncStatusChange?.('error', `Lỗi tải danh sách tài khoản: ${error.message}`);
      }
    );

    // 4. Lắng nghe Cài đặt hệ thống (Pin size, Active Site) từ Cloud
    const settingsDocRef = doc(db, SYSTEM_COLLECTION, SETTINGS_DOC);
    unsubSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callbacks.onSystemSettingsUpdate?.({
            pinSize: typeof data.pinSize === 'number' ? data.pinSize : undefined,
            activeSiteId: typeof data.activeSiteId === 'string' ? data.activeSiteId : undefined,
          });
        }
      },
      (error) => {
        console.warn('Lỗi lắng nghe cài đặt hệ thống từ Firestore:', error);
      }
    );
  } catch (err) {
    clearTimeout(connectionTimer);
    console.error('Lỗi khởi tạo Snapshot listener:', err);
    callbacks.onSyncStatusChange?.('error', 'Không thể kết nối Firestore');
  }

  // Cleanup listeners khi component unmount
  return () => {
    clearTimeout(connectionTimer);
    if (unsubSites) unsubSites();
    if (unsubDesks) unsubDesks();
    if (unsubUsers) unsubUsers();
    if (unsubSettings) unsubSettings();
  };
}

/**
 * Lưu hoặc cập nhật một Site lên Firestore (Admin & Editor)
 */
export async function saveSiteToCloud(site: Site): Promise<boolean> {
  if (!canCurrentSessionWriteCloud()) {
    console.warn('Từ chối lưu Site: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    const siteDocRef = doc(db, SITES_COLLECTION, site.id);
    const sitePayload: Record<string, any> = {
      id: site.id || '',
      name: site.name || '',
      mapImage: site.mapImage || 'Rohto New Layout - June 2026.png',
      description: site.description || '',
      departments: Array.isArray(site.departments) ? site.departments : [],
      pinSize: typeof site.pinSize === 'number' ? site.pinSize : 13,
      updatedAt: serverTimestamp(),
    };
    await setDoc(siteDocRef, sitePayload, { merge: true });
    return true;
  } catch (error) {
    console.error('Lỗi lưu Site lên Cloud:', error);
    return false;
  }
}

/**
 * Xóa một Site trên Firestore (Chỉ Admin)
 */
export async function deleteSiteFromCloud(siteId: string, siteName?: string): Promise<boolean> {
  if (!isCurrentSessionAdmin()) {
    console.warn('Từ chối xóa Site: Chỉ Admin mới có quyền xóa Site trên Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    await deleteDoc(doc(db, SITES_COLLECTION, siteId));

    // Xóa các bàn liên quan tới site đó
    if (siteName) {
      const desksSnapshot = await getDocs(collection(db, DESKS_COLLECTION));
      const batch = writeBatch(db);
      let count = 0;
      desksSnapshot.forEach((docSnap) => {
        if (docSnap.data().site === siteName) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    }
    return true;
  } catch (error) {
    console.error('Lỗi xóa Site trên Cloud:', error);
    return false;
  }
}

/**
 * Lưu hoặc cập nhật một Chỗ ngồi (Desk) lên Firestore (Admin & Editor)
 */
export async function saveDeskToCloud(desk: Desk): Promise<boolean> {
  if (!canCurrentSessionEditDesks()) {
    console.warn('Từ chối lưu Desk: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    // Để an toàn và đồng nhất, mã doc ID dùng desk.id
    const safeDocId = `${desk.site.replace(/[^a-zA-Z0-9_-]/g, '_')}__${desk.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const deskDocRef = doc(db, DESKS_COLLECTION, safeDocId);

    // Chuẩn hóa toàn bộ dữ liệu bàn, tuyệt đối không để thuộc tính nào là undefined hoặc chuỗi lẫn đơn vị
    const effectiveSize = Math.max(2, Math.min(32, Math.round(parseCleanNumber(desk.fontSize ?? desk.customSize, 13))));
    const effectiveRotation = parseCleanNumber(desk.rotation, 0);
    const cleanX = parseCleanNumber(desk.x, 50);
    const cleanY = parseCleanNumber(desk.y, 50);

    const deskPayload: Record<string, any> = {
      id: desk.id || '',
      name: desk.name || '',
      dept: desk.dept || 'Sale',
      empCode: desk.empCode || '',
      title: desk.title || '',
      site: desk.site || '',
      x: cleanX,
      y: cleanY,
      fontSize: effectiveSize,
      customSize: effectiveSize,
      rotation: effectiveRotation,
      updatedAt: serverTimestamp(),
    };

    await setDoc(deskDocRef, deskPayload, { merge: true });
    return true;
  } catch (error) {
    console.error('Lỗi lưu Desk lên Cloud:', error);
    return false;
  }
}

/**
 * Xóa một Chỗ ngồi (Desk) trên Firestore (Admin & Editor)
 */
export async function deleteDeskFromCloud(deskId: string, siteName?: string): Promise<boolean> {
  if (!canCurrentSessionEditDesks()) {
    console.warn('Từ chối xóa Desk: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    const stringDeskId = String(deskId).trim();
    const batch = writeBatch(db);
    let count = 0;

    // 1. Thử xóa theo safeDocId tiêu chuẩn nếu có tên site
    if (siteName) {
      const safeDocId = `${siteName.replace(/[^a-zA-Z0-9_-]/g, '_')}__${stringDeskId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      batch.delete(doc(db, DESKS_COLLECTION, safeDocId));
      count++;
    }

    // 2. Thử xóa theo doc ID trực tiếp bằng stringDeskId
    batch.delete(doc(db, DESKS_COLLECTION, stringDeskId));
    count++;

    // 3. Quét Firestore tìm bất kỳ document nào có data.id == stringDeskId để xóa triệt để
    try {
      const desksSnapshot = await getDocs(collection(db, DESKS_COLLECTION));
      desksSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docDeskId = String(data.id || '').trim();
        const snapDocId = String(docSnap.id || '').trim();
        if (
          docDeskId.toLowerCase() === stringDeskId.toLowerCase() ||
          snapDocId.toLowerCase() === stringDeskId.toLowerCase()
        ) {
          if (!siteName || !data.site || data.site === siteName) {
            batch.delete(docSnap.ref);
            count++;
          }
        }
      });
    } catch (queryErr) {
      console.warn('Lỗi quét doc xóa desk trên Firestore:', queryErr);
    }

    if (count > 0) {
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Lỗi xóa Desk trên Cloud:', error);
    return false;
  }
}

/**
 * Lưu nhiều bàn cùng lúc (Admin & Editor)
 */
export async function saveDesksBatchToCloud(desks: Desk[], isInitialSeed = false): Promise<boolean> {
  if (!isInitialSeed && !canCurrentSessionEditDesks()) {
    console.warn('Từ chối batch lưu Desks: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    // Firestore batch tối đa 500 thao tác
    const chunkSize = 400;
    for (let i = 0; i < desks.length; i += chunkSize) {
      const chunk = desks.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const d of chunk) {
        const safeDocId = `${d.site.replace(/[^a-zA-Z0-9_-]/g, '_')}__${d.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const ref = doc(db, DESKS_COLLECTION, safeDocId);
        const effectiveSize = Math.max(2, Math.min(32, Math.round(parseCleanNumber(d.fontSize ?? d.customSize, 13))));
        const effectiveRotation = parseCleanNumber(d.rotation, 0);
        const cleanX = parseCleanNumber(d.x, 50);
        const cleanY = parseCleanNumber(d.y, 50);

        const deskPayload: Record<string, any> = {
          id: d.id || '',
          name: d.name || '',
          dept: d.dept || 'Sale',
          empCode: d.empCode || '',
          title: d.title || '',
          site: d.site || '',
          x: cleanX,
          y: cleanY,
          fontSize: effectiveSize,
          customSize: effectiveSize,
          rotation: effectiveRotation,
          updatedAt: serverTimestamp(),
        };
        batch.set(ref, deskPayload, { merge: true });
      }
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Lỗi batch save desks:', error);
    return false;
  }
}

/**
 * Lưu hoặc cập nhật User lên Firestore (Admin & Editor)
 */
export async function saveUserToCloud(user: User): Promise<boolean> {
  if (!canCurrentSessionWriteCloud()) {
    console.warn('Từ chối lưu User: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    const userDocRef = doc(db, USERS_COLLECTION, user.username.toLowerCase());
    await setDoc(
      userDocRef,
      {
        username: user.username,
        password: user.password,
        role: user.role,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Lỗi lưu User lên Cloud:', error);
    return false;
  }
}

/**
 * Xóa một User trên Firestore (Admin & Editor)
 */
export async function deleteUserFromCloud(username: string): Promise<boolean> {
  if (!canCurrentSessionWriteCloud()) {
    console.warn('Từ chối xóa User: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    await deleteDoc(doc(db, USERS_COLLECTION, username.toLowerCase()));
    return true;
  } catch (error) {
    console.error('Lỗi xóa User trên Cloud:', error);
    return false;
  }
}

/**
 * Lưu Cài đặt hệ thống (Kích thước icon User pinSize, Site đang chọn) lên Cloud (Admin & Editor)
 */
export async function saveSystemSettingsToCloud(settings: SystemSettings): Promise<boolean> {
  if (!canCurrentSessionWriteCloud()) {
    console.warn('Từ chối lưu Cài đặt: Bạn cần quyền Admin hoặc Editor để cập nhật Cloud Realtime!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    const docRef = doc(db, SYSTEM_COLLECTION, SETTINGS_DOC);
    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (typeof settings.pinSize === 'number') {
      payload.pinSize = settings.pinSize;
    }
    if (typeof settings.activeSiteId === 'string' && settings.activeSiteId) {
      payload.activeSiteId = settings.activeSiteId;
    }
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error('Lỗi lưu Cài đặt hệ thống lên Cloud:', error);
    return false;
  }
}

/**
 * Lưu Cấu hình API / Kết nối Cloud lên Firestore (🔒 CHỈ DUY NHẤT ADMIN)
 * Editor và Viewer bị chặn hoàn toàn không được phép chỉnh sửa API Cloud
 */
export async function saveCloudApiConfigToCloud(config: FirebaseCustomConfig): Promise<boolean> {
  if (!isCurrentSessionAdmin()) {
    console.warn('Từ chối lưu API Config: Chỉ duy nhất Admin mới có quyền can thiệp vào cấu hình API Cloud!');
    return false;
  }
  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) return false;

  try {
    const docRef = doc(db, SYSTEM_COLLECTION, 'api_config');
    await setDoc(
      docRef,
      {
        apiKey: config.apiKey,
        projectId: config.projectId,
        authDomain: config.authDomain || '',
        storageBucket: config.storageBucket || '',
        messagingSenderId: config.messagingSenderId || '',
        appId: config.appId || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Lỗi lưu Cấu hình API Cloud:', error);
    return false;
  }
}

/**
 * Đồng bộ toàn bộ dữ liệu hiện tại lên Cloud Firestore (Chỉ Admin)
 */
export async function uploadFullStateToCloud(
  sites: Site[],
  desks: Desk[],
  users: User[],
  isInitialSeed = false
): Promise<{ success: boolean; message: string }> {
  if (!isInitialSeed && !isCurrentSessionAdmin()) {
    return {
      success: false,
      message: 'Từ chối: Chỉ tài khoản Admin mới có quyền đẩy toàn bộ dữ liệu lên Cloud Firestore!',
    };
  }

  const { db, isReady } = getFirebaseFirestore();
  if (!isReady || !db) {
    return {
      success: false,
      message: 'Chưa cấu hình Firebase hoặc chưa sẵn sàng kết nối.',
    };
  }

  try {
    // 1. Upload Sites
    for (const site of sites) {
      const siteDocRef = doc(db, SITES_COLLECTION, site.id);
      await setDoc(siteDocRef, { ...site, updatedAt: serverTimestamp() }, { merge: true });
    }

    // 2. Upload Desks
    await saveDesksBatchToCloud(desks, true);

    // 3. Upload Users
    for (const u of users) {
      const userDocRef = doc(db, USERS_COLLECTION, u.username.toLowerCase());
      await setDoc(
        userDocRef,
        {
          username: u.username,
          password: u.password,
          role: u.role,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return {
      success: true,
      message: `Đã đồng bộ ${sites.length} site, ${desks.length} chỗ ngồi và ${users.length} tài khoản lên Cloud Firestore thành công!`,
    };
  } catch (error) {
    console.error('Lỗi upload full state to cloud:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi đẩy dữ liệu lên Cloud.',
    };
  }
}

/**
 * Kiểm tra kết nối nhanh đến Firebase với cấu hình thử nghiệm
 */
export async function testFirebaseConnection(
  config: FirebaseCustomConfig
): Promise<{ success: boolean; message: string }> {
  const tempAppName = `test-connection-${Date.now()}`;
  let tempApp = null;
  try {
    tempApp = initializeApp(config, tempAppName);
    const tempDb = getFirestore(tempApp);
    // Thử truy vấn 1 document nhỏ với timeout 6 giây
    const colRef = collection(tempDb, SITES_COLLECTION);
    const queryPromise = getDocs(colRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Hết thời gian chờ phản hồi từ Firebase sau 6 giây (Vui lòng kiểm tra lại cấu hình hoặc kết nối mạng)')), 6000)
    );

    await Promise.race([queryPromise, timeoutPromise]);
    return {
      success: true,
      message: 'Kết nối Firebase Firestore thành công! Database sẵn sàng hoạt động.',
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? `Lỗi kết nối: ${err.message}`
          : 'Không thể kết nối đến Firebase với cấu hình này.',
    };
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch (e) {
        console.warn(e);
      }
    }
  }
}
