import React, { useState, useEffect, useMemo } from 'react';
import { Department, Desk, InteractionMode, Site, User, UserRole } from './types';
import {
  DEFAULT_DEPTS,
  DEFAULT_DESKS,
  DEFAULT_SITES,
  DEFAULT_USERS,
  STORAGE_KEYS,
  SESSION_TIMEOUT_MS,
} from './constants';
import { Sidebar } from './components/Sidebar';
import { InteractiveMap } from './components/InteractiveMap';
import { SiteTabs } from './components/SiteTabs';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DeskModal } from './components/DeskModal';
import { ExportReportModal } from './components/ExportReportModal';
import { ChangeMapModal } from './components/ChangeMapModal';
import { ManageSiteDepartmentsModal } from './components/ManageSiteDepartmentsModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { compressImage } from './utils/imageCompressor';
import {
  subscribeToCloudDatabase,
  saveSiteToCloud,
  deleteSiteFromCloud,
  saveDeskToCloud,
  deleteDeskFromCloud,
  saveDesksBatchToCloud,
  saveUserToCloud,
  deleteUserFromCloud,
  saveSystemSettingsToCloud,
} from './services/cloudSync';
import {
  Building2,
  Users as UsersIcon,
  LogOut,
  ShieldCheck,
  UserCheck,
  Eye,
  KeyRound,
  Cloud,
  Menu,
  Search,
  LogIn,
  Clock,
  X,
} from 'lucide-react';

export default function App() {
  // 1. Auth session state (Mặc định là null, kiểm tra hạn 60 phút - KHÔNG BAO GIỜ hardcode admin)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      const loginTimeRaw = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
      if (saved && loginTimeRaw) {
        const loginTime = Number(loginTimeRaw);
        const elapsed = Date.now() - loginTime;
        // Kiểm tra xem phiên còn trong thời hạn 60 phút (SESSION_TIMEOUT_MS) không
        if (!isNaN(loginTime) && elapsed < SESSION_TIMEOUT_MS) {
          return JSON.parse(saved);
        }
      }
      // Hết hạn hoặc không có mốc thời gian hợp lệ -> dọn sạch bộ nhớ tạm
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
      sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    } catch (e) {
      console.error(e);
    }
    // Mặc định luôn là null (chưa đăng nhập / viewer)
    return null;
  });

  // Thông báo phiên làm việc hết hạn sau 1 tiếng (Toast / Banner)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  // Trạng thái mở modal đăng nhập
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Role permissions:
  // - Admin: Toàn quyền hệ thống & cấu hình Cloud/API
  // - Editor: Có quyền thêm, sửa, xóa, kéo thả bàn, sửa nhân sự, đổi ảnh sơ đồ, quản lý phòng ban, quản lý users
  // - Viewer: Read-only & xuất báo cáo
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  // 2. 100% REALTIME CLOUD DATABASE STATE (TUYỆT ĐỐI KHÔNG DÙNG LOCALSTORAGE)
  // Khi ứng dụng khởi chạy hoặc reload F5, dữ liệu được kéo trực tiếp từ Cloud Firestore về qua onSnapshot
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [sites, setSites] = useState<Site[]>(DEFAULT_SITES);
  const [activeSiteId, setActiveSiteId] = useState<string>(DEFAULT_SITES[0].id);
  const [desks, setDesks] = useState<Desk[]>(DEFAULT_DESKS);

  // Trạng thái bật/tắt hiển thị nhãn tên nhân viên trực tiếp trên sơ đồ
  const [showNamesOnMap, setShowNamesOnMap] = useState<boolean>(true);
  const handleToggleShowNames = () => setShowNamesOnMap((prev) => !prev);

  const currentSite = useMemo(() => {
    return (
      sites.find((s) => s.id === activeSiteId) ||
      sites[0] ||
      DEFAULT_SITES[0]
    );
  }, [sites, activeSiteId]);

  // Cấp độ 1: Kích thước Icon độc lập theo từng Site (Lưu trên site.pinSize của Cloud)
  const currentSitePinSize = currentSite.pinSize || 18;

  // Danh sách phòng ban độc lập của Site đang kích hoạt
  const currentSiteDepartments = useMemo(() => {
    return currentSite.departments && currentSite.departments.length > 0
      ? currentSite.departments
      : DEFAULT_DEPTS;
  }, [currentSite]);

  // Compute desk count per site
  const desksCountBySite = useMemo(() => {
    const counts: Record<string, number> = {};
    sites.forEach((s) => {
      counts[s.name] = 0;
    });
    desks.forEach((d) => {
      const siteName = d.site || DEFAULT_SITES[0].name;
      counts[siteName] = (counts[siteName] || 0) + 1;
    });
    return counts;
  }, [sites, desks]);

  // Filter desks belonging to currently active Site
  const currentSiteDesks = useMemo(() => {
    return desks.filter(
      (d) =>
        d.site === currentSite.name ||
        (!d.site && currentSite.id === DEFAULT_SITES[0].id)
    );
  }, [desks, currentSite]);

  // Kéo thanh trượt cỡ chữ ở Sidebar: Chỉ thay đổi Site hiện tại và lưu trực tiếp lên Cloud Realtime (2px - 32px)
  const handlePinSizeChange = (newSize: number) => {
    const clamped = Math.max(2, Math.min(32, newSize));
    const updatedSite: Site = { ...currentSite, pinSize: clamped };
    setSites((prev) =>
      prev.map((s) => (s.id === currentSite.id ? updatedSite : s))
    );
    if (canEdit) {
      saveSiteToCloud(updatedSite);
    }
  };

  // 3. UI Controls & Modes
  const [mode, setMode] = useState<InteractionMode>('cursor');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | 'all'>('all');
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [targetDeskToFocus, setTargetDeskToFocus] = useState<{
    desk: Desk;
    timestamp: number;
  } | null>(null);

  // Khi chuyển qua lại giữa các Site, tự động reset bộ lọc nếu phòng ban không có trong Site mới
  useEffect(() => {
    if (selectedDept !== 'all' && !currentSiteDepartments.includes(selectedDept)) {
      setSelectedDept('all');
    }
  }, [currentSiteDepartments, selectedDept]);

  // Modals state
  const [isDeskModalOpen, setIsDeskModalOpen] = useState(false);
  const [editingDesk, setEditingDesk] = useState<
    (Desk & { isNew?: boolean }) | null
  >(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isChangeMapModalOpen, setIsChangeMapModalOpen] = useState(false);
  const [isManageDeptsModalOpen, setIsManageDeptsModalOpen] = useState(false);
  const [isFirebaseConfigModalOpen, setIsFirebaseConfigModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pendingChangeImage, setPendingChangeImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    'connected' | 'syncing' | 'error' | 'offline'
  >('offline');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string>('');
  const [cloudReloadTrigger, setCloudReloadTrigger] = useState(0);

  // Realtime Cloud Firestore Synchronization Listener (onSnapshot)
  useEffect(() => {
    const unsubscribe = subscribeToCloudDatabase({
      onSitesUpdate: (cloudSites) => {
        if (cloudSites && cloudSites.length > 0) {
          setSites(cloudSites);
          setActiveSiteId((currentId) =>
            cloudSites.some((s) => s.id === currentId) ? currentId : cloudSites[0].id
          );
        }
      },
      onDesksUpdate: (cloudDesks) => {
        if (cloudDesks && cloudDesks.length > 0) {
          setDesks(cloudDesks);
        }
      },
      onUsersUpdate: (cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsers(cloudUsers);
        }
      },
      onSystemSettingsUpdate: (settings) => {
        if (settings.activeSiteId) {
          setActiveSiteId(settings.activeSiteId);
        }
      },
      onSyncStatusChange: (status, message) => {
        setCloudSyncStatus(status);
        if (message) setCloudSyncMessage(message);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [cloudReloadTrigger]);

  // Force cursor mode if viewer
  useEffect(() => {
    if (!canEdit && mode !== 'cursor') {
      setMode('cursor');
    }
  }, [canEdit, mode]);

  // Đóng toàn bộ các modal quản trị và chỉnh sửa
  const closeAllAdminModals = () => {
    setIsDeskModalOpen(false);
    setIsUserModalOpen(false);
    setIsChangePasswordModalOpen(false);
    setIsExportModalOpen(false);
    setIsChangeMapModalOpen(false);
    setIsManageDeptsModalOpen(false);
    setIsFirebaseConfigModalOpen(false);
    setIsMobileSidebarOpen(false);
    setPendingChangeImage(null);
    setSelectedDeskId(null);
  };

  // 🕒 BỘ ĐẾM THỜI GIAN TỰ ĐỘNG ĐĂNG XUẤT SAU 60 PHÚT (SESSION TIMEOUT 1 TIẾNG)
  useEffect(() => {
    // Nếu chưa đăng nhập thì không cần bộ đếm
    if (!currentUser) return;

    // Lấy thời điểm đăng nhập từ sessionStorage
    const loginTimeRaw = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
    const loginTime = loginTimeRaw ? Number(loginTimeRaw) : Date.now();
    const elapsed = Date.now() - loginTime;
    const remainingMs = Math.max(0, SESSION_TIMEOUT_MS - elapsed);

    // Hàm xử lý khi hết hạn phiên làm việc
    const handleSessionTimeout = () => {
      // 1. Xóa sạch session, token, thông tin user trong bộ nhớ tạm
      try {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
        sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
        sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      } catch (err) {
        console.error(err);
      }

      // 2. Đưa trạng thái phân quyền về mặc định (null / viewer)
      setCurrentUser(null);
      setMode('cursor');

      // 3. Tự động đóng các modal quản trị / chỉnh sửa đang mở
      closeAllAdminModals();

      // 4. Hiển thị thông báo nhỏ (Toast/Alert): "Phiên làm việc đã hết hạn sau 1 tiếng. Vui lòng đăng nhập lại."
      setSessionExpiredMessage('Phiên làm việc đã hết hạn sau 1 tiếng. Vui lòng đăng nhập lại.');
      setIsLoginModalOpen(true);
    };

    // Nếu thời gian đã vượt quá 60 phút, đăng xuất ngay lập tức
    if (remainingMs <= 0) {
      handleSessionTimeout();
      return;
    }

    // Thiết lập Timer tự động kích hoạt sau đúng khoảng thời gian còn lại đến 60 phút
    const timeoutTimer = setTimeout(() => {
      handleSessionTimeout();
    }, remainingMs);

    // Kiểm tra định kỳ mỗi 15 giây (bảo vệ trường hợp máy sleep hoặc chuyển tab background)
    const intervalTimer = setInterval(() => {
      const currentLoginTimeRaw = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
      if (currentLoginTimeRaw) {
        const timePassed = Date.now() - Number(currentLoginTimeRaw);
        if (timePassed >= SESSION_TIMEOUT_MS) {
          handleSessionTimeout();
        }
      }
    }, 15000);

    // Kiểm tra ngay khi người dùng kích hoạt lại tab trình duyệt
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const currentLoginTimeRaw = sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIME);
        if (currentLoginTimeRaw) {
          const timePassed = Date.now() - Number(currentLoginTimeRaw);
          if (timePassed >= SESSION_TIMEOUT_MS) {
            handleSessionTimeout();
          }
        }
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Cập nhật lastActivityTime khi người dùng thao tác
    const handleUserActivity = () => {
      try {
        sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
      } catch {
        // ignore
      }
    };
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });

    // Dọn dẹp Timer trong useEffect cleanup để tránh rò rỉ bộ nhớ (memory leak)
    return () => {
      clearTimeout(timeoutTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [currentUser]);

  // Login & Logout
  const handleLogin = (user: User) => {
    const now = Date.now();
    setCurrentUser(user);
    setSessionExpiredMessage(null);
    setIsLoginModalOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
      sessionStorage.setItem(STORAGE_KEYS.LOGIN_TIME, String(now));
      sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(now));
    } catch (e) {
      console.error(e);
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser: User = { username: 'Khách (Viewer)', role: 'viewer' };
    const now = Date.now();
    setCurrentUser(guestUser);
    setSessionExpiredMessage(null);
    setIsLoginModalOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(guestUser));
      sessionStorage.setItem(STORAGE_KEYS.LOGIN_TIME, String(now));
      sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(now));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setMode('cursor');
    closeAllAdminModals();
    try {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
      sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    } catch (e) {
      console.error(e);
    }
    setSessionExpiredMessage(null);
    setIsLoginModalOpen(true);
  };

  // Site Management Handlers (Chỉ Admin có quyền)
  const handleAddSite = async (siteName: string, mapImage: string) => {
    // 🔒 Bảo vệ tầng logic: Chỉ Admin mới có quyền tạo Site mới
    if (currentUser?.role !== 'admin') {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }

    let optimizedImage = mapImage;
    if (mapImage && mapImage.startsWith('data:image')) {
      try {
        optimizedImage = await compressImage(mapImage);
      } catch (err) {
        console.warn('Lỗi nén ảnh site mới:', err);
      }
    }

    const newSite: Site = {
      id: `site-${Date.now()}`,
      name: siteName,
      mapImage: optimizedImage || 'Rohto New Layout - June 2026.png',
      departments: [...DEFAULT_DEPTS],
    };
    setSites((prev) => [...prev, newSite]);
    setActiveSiteId(newSite.id);
    // Push lên Cloud
    saveSiteToCloud(newSite);
  };

  const handleRenameSite = (siteId: string, newName: string) => {
    // 🔒 Bảo vệ tầng logic: Chỉ Admin mới có quyền đổi tên Site
    if (currentUser?.role !== 'admin') {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }

    const targetSite = sites.find((s) => s.id === siteId);
    if (!targetSite) return;
    const oldName = targetSite.name;

    const updatedSites = sites.map((s) => (s.id === siteId ? { ...s, name: newName } : s));
    setSites(updatedSites);

    // Update desks having old site name
    const updatedDesks = desks.map((d) => (d.site === oldName ? { ...d, site: newName } : d));
    setDesks(updatedDesks);

    // Push lên Cloud
    const updatedSiteObj = { ...targetSite, name: newName };
    saveSiteToCloud(updatedSiteObj);
    saveDesksBatchToCloud(updatedDesks);
  };

  const handleDeleteSite = (siteId: string) => {
    // 🔒 Bảo vệ tầng logic: Chỉ Admin mới có quyền xóa Site
    if (currentUser?.role !== 'admin') {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }

    if (sites.length <= 1) {
      alert('Không thể xóa Site duy nhất còn lại!');
      return;
    }
    const siteToDelete = sites.find((s) => s.id === siteId);
    const newSites = sites.filter((s) => s.id !== siteId);
    setSites(newSites);
    if (activeSiteId === siteId) {
      setActiveSiteId(newSites[0].id);
    }
    if (siteToDelete) {
      setDesks((prev) => prev.filter((d) => d.site !== siteToDelete.name));
      // Delete on cloud
      deleteSiteFromCloud(siteId, siteToDelete.name);
    }
  };

  // Site-specific Department Handlers (Admin & Editor)
  const handleAddDepartmentToSite = (siteId: string, deptName: string) => {
    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền thêm phòng ban
    if (!canEdit) {
      return { success: false, message: 'Bạn cần quyền Admin hoặc Editor để thêm phòng ban lên hệ thống Cloud!' };
    }
    const targetSite = sites.find((s) => s.id === siteId);
    if (!targetSite) {
      return { success: false, message: 'Không tìm thấy Site!' };
    }

    const currentDepts = targetSite.departments || DEFAULT_DEPTS;
    if (
      currentDepts.some(
        (d) => d.toLowerCase() === deptName.trim().toLowerCase()
      )
    ) {
      return {
        success: false,
        message: `Phòng ban "${deptName}" đã tồn tại trong Site này!`,
      };
    }

    const newDepts = [...currentDepts, deptName.trim()];
    const updatedSite = { ...targetSite, departments: newDepts };
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? updatedSite : s))
    );

    // Push lên Cloud
    saveSiteToCloud(updatedSite);

    return {
      success: true,
      message: `Đã thêm phòng ban "${deptName.trim()}" vào Site "${targetSite.name}" thành công!`,
    };
  };

  const handleDeleteDepartmentFromSite = (siteId: string, deptName: string) => {
    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền xóa phòng ban
    if (!canEdit) {
      return { success: false, message: 'Bạn cần quyền Admin hoặc Editor để xóa phòng ban trên hệ thống Cloud!' };
    }
    const targetSite = sites.find((s) => s.id === siteId);
    if (!targetSite) {
      return { success: false, message: 'Không tìm thấy Site!' };
    }

    const currentDepts = targetSite.departments || DEFAULT_DEPTS;
    if (currentDepts.length <= 1) {
      return {
        success: false,
        message: 'Không thể xóa! Mỗi Site cần duy trì tối thiểu 1 phòng ban.',
      };
    }

    const fallbackDept =
      currentDepts.find((d) => d !== deptName) || 'Sale';
    const newDepts = currentDepts.filter((d) => d !== deptName);

    const updatedSite = { ...targetSite, departments: newDepts };
    // Cập nhật danh sách phòng ban của Site
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? updatedSite : s))
    );

    // Tự động chuyển các bàn thuộc phòng ban bị xóa sang phòng ban dự phòng
    const updatedDesks = desks.map((d) =>
      d.site === targetSite.name && d.dept === deptName
        ? { ...d, dept: fallbackDept }
        : d
    );
    setDesks(updatedDesks);

    if (selectedDept === deptName) {
      setSelectedDept('all');
    }

    // Push lên Cloud
    saveSiteToCloud(updatedSite);
    saveDesksBatchToCloud(updatedDesks);

    return {
      success: true,
      message: `Đã xóa phòng ban "${deptName}". Các chỗ ngồi liên quan đã được chuyển sang "${fallbackDept}".`,
    };
  };

  // Quy trình xác nhận 2 bước đổi ảnh sơ đồ (Chỉ Admin):
  // Bước 1: Đọc ảnh và mở Modal Bước 1 (Preview)
  const handleInitiateChangeSiteBgImage = (file: File) => {
    // 🔒 Bảo vệ tầng logic: Chỉ Admin mới có quyền đổi ảnh mặt bằng site
    if (currentUser?.role !== 'admin') {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPendingChangeImage({
        file,
        previewUrl: base64,
      });
      setIsChangeMapModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Bước 2: Nén ảnh và lưu vào Site + Cloud
  const handleConfirmChangeSiteBgImage = async (file: File, base64Url: string) => {
    // 🔒 Bảo vệ tầng logic: Chỉ Admin mới có quyền đổi ảnh mặt bằng site
    if (currentUser?.role !== 'admin') {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }

    let finalImageUrl = base64Url;
    try {
      finalImageUrl = await compressImage(file);
    } catch (err) {
      console.warn('Lỗi nén ảnh, sử dụng ảnh gốc:', err);
    }

    const updatedSite = { ...currentSite, mapImage: finalImageUrl };
    setSites((prev) =>
      prev.map((s) => (s.id === currentSite.id ? updatedSite : s))
    );

    // Push lên Cloud Firestore
    saveSiteToCloud(updatedSite);

    setIsChangeMapModalOpen(false);
    setPendingChangeImage(null);
  };

  // User management handlers (Admin & Editor)
  const handleAddUser = (newUser: User) => {
    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền thêm user
    if (!canEdit) return;

    setUsers((prev) => [...prev, newUser]);
    saveUserToCloud(newUser);
  };

  const handleDeleteUser = (username: string) => {
    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền xóa user
    if (!canEdit) return;

    setUsers((prev) => prev.filter((u) => u.username !== username));
    deleteUserFromCloud(username);
  };

  // Chỉnh sửa username của user khác
  const handleUpdateUsername = (oldUsername: string, newUsername: string) => {
    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền đổi username
    if (!canEdit) {
      return { success: false, message: 'Bạn không có quyền quản lý người dùng!' };
    }
    const cleanNew = newUsername.trim();
    if (!cleanNew) {
      return { success: false, message: 'Tên người dùng không được để trống!' };
    }
    if (
      users.some(
        (u) =>
          u.username.toLowerCase() === cleanNew.toLowerCase() &&
          u.username.toLowerCase() !== oldUsername.toLowerCase()
      )
    ) {
      return { success: false, message: `Tên người dùng "${cleanNew}" đã tồn tại trên hệ thống!` };
    }

    const targetUser = users.find((u) => u.username === oldUsername);
    if (!targetUser) return { success: false, message: 'Không tìm thấy người dùng' };

    const updatedUser = { ...targetUser, username: cleanNew };
    setUsers((prev) =>
      prev.map((u) => (u.username === oldUsername ? updatedUser : u))
    );

    // Sync cloud: xóa doc cũ, lưu doc mới
    deleteUserFromCloud(oldUsername);
    saveUserToCloud(updatedUser);

    return {
      success: true,
      message: `Đã đổi tên đăng nhập "${oldUsername}" thành "${cleanNew}" thành công!`,
    };
  };

  // Reset mật khẩu cho user khác (Admin & Editor)
  const handleAdminResetPassword = (username: string, newPass: string) => {
    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền đặt lại mật khẩu user
    if (!canEdit) {
      return { success: false, message: 'Bạn không có quyền quản lý người dùng!' };
    }
    if (!newPass.trim()) {
      return { success: false, message: 'Mật khẩu mới không được để trống!' };
    }

    const targetUser = users.find((u) => u.username === username);
    if (!targetUser) return { success: false, message: 'Không tìm thấy người dùng!' };

    const updatedUser = { ...targetUser, password: newPass.trim() };
    setUsers((prev) =>
      prev.map((u) => (u.username === username ? updatedUser : u))
    );

    saveUserToCloud(updatedUser);

    return {
      success: true,
      message: `Đã reset mật khẩu cho tài khoản "${username}" thành công!`,
    };
  };

  // Admin phân quyền role cho user khác (Chỉ Admin)
  const handleUpdateUserRole = (username: string, newRole: UserRole) => {
    // 🔒 CHỈ DUY NHẤT ADMIN MỚI ĐƯỢC PHÂN QUYỀN ROLE
    if (!isAdmin) return;
    const targetUser = users.find((u) => u.username === username);
    if (!targetUser) return;

    const updatedUser = { ...targetUser, role: newRole };
    setUsers((prev) =>
      prev.map((u) => (u.username === username ? updatedUser : u))
    );

    saveUserToCloud(updatedUser);
  };

  // Bất kỳ User nào đã đăng nhập tự đổi mật khẩu cá nhân
  const handleChangePersonalPassword = (oldPassword: string, newPassword: string) => {
    if (!currentUser) {
      return { success: false, message: 'Bạn chưa đăng nhập vào hệ thống!' };
    }

    const matchedUser = users.find(
      (u) => u.username.toLowerCase() === currentUser.username.toLowerCase()
    );

    if (!matchedUser) {
      return { success: false, message: 'Không tìm thấy thông tin tài khoản người dùng!' };
    }

    if (matchedUser.password !== oldPassword) {
      return {
        success: false,
        message: 'Mật khẩu cũ không chính xác. Vui lòng thử lại!',
      };
    }

    const updatedUser: User = { ...matchedUser, password: newPassword };
    setUsers((prev) =>
      prev.map((u) =>
        u.username.toLowerCase() === currentUser.username.toLowerCase()
          ? updatedUser
          : u
      )
    );

    setCurrentUser({ ...currentUser, password: newPassword });
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ ...currentUser, password: newPassword }));
    } catch (e) {
      console.error(e);
    }

    // 🔒 Tự động cập nhật mật khẩu mới lên Cloud Realtime
    saveUserToCloud(updatedUser);

    return {
      success: true,
      message: 'Đổi mật khẩu cá nhân thành công!',
    };
  };

  // Desk handlers
  const handleSelectDesk = (desk: Desk | null) => {
    if (!desk || !desk.id) {
      setSelectedDeskId(null);
    } else {
      setSelectedDeskId(desk.id);
    }
  };

  const handleDeselectDesk = () => {
    setSelectedDeskId(null);
  };

  // Logic Click vào nút công cụ "Con trỏ" (Cursor Tool Button):
  // Khi người dùng đang ở chế độ Con trỏ (`mode === 'cursor'`) VÀ đang có một nhân viên/bàn được chọn (`selectedDeskId !== null`):
  // Bấm lại nút Con trỏ: Giữ nguyên chế độ cursor, đồng thời hủy chọn bàn (selectedDeskId = null)
  // Khi chưa chọn bàn nào: Bấm nút Con trỏ chỉ chuyển chế độ sang mode = 'cursor'
  const handleCursorModeClick = () => {
    if (mode === 'cursor' && selectedDeskId) {
      setSelectedDeskId(null); // Hủy chọn bàn nếu đang chọn
    } else {
      setMode('cursor');
    }
  };

  const handleSelectDeskFromSidebar = (desk: Desk) => {
    setSelectedDeskId(desk.id);
    setTargetDeskToFocus({ desk, timestamp: Date.now() });
  };

  const handleOpenDeskModal = (desk: Desk) => {
    setSelectedDeskId(desk.id);
    setEditingDesk(desk);
    setIsDeskModalOpen(true);
  };

  const handleDoubleClickDesk = (desk: Desk) => {
    setSelectedDeskId(desk.id);
    setEditingDesk(desk);
    setIsDeskModalOpen(true);
  };

  const handleAddDeskAt = (x: number, y: number) => {
    const nextNum = currentSiteDesks.length + 1;
    const defaultDept =
      selectedDept !== 'all' ? selectedDept : currentSiteDepartments[0] || 'Sale';
    const defaultPrefix =
      defaultDept ? defaultDept.substring(0, 3).toUpperCase() : 'DESK';
    const newDesk: Desk & { isNew?: boolean } = {
      id: `${defaultPrefix}-${String(nextNum).padStart(2, '0')}`,
      name: '',
      dept: defaultDept,
      empCode: '',
      title: '',
      site: currentSite.name,
      x,
      y,
      isNew: true,
    };
    setSelectedDeskId(newDesk.id);
    setEditingDesk(newDesk);
    setIsDeskModalOpen(true);
  };

  const handleSaveDesk = (savedDesk: Desk, isNew?: boolean) => {
    if (isNew) {
      const exists = desks.some(
        (d) =>
          d.id.toLowerCase() === savedDesk.id.toLowerCase() &&
          d.site === savedDesk.site
      );
      if (exists) {
        alert(
          `Mã bàn "${savedDesk.id}" đã tồn tại trong Site "${savedDesk.site}"! Vui lòng chọn mã khác.`
        );
        return;
      }
      setDesks((prev) => [...prev, savedDesk]);
    } else {
      setDesks((prev) =>
        prev.map((d) => (d.id === editingDesk?.id ? savedDesk : d))
      );
    }

    setIsDeskModalOpen(false);
    setEditingDesk(null);
    if (mode === 'add') {
      setMode('cursor');
    }

    // 🔒 Tự động lưu Realtime lên Cloud: Cả Admin và Editor đều có quyền thêm/sửa bàn và đổi thông tin nhân viên
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') return;

    // Push lên Cloud Firestore (Auto-save)
    saveDeskToCloud(savedDesk);
  };

  const handleDeleteDesk = (deskId: string) => {
    setDesks((prev) => prev.filter((d) => d.id !== deskId));
    setIsDeskModalOpen(false);
    setEditingDesk(null);
    setSelectedDeskId(null);

    // 🔒 Tự động xóa Realtime trên Cloud: Cả Admin và Editor đều có quyền xóa bàn
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') return;

    // Push lên Cloud Firestore
    deleteDeskFromCloud(deskId, currentSite.name);
  };

  const handleMoveDesk = (deskId: string, x: number, y: number) => {
    // Cập nhật vị trí cục bộ mượt mà 60fps
    setDesks((prev) =>
      prev.map((d) => (d.id === deskId ? { ...d, x, y } : d))
    );
  };

  const handleMoveDeskEnd = (deskId: string, x: number, y: number) => {
    // 🔒 Tự động lưu vị trí Realtime lên Cloud: Cả Admin và Editor đều có quyền kéo thả di chuyển bàn
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') return;

    const targetDesk = desks.find((d) => d.id === deskId);
    if (targetDesk) {
      const updated = { ...targetDesk, x, y };
      saveDeskToCloud(updated);
    }
  };

  // 🔄 Xoay nhanh 360 độ trực tiếp từ Floating Quick Bar trên sơ đồ (Admin & Editor)
  // Cập nhật giao diện lập tức 60fps và tự động lưu thẳng lên Cloud Realtime
  const handleQuickRotateDesk = (deskId: string, newRotation: number) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') return;
    const normalizedRotation = ((newRotation % 360) + 360) % 360;
    let updatedDesk: Desk | null = null;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.id === deskId) {
          updatedDesk = { ...d, rotation: normalizedRotation };
          return updatedDesk;
        }
        return d;
      })
    );
    if (updatedDesk) {
      saveDeskToCloud(updatedDesk);
    }
  };

  // 🔤 Chỉnh cỡ chữ độc lập 100% cho từng bàn đang được click chọn (Admin & Editor)
  // Cập nhật giao diện lập tức và tự động lưu thẳng lên Cloud Realtime (2px - 32px)
  const handleDeskFontSizeChange = (deskId: string, newSize: number) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') return;
    const clampedSize = Math.max(2, Math.min(32, Math.round(newSize)));
    let updatedDesk: Desk | null = null;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.id === deskId) {
          updatedDesk = {
            ...d,
            fontSize: clampedSize,
            customSize: clampedSize,
          };
          return updatedDesk;
        }
        return d;
      })
    );
    if (updatedDesk) {
      saveDeskToCloud(updatedDesk);
    }
  };

  // Export JSON (Backup entire database)
  const handleExportJson = () => {
    const backupData = {
      sites,
      desks,
      exportedAt: new Date().toISOString(),
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `rohto_seating_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Backup (Admin only)
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 🔒 CHỈ DUY NHẤT ADMIN MỚI ĐƯỢC GHI LÊN CLOUD REALTIME
    if (currentUser?.role !== 'admin') {
      alert('Chỉ Admin mới có quyền phục hồi dữ liệu JSON lên hệ thống Cloud!');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.sites) && Array.isArray(parsed.desks)) {
          setSites(parsed.sites);
          setDesks(parsed.desks);
          if (parsed.sites.length > 0) {
            setActiveSiteId(parsed.sites[0].id);
          }
          // Batch upload imported state to Cloud
          saveDesksBatchToCloud(parsed.desks);
          for (const s of parsed.sites) {
            saveSiteToCloud(s);
          }
          alert('Khôi phục dữ liệu từ file backup thành công!');
        } else if (Array.isArray(parsed)) {
          setDesks(parsed);
          saveDesksBatchToCloud(parsed);
          alert('Đã cập nhật danh sách bàn thành công!');
        } else {
          alert('File JSON không đúng cấu trúc dự phòng của ứng dụng!');
        }
      } catch (err) {
        alert('Không thể đọc file JSON. Vui lòng kiểm tra lại định dạng tệp!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Search & Filter
  const filteredCurrentSiteDesks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return currentSiteDesks.filter((d) => {
      const matchDept = selectedDept === 'all' || d.dept === selectedDept;
      const matchQuery =
        !q ||
        d.id.toLowerCase().includes(q) ||
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.empCode && d.empCode.toLowerCase().includes(q)) ||
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.dept && d.dept.toLowerCase().includes(q)) ||
        (d.note && d.note.toLowerCase().includes(q));
      return matchDept && matchQuery;
    });
  }, [currentSiteDesks, searchQuery, selectedDept]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden text-slate-800 font-sans">
      {/* 1. Top Navigation Bar (Responsive on Mobile, Tablet & Desktop) */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-md z-30 gap-2">
        {/* App Title & Branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Mở menu tìm kiếm & danh sách bàn"
          >
            <Menu className="w-4 h-4 text-blue-400" />
          </button>

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-sm tracking-wider shrink-0">
            R
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
              <span className="truncate">Sơ Đồ Chỗ Ngồi Rohto</span>
              <span className="hidden sm:inline-block text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30 shrink-0">
                PRO 2026
              </span>
            </h1>
            <p className="hidden md:block text-[10.5px] text-slate-400 truncate">
              Quản lý vị trí nhân sự trực quan · Bản đồ Figma tương tác
            </p>
          </div>
        </div>

        {/* Center / Right: Cloud Status & User Session Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Cloud Sync Status Badge & Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsFirebaseConfigModalOpen(true)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : cloudSyncStatus === 'syncing'
                ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-600/60 text-amber-300 animate-pulse'
                : cloudSyncStatus === 'error'
                ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-600/60 text-rose-300'
                : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={
              isAdmin
                ? (cloudSyncStatus === 'connected'
                    ? 'Cloud Firestore: Đã kết nối Realtime thành công (Bấm để xem và quản lý cấu hình API)'
                    : 'Bấm để cấu hình kết nối Cloud Firestore')
                : (cloudSyncStatus === 'connected'
                    ? 'Cloud Firestore: Đã kết nối Realtime thành công (Dữ liệu tự động đồng bộ)'
                    : 'Cloud Firestore: Trạng thái kết nối Realtime')
            }
          >
            <Cloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden md:inline">
              {cloudSyncStatus === 'connected'
                ? '☁️ Đã lưu tự động'
                : cloudSyncStatus === 'syncing'
                ? '🔄 Đang đồng bộ...'
                : cloudSyncStatus === 'error'
                ? '⚠️ Lỗi kết nối Cloud'
                : '📡 Chế độ Offline'}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-amber-400 animate-ping'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-500'
              }`}
            />
          </button>

          {currentUser ? (
            <>
              {/* Role badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs">
                {currentUser.role === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : currentUser.role === 'editor' ? (
                  <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="text-slate-200 font-semibold truncate max-w-[80px] sm:max-w-[120px]">{currentUser.username}</span>
                <span className="hidden sm:inline text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  ({currentUser.role})
                </span>
              </div>

              {/* Nút Đổi mật khẩu cá nhân (Chỉ cho tài khoản thành viên) */}
              {currentUser.role !== 'viewer' && (
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Đổi mật khẩu tài khoản cá nhân"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden xl:inline">Đổi mật khẩu</span>
                </button>
              )}

              {/* Nút Đăng nhập cho quyền Viewer/Khách muốn nâng lên Admin/Editor */}
              {currentUser.role === 'viewer' && (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Đăng nhập tài khoản Quản trị / Biên tập"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              )}

              {/* Quản lý tài khoản (Admin & Editor) */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Quản trị người dùng & Phân quyền bảo mật"
                >
                  <UsersIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="hidden xl:inline">Quản trị</span>
                </button>
              )}

              {/* Đăng xuất */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 flex p-2 sm:p-3 gap-2 sm:gap-3 overflow-hidden relative">
        {/* Left Sidebar (Desktop Only: Permanent column) */}
        <div className="hidden lg:flex shrink-0 h-full max-h-full overflow-hidden">
          <Sidebar
            mode={mode}
            onModeChange={setMode}
            onCursorClick={handleCursorModeClick}
            onDeselectDesk={handleDeselectDesk}
            canEdit={canEdit}
            isAdmin={isAdmin}
            onFontSizeChange={handleDeskFontSizeChange}
            onRotateDesk={handleQuickRotateDesk}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDept={selectedDept}
            onDeptChange={setSelectedDept}
            siteDepartments={currentSiteDepartments}
            onOpenManageDeptsModal={() => setIsManageDeptsModalOpen(true)}
            desks={currentSiteDesks}
            filteredDesks={filteredCurrentSiteDesks}
            selectedDeskId={selectedDeskId}
            onSelectDesk={handleSelectDeskFromSidebar}
            onOpenDeskModal={handleOpenDeskModal}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onChangeBgImage={(e) => {
              const file = e.target.files?.[0];
              if (file) handleInitiateChangeSiteBgImage(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Mobile / Tablet Slide-over Drawer */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer Container */}
            <div
              onWheel={(e) => e.stopPropagation()}
              style={{ maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}
              className="relative z-10 w-[88vw] sm:w-85 max-w-sm h-full max-h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col overflow-y-auto overscroll-contain"
            >
              <Sidebar
                mode={mode}
                onModeChange={(m) => {
                  setMode(m);
                  if (m !== 'cursor') setIsMobileSidebarOpen(false);
                }}
                onCursorClick={() => {
                  handleCursorModeClick();
                  if (mode === 'cursor' && selectedDeskId) {
                    setIsMobileSidebarOpen(false);
                  }
                }}
                onDeselectDesk={handleDeselectDesk}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onFontSizeChange={handleDeskFontSizeChange}
                onRotateDesk={handleQuickRotateDesk}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedDept={selectedDept}
                onDeptChange={setSelectedDept}
                siteDepartments={currentSiteDepartments}
                onOpenManageDeptsModal={() => {
                  setIsManageDeptsModalOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                desks={currentSiteDesks}
                filteredDesks={filteredCurrentSiteDesks}
                selectedDeskId={selectedDeskId}
                onSelectDesk={(desk) => {
                  handleSelectDeskFromSidebar(desk);
                  setIsMobileSidebarOpen(false);
                }}
                onOpenDeskModal={(desk) => {
                  handleOpenDeskModal(desk);
                  setIsMobileSidebarOpen(false);
                }}
                onOpenExportModal={() => {
                  setIsExportModalOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                onExportJson={handleExportJson}
                onImportJson={handleImportJson}
                onChangeBgImage={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleInitiateChangeSiteBgImage(file);
                  e.target.value = '';
                  setIsMobileSidebarOpen(false);
                }}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Floating Action Button for Mobile / Tablet to open Drawer */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden fixed bottom-4 left-3 z-30 shadow-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-full flex items-center gap-2 border border-blue-400/40 cursor-pointer animate-in fade-in duration-200"
        >
          <Search className="w-3.5 h-3.5 text-blue-200" />
          <span>Danh sách bàn</span>
          <span className="bg-blue-800/90 text-blue-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {currentSiteDesks.length}
          </span>
        </button>

        {/* Center / Right Section (SiteTabs + Figma-like Canvas) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {/* Multi-Site Navigation Tabs */}
          <SiteTabs
            sites={sites}
            activeSiteId={activeSiteId}
            onSelectSite={(id) => {
              setActiveSiteId(id);
              setSelectedDeskId(null);
            }}
            isAdmin={isAdmin}
            onAddSite={handleAddSite}
            onRenameSite={handleRenameSite}
            onDeleteSite={handleDeleteSite}
            desksCountBySite={desksCountBySite}
          />

          {/* Interactive Figma Canvas (Natural Resolution 1:1) */}
          <InteractiveMap
            desks={currentSiteDesks}
            mode={mode}
            canEdit={canEdit}
            searchQuery={searchQuery}
            selectedDept={selectedDept}
            selectedDeskId={selectedDeskId}
            targetDeskToFocus={targetDeskToFocus}
            onSelectDesk={handleSelectDesk}
            onDeselectDesk={handleDeselectDesk}
            onDoubleClickDesk={handleDoubleClickDesk}
            onAddDeskAt={handleAddDeskAt}
            onMoveDesk={handleMoveDesk}
            onMoveDeskEnd={handleMoveDeskEnd}
            onRotateDesk={handleQuickRotateDesk}
            onChangeDeskFontSize={handleDeskFontSizeChange}
            onOpenDeskModal={handleOpenDeskModal}
            customBgUrl={currentSite.mapImage}
            onUploadImage={handleInitiateChangeSiteBgImage}
          />
        </div>
      </main>

      {/* 3. Desk Details / Edit Modal */}
      <DeskModal
        isOpen={isDeskModalOpen}
        onClose={() => {
          setIsDeskModalOpen(false);
          setEditingDesk(null);
        }}
        desk={editingDesk}
        canEdit={canEdit}
        isAdmin={isAdmin}
        onSave={handleSaveDesk}
        onDelete={handleDeleteDesk}
        sites={sites}
        currentSiteName={currentSite.name}
        currentSitePinSize={currentSitePinSize}
      />

      {/* 4. User Management Modal (Admin only) */}
      {isAdmin && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          users={users}
          currentUsername={currentUser.username}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onUpdateUsername={handleUpdateUsername}
          onResetPassword={handleAdminResetPassword}
          onUpdateRole={handleUpdateUserRole}
          onOpenPersonalChangePassword={() => setIsChangePasswordModalOpen(true)}
        />
      )}

      {/* 4b. Personal Change Password Modal (For any logged in user) */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordModalOpen}
          onClose={() => setIsChangePasswordModalOpen(false)}
          currentUser={currentUser}
          onChangePassword={handleChangePersonalPassword}
        />
      )}

      {/* 5. Export Report Modal (Excel & CSV) */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentSite={currentSite}
        allSites={sites}
        allDesks={desks}
      />

      {/* 6. Modal Cảnh Báo Đổi Ảnh Sơ Đồ 2 Bước (Double Confirmation - Chỉ Admin) */}
      {isAdmin && (
        <ChangeMapModal
          isOpen={isChangeMapModalOpen}
          onClose={() => {
            setIsChangeMapModalOpen(false);
            setPendingChangeImage(null);
          }}
          pendingImage={pendingChangeImage}
          currentSiteName={currentSite.name}
          onConfirmChange={handleConfirmChangeSiteBgImage}
        />
      )}

      {/* 7. Modal Quản Lý Phòng Ban Của Site (Admin only) */}
      {isAdmin && (
        <ManageSiteDepartmentsModal
          isOpen={isManageDeptsModalOpen}
          onClose={() => setIsManageDeptsModalOpen(false)}
          currentSite={currentSite}
          siteDesks={currentSiteDesks}
          onAddDepartment={handleAddDepartmentToSite}
          onDeleteDepartment={handleDeleteDepartmentFromSite}
        />
      )}

      {/* 8. Modal Cấu Hình & Quản Lý Cloud Firestore (Firebase) */}
      <FirebaseConfigModal
        isOpen={isFirebaseConfigModalOpen}
        onClose={() => setIsFirebaseConfigModalOpen(false)}
        syncStatus={cloudSyncStatus}
        syncMessage={cloudSyncMessage}
        sites={sites}
        desks={desks}
        users={users}
        isAdmin={isAdmin}
        onConfigSaved={() => setCloudReloadTrigger((prev) => prev + 1)}
      />

      {/* 9. Toast thông báo hết hạn phiên làm việc sau 1 tiếng (Auto Logout Toast) */}
      {sessionExpiredMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] max-w-md w-[92vw] sm:w-auto bg-amber-950/95 text-amber-100 border border-amber-500/80 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div className="text-xs font-semibold leading-snug">
              {sessionExpiredMessage}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSessionExpiredMessage(null)}
            className="p-1 rounded-lg hover:bg-amber-800/60 text-amber-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 10. Màn hình / Modal Đăng nhập (Hiện khi chưa đăng nhập, hoặc bấm nút Đăng nhập, hoặc hết hạn phiên) */}
      {(!currentUser || isLoginModalOpen) && (
        <LoginModal
          users={users}
          onLogin={handleLogin}
          onContinueAsGuest={handleContinueAsGuest}
          expiredMessage={sessionExpiredMessage}
          canClose={Boolean(currentUser)}
          onClose={() => {
            setIsLoginModalOpen(false);
            setSessionExpiredMessage(null);
          }}
        />
      )}
    </div>
  );
}
