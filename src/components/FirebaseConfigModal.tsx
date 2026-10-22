import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  UploadCloud,
  Key,
  HelpCircle,
  Copy,
  Trash2,
  Sparkles,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  FirebaseCustomConfig,
  getActiveFirebaseConfig,
  setActiveFirebaseConfig,
  DEFAULT_HARDCODED_CONFIG,
  resetFirebaseInstance,
} from '../firebaseConfig';
import {
  testFirebaseConnection,
  uploadFullStateToCloud,
  saveCloudApiConfigToCloud,
} from '../services/cloudSync';
import { Desk, Site, User } from '../types';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: 'connected' | 'syncing' | 'error' | 'offline';
  syncMessage?: string;
  sites: Site[];
  desks: Desk[];
  users: User[];
  isAdmin?: boolean;
  onConfigSaved: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  syncMessage,
  sites,
  desks,
  users,
  isAdmin = false,
  onConfigSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');

  const currentConfig = getActiveFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentConfig.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig.appId || '');

  const [rawJsonInput, setRawJsonInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncActionResult, setSyncActionResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  // Tự động phân tích đoạn mã JavaScript / JSON từ Firebase Console
  const handleParseRawSnippet = (text: string) => {
    setRawJsonInput(text);
    if (!text.trim()) return;

    try {
      // Tìm các cặp key-value thường thấy trong firebaseConfig
      const findVal = (key: string) => {
        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
        const match = text.match(regex);
        return match ? match[1] : '';
      };

      const extractedApiKey = findVal('apiKey');
      const extractedProjectId = findVal('projectId');
      const extractedAuthDomain = findVal('authDomain');
      const extractedStorageBucket = findVal('storageBucket');
      const extractedSenderId = findVal('messagingSenderId');
      const extractedAppId = findVal('appId');

      if (extractedApiKey) setApiKey(extractedApiKey);
      if (extractedProjectId) setProjectId(extractedProjectId);
      if (extractedAuthDomain) setAuthDomain(extractedAuthDomain);
      if (extractedStorageBucket) setStorageBucket(extractedStorageBucket);
      if (extractedSenderId) setMessagingSenderId(extractedSenderId);
      if (extractedAppId) setAppId(extractedAppId);

      if (extractedApiKey && extractedProjectId) {
        setTestResult({
          success: true,
          message: 'Đã trích xuất thông số thành công từ mã cấu hình!',
        });
      }
    } catch (e) {
      console.warn('Lỗi parse firebase config snippet:', e);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const configToTest: FirebaseCustomConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    if (!configToTest.apiKey || !configToTest.projectId) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập tối thiểu apiKey và projectId!',
      });
      setIsTesting(false);
      return;
    }

    const res = await testFirebaseConnection(configToTest);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSaveConfig = async () => {
    if (!isAdmin) {
      alert('Từ chối: Bạn không có quyền Admin để chỉnh sửa cấu hình API Cloud!');
      return;
    }

    const cleanConfig: FirebaseCustomConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    try {
      setActiveFirebaseConfig(cleanConfig);
      await saveCloudApiConfigToCloud(cleanConfig);
      await resetFirebaseInstance();
      onConfigSaved();
      setTestResult({
        success: true,
        message: 'Đã lưu cấu hình Cloud trực tiếp lên hệ thống! Đang đồng bộ Realtime.',
      });
    } catch (e) {
      console.error(e);
      setTestResult({
        success: false,
        message: 'Lỗi khi lưu cấu hình Cloud lên hệ thống!',
      });
    }
  };

  const handleResetToProjectDefault = async () => {
    if (!isAdmin) {
      alert('Từ chối: Bạn không có quyền Admin để khôi phục cấu hình API Cloud!');
      return;
    }

    setApiKey(DEFAULT_HARDCODED_CONFIG.apiKey);
    setProjectId(DEFAULT_HARDCODED_CONFIG.projectId);
    setAuthDomain(DEFAULT_HARDCODED_CONFIG.authDomain || '');
    setStorageBucket(DEFAULT_HARDCODED_CONFIG.storageBucket || '');
    setMessagingSenderId(DEFAULT_HARDCODED_CONFIG.messagingSenderId || '');
    setAppId(DEFAULT_HARDCODED_CONFIG.appId || '');

    setActiveFirebaseConfig(DEFAULT_HARDCODED_CONFIG);
    await saveCloudApiConfigToCloud(DEFAULT_HARDCODED_CONFIG);
    await resetFirebaseInstance();
    onConfigSaved();
    setTestResult({
      success: true,
      message: 'Đã khôi phục cấu hình dự án Firebase mặc định (rohto-office-map)!',
    });
  };

  const handleClearConfig = async () => {
    if (!isAdmin) {
      alert('Từ chối: Bạn không có quyền Admin để xóa cấu hình API Cloud!');
      return;
    }

    if (confirm('Bạn có chắc muốn đặt lại cấu hình kết nối Cloud về mặc định?')) {
      setActiveFirebaseConfig(DEFAULT_HARDCODED_CONFIG);
      await resetFirebaseInstance();
      setApiKey(DEFAULT_HARDCODED_CONFIG.apiKey);
      setProjectId(DEFAULT_HARDCODED_CONFIG.projectId);
      setAuthDomain(DEFAULT_HARDCODED_CONFIG.authDomain || '');
      setStorageBucket(DEFAULT_HARDCODED_CONFIG.storageBucket || '');
      setMessagingSenderId(DEFAULT_HARDCODED_CONFIG.messagingSenderId || '');
      setAppId(DEFAULT_HARDCODED_CONFIG.appId || '');
      setRawJsonInput('');
      setTestResult({
        success: true,
        message: 'Đã đặt lại cấu hình Cloud về dự án mặc định.',
      });
      onConfigSaved();
    }
  };

  const handleSyncAllToCloudNow = async () => {
    if (!isAdmin) {
      alert('Từ chối: Bạn không có quyền Admin để đồng bộ dữ liệu lên Cloud!');
      return;
    }

    setIsSyncingAll(true);
    setSyncActionResult(null);
    const res = await uploadFullStateToCloud(sites, desks, users);
    setSyncActionResult(res);
    setIsSyncingAll(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-[95vw] sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Đồng Bộ Cloud Firestore (Firebase)</h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : syncStatus === 'syncing'
                      ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
                      : syncStatus === 'error'
                      ? 'bg-rose-950 text-rose-300 border-rose-600'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {syncStatus === 'connected' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>ĐÃ KẾT NỐI REALTIME (Online)</span>
                    </>
                  ) : syncStatus === 'syncing' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping"></span>
                      <span>Đang kiểm tra kết nối...</span>
                    </>
                  ) : syncStatus === 'error' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
                      <span>Lỗi kết nối Cloud</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
                      <span>Chế độ Cục bộ (Offline)</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Lưu trữ sơ đồ, danh sách bàn và tài khoản trên máy chủ đám mây dùng chung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        {isAdmin ? (
          <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 pt-2 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'config'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Cấu hình API Key</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Hướng dẫn lấy API Key</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 sm:px-6 py-2.5 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Thông tin Kết nối & Đồng bộ Cloud Realtime</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Cấu hình API được khóa (Chỉ Admin)
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!isAdmin ? (
            <div className="space-y-4">
              {/* Security Protection Notice */}
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl text-slate-200 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Bảo mật Cấu hình Cloud Database</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Thông tin cấu hình API Key và các thông số kết nối cơ sở dữ liệu đám mây (Firebase Firestore) đã được bảo vệ an toàn.
                  <b> Tuyệt đối chỉ có tài khoản Quản trị viên (Admin) mới có quyền truy cập, chỉnh sửa hoặc can thiệp vào cấu hình kết nối API của hệ thống.</b>
                </p>
                <div className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-lg p-2.5 flex items-center gap-2 mt-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Hệ thống tự động đồng bộ thời gian thực (Realtime onSnapshot) đang hoạt động bình thường trên màn hình của bạn.
                  </span>
                </div>
              </div>

              {/* Status banner */}
              {syncMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : syncStatus === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {syncStatus === 'connected' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">{syncMessage}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {syncStatus === 'connected'
                          ? 'Dữ liệu được tự động cập nhật ngay lập tức giữa tất cả người dùng (Auto-save Realtime).'
                          : 'Đang theo dõi trạng thái kết nối Cloud...'}
                      </div>
                    </div>
                  </div>
                  {syncStatus === 'connected' && (
                    <span className="font-mono text-[10px] bg-emerald-200/80 text-emerald-900 px-2.5 py-1 rounded-full font-bold">
                      🟢 Realtime Live
                    </span>
                  )}
                </div>
              )}

              {/* System Info Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Dự án Cloud
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm">
                    {projectId || 'rohto-office-map'}
                  </div>
                  <div className="text-[11px] text-slate-500">Google Cloud Firestore</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Dữ liệu đang kết nối
                  </span>
                  <div className="font-bold text-blue-700 text-sm">
                    {sites.length} Site · {desks.length} Chỗ ngồi
                  </div>
                  <div className="text-[11px] text-slate-500">Tự động đồng bộ 2 chiều</div>
                </div>
              </div>

              {/* Close button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : activeTab === 'config' ? (
            <div className="space-y-4">

              {/* Status banner */}
              {syncMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : syncStatus === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {syncStatus === 'connected' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>{syncMessage}</span>
                  </div>
                  {syncStatus === 'connected' && (
                    <span className="font-mono text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded font-bold">
                      Realtime active
                    </span>
                  )}
                </div>
              )}

              {/* Quick paste box (Admin only) */}
              {isAdmin && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Dán nhanh đoạn mã `firebaseConfig = &#123; ... &#125;` từ Firebase Console:
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Tự động nhận diện</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rawJsonInput}
                    onChange={(e) => handleParseRawSnippet(e.target.value)}
                    placeholder="Dán đoạn { apiKey: 'AIzaSy...', projectId: 'rohto-...' } vào đây..."
                    className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Explicit fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Project ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="rohto-office-map"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Auth Domain (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    placeholder="rohto-office.firebaseapp.com"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Storage Bucket (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={storageBucket}
                    onChange={(e) => setStorageBucket(e.target.value)}
                    placeholder="rohto-office.appspot.com"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Test result display */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Sync Action Result */}
              {syncActionResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    syncActionResult.success
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {syncActionResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{syncActionResult.message}</span>
                </div>
              )}

              {/* Actions Button Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Kiểm tra kết nối</span>
                  </button>

                  {isAdmin && apiKey && (
                    <button
                      type="button"
                      onClick={handleClearConfig}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Xóa cấu hình và chuyển về chế độ offline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa tùy chỉnh</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleResetToProjectDefault}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Khôi phục cấu hình dự án gốc rohto-office-map"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Dự án Chuẩn</span>
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Lưu Cấu Hình Cloud</span>
                    </button>
                  </div>
                )}
              </div>

              {/* One-click Full Push Section (Admin only) */}
              {isAdmin && (
                <div className="mt-4 p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      <span>Đẩy toàn bộ dữ liệu máy hiện tại lên Cloud</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Bao gồm {sites.length} site, {desks.length} chỗ ngồi, {users.length} tài khoản
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncAllToCloudNow}
                    disabled={isSyncingAll}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isSyncingAll ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>Đẩy Lên Ngay</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ================= TAB 2: HƯỚNG DẪN CHI TIẾT (VIETNAMESE GUIDE) ================= */
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <span className="font-bold block mb-1">
                  💡 Firebase Firestore là giải pháp máy chủ Cloud miễn phí của Google:
                </span>
                <span>
                  Chỉ cần 2 phút tạo dự án là toàn bộ người dùng truy cập web ở bất kỳ đâu đều thấy cùng 1 sơ đồ thời gian thực.
                </span>
              </div>

              <div className="space-y-3 font-normal">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Truy cập trang quản trị Google Firebase
                  </div>
                  <p className="pl-7 text-slate-600">
                    Truy cập{' '}
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline font-semibold inline-flex items-center gap-1"
                    >
                      console.firebase.google.com <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    và đăng nhập bằng tài khoản Gmail của bạn (hoàn toàn miễn phí).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Tạo Dự Án Mới (Create Project)
                  </div>
                  <p className="pl-7 text-slate-600">
                    Bấm <b>"Add project"</b> &gt; Đặt tên cho dự án (ví dụ: <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-800">rohto-office-map</code>) &gt; Bấm Tiếp tục cho đến khi hoàn tất tạo.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Kích hoạt Firestore Database
                  </div>
                  <p className="pl-7 text-slate-600">
                    Ở thanh menu bên trái, chọn <b>Build</b> &gt; <b>Firestore Database</b> &gt; Bấm <b>Create database</b>.
                    <br />
                    Khi được hỏi về Security Rules, chọn <b>"Start in test mode"</b> (để các máy tính có thể đọc/ghi dữ liệu sơ đồ) &gt; Bấm <b>Create</b>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                    Lấy mã kết nối Web App
                  </div>
                  <p className="pl-7 text-slate-600">
                    Bấm vào biểu tượng bánh răng ⚙️ <b>Project Settings</b> (góc trên bên trái) &gt; Kéo xuống mục <i>Your apps</i> &gt; Bấm vào biểu tượng <b>Web (&lt;/&gt;)</b> &gt; Đặt tên App &gt; Copy đoạn mã:
                  </p>
                  <pre className="ml-7 p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto">
{`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "rohto-map.firebaseapp.com",
  projectId: "rohto-map",
  storageBucket: "rohto-map.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};`}
                  </pre>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">5</span>
                    Dán vào ứng dụng
                  </div>
                  <p className="pl-7 text-slate-600">
                    Quay lại Tab <b>"Cấu hình API Key & Kết Nối"</b> ở trên, dán đoạn mã vừa copy vào ô dán nhanh hoặc điền các trường rồi bấm <b>"Lưu Cấu Hình Cloud"</b>.
                    <br />
                    (Hoặc bạn cũng có thể mở file <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-800">src/firebaseConfig.ts</code> trong mã nguồn và dán trực tiếp vào biến <code className="bg-slate-200 px-1 py-0.5 rounded">DEFAULT_HARDCODED_CONFIG</code>).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
