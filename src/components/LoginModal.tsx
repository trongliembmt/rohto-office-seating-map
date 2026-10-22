import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  Lock,
  User as UserIcon,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Sparkles,
  Loader2,
  Clock,
  Eye,
  X,
} from 'lucide-react';

interface LoginModalProps {
  users: User[];
  onLogin: (user: User) => void;
  onContinueAsGuest?: () => void;
  expiredMessage?: string | null;
  onClose?: () => void;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  onLogin,
  onContinueAsGuest,
  expiredMessage,
  onClose,
  canClose,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Success popup state
  const [isSuccess, setIsSuccess] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const matched = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    if (matched) {
      setError(null);
      const userPayload: User = { username: matched.username, role: matched.role };
      setAuthenticatedUser(userPayload);
      setIsSuccess(true);

      // Sau 1.2s tự động chuyển vào màn hình sơ đồ chính
      successTimerRef.current = setTimeout(() => {
        onLogin(userPayload);
      }, 1200);
    } else {
      setError('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Quản trị viên (Admin)', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'editor':
        return { label: 'Biên tập viên (Editor)', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { label: 'Người xem (Viewer)', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
  };

  return (
    <>
      {/* Success Popup Modal (Hiệu ứng xuất hiện mượt mà Fade In / Scale Up) */}
      {isSuccess && authenticatedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 text-center animate-popup-scale relative overflow-hidden">
            {/* Background subtle glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-100 rounded-full blur-2xl pointer-events-none" />

            {/* Glowing Success Icon */}
            <div className="relative mx-auto w-18 h-18 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
              <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
            </div>

            {/* Text details */}
            <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-1.5">
              <span>Đăng nhập thành công!</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Đang chuyển vào hệ thống...</span>
            </p>

            {/* User welcome card */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
                  {authenticatedUser.username.slice(0, 2)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {authenticatedUser.username}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Rohto Layout System
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  getRoleBadge(authenticatedUser.role).color
                }`}
              >
                {getRoleBadge(authenticatedUser.role).label}
              </span>
            </div>

            {/* Smooth 1.2s progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 rounded-full animate-progress-1200" />
            </div>
          </div>
        </div>
      )}

      {/* Main Login Form Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="w-[95vw] sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[94vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 sm:p-6 text-white text-center relative shrink-0">
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600/30 border border-blue-400/40 rounded-2xl flex items-center justify-center mx-auto mb-2.5 sm:mb-3 shadow-inner">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Hệ Thống Sơ Đồ Chỗ Ngồi</h2>
            <p className="text-xs text-blue-200 mt-1 font-medium">
              Rohto Office Layout · June 2026 Edition
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {expiredMessage && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-fadeIn">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{expiredMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-shake">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập username..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  autoComplete="username"
                  disabled={isSuccess}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  autoComplete="current-password"
                  disabled={isSuccess}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSuccess}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSuccess ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </div>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>

            {onContinueAsGuest && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  disabled={isSuccess}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Xem sơ đồ với tư cách Khách (Chỉ xem)</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};
