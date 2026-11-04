import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

/**
 * =========================================================================
 * 📌 HƯỚNG DẪN DÁN FIREBASE CONFIG (MIỄN PHÍ):
 * 
 * Cách 1: Dán trực tiếp thông tin dự án Firebase của bạn vào object bên dưới.
 * Cách 2: Thêm các biến môi trường vào file .env (VITE_FIREBASE_API_KEY, ...)
 * Cách 3: Bấm vào nút "☁️ Trạng thái Cloud" trên thanh Header của web để dán trực tiếp.
 * =========================================================================
 */
export const DEFAULT_HARDCODED_CONFIG: FirebaseCustomConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCZ38_r2tno1SMQ4vxV6rAvQZiHNHiMY48',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rohto-office-map.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rohto-office-map',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rohto-office-map.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '826596508944',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:826596508944:web:0a98206d7334b4c9349195',
};

// Active runtime configuration (defaulting to the project configuration)
let currentActiveConfig: FirebaseCustomConfig = { ...DEFAULT_HARDCODED_CONFIG };

/**
 * Lấy cấu hình Firebase đang hoạt động trực tiếp
 */
export function getActiveFirebaseConfig(): FirebaseCustomConfig {
  return currentActiveConfig;
}

/**
 * Cập nhật cấu hình Firebase đang hoạt động trong bộ nhớ ứng dụng
 */
export function setActiveFirebaseConfig(config: FirebaseCustomConfig): void {
  currentActiveConfig = { ...config };
}

/**
 * Kiểm tra xem cấu hình Firebase hiện tại có hợp lệ không (có apiKey và projectId không phải rỗng hoặc placeholder)
 */
export function isFirebaseConfigValid(config?: FirebaseCustomConfig): boolean {
  const c = config || getActiveFirebaseConfig();
  if (!c.apiKey || !c.projectId) return false;
  if (
    c.apiKey.includes('YOUR_') ||
    c.projectId.includes('YOUR_') ||
    c.apiKey.trim() === '' ||
    c.projectId.trim() === ''
  ) {
    return false;
  }
  return true;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

/**
 * Khởi tạo hoặc lấy instance Firebase Firestore hiện tại
 */
export function getFirebaseFirestore(): { app: FirebaseApp | null; db: Firestore | null; isReady: boolean } {
  const config = getActiveFirebaseConfig();

  if (!isFirebaseConfigValid(config)) {
    return { app: null, db: null, isReady: false };
  }

  try {
    if (!cachedApp) {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        const defaultApp = existingApps[0];
        // Kiểm tra xem app hiện tại có khớp projectId không
        if (defaultApp.options.projectId === config.projectId) {
          cachedApp = defaultApp;
        } else {
          // Khác config, dọn dẹp app cũ
          try {
            deleteApp(defaultApp);
          } catch (e) {
            console.warn('Lỗi dọn app cũ:', e);
          }
          cachedApp = initializeApp(config);
        }
      } else {
        cachedApp = initializeApp(config);
      }
    }

    if (!cachedDb && cachedApp) {
      cachedDb = getFirestore(cachedApp);
    }

    return { app: cachedApp, db: cachedDb, isReady: true };
  } catch (err) {
    console.error('Không thể khởi tạo Firebase:', err);
    return { app: null, db: null, isReady: false };
  }
}

/**
 * Reset Firebase connection khi người dùng cập nhật hoặc xóa cấu hình mới
 */
export async function resetFirebaseInstance(): Promise<void> {
  const apps = getApps();
  for (const app of apps) {
    try {
      await deleteApp(app);
    } catch (e) {
      console.warn('Lỗi khi xóa instance Firebase app:', e);
    }
  }
  cachedApp = null;
  cachedDb = null;
}
