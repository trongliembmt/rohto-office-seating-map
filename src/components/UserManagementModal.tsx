import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  X,
  UserPlus,
  Trash2,
  ShieldCheck,
  UserCheck,
  Eye,
  ShieldAlert,
  KeyRound,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  Lock,
  UserCog,
  CheckCircle2,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUsername: string;
  onAddUser: (user: User) => void;
  onDeleteUser: (username: string) => void;
  onUpdateUsername: (
    oldUsername: string,
    newUsername: string
  ) => { success: boolean; message: string };
  onResetPassword: (
    username: string,
    newPassword: string
  ) => { success: boolean; message: string };
  onUpdateRole: (username: string, newRole: UserRole) => void;
  onOpenPersonalChangePassword?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUsername,
  onAddUser,
  onDeleteUser,
  onUpdateUsername,
  onResetPassword,
  onUpdateRole,
  onOpenPersonalChangePassword,
}) => {
  // Add user state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');

  // Editing username state
  const [editingTargetUser, setEditingTargetUser] = useState<string | null>(null);
  const [editingNewUsername, setEditingNewUsername] = useState('');

  // Reset password state for target user
  const [resetTargetUser, setResetTargetUser] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(true);

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const uname = newUsername.trim();
    const pass = newPassword.trim();

    if (!uname || !pass) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    if (uname.length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return;
    }

    if (pass.length < 6) {
      setError('Mật khẩu người dùng mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
      setError(`Tên người dùng "${uname}" đã tồn tại trong hệ thống!`);
      return;
    }

    onAddUser({
      username: uname,
      password: pass,
      role: newRole,
    });

    setNewUsername('');
    setNewPassword('');
    setNewRole('viewer');
    setSuccess(`Đã tạo thành công tài khoản "${uname}" với quyền ${newRole.toUpperCase()}!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Start editing username
  const handleStartEditUsername = (user: User) => {
    setError(null);
    setSuccess(null);
    setResetTargetUser(null);
    setEditingTargetUser(user.username);
    setEditingNewUsername(user.username);
  };

  // Save new username
  const handleSaveUsername = (oldUsername: string) => {
    const trimmed = editingNewUsername.trim();
    if (!trimmed) {
      setError('Tên đăng nhập không được để trống!');
      return;
    }

    if (trimmed.toLowerCase() === oldUsername.toLowerCase()) {
      setEditingTargetUser(null);
      return;
    }

    const res = onUpdateUsername(oldUsername, trimmed);
    if (!res.success) {
      setError(res.message);
    } else {
      setSuccess(res.message);
      setEditingTargetUser(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Start reset password modal/form for target user
  const handleStartResetPassword = (username: string) => {
    setError(null);
    setSuccess(null);
    setEditingTargetUser(null);
    setResetTargetUser(username);
    // Generate a default strong random password option or empty
    setResetNewPassword(`Rohto@${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Save reset password
  const handleConfirmResetPassword = (username: string) => {
    const trimmed = resetNewPassword.trim();
    if (!trimmed || trimmed.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    const res = onResetPassword(username, trimmed);
    if (!res.success) {
      setError(res.message);
    } else {
      setSuccess(res.message);
      setResetTargetUser(null);
      setResetNewPassword('');
      setTimeout(() => setSuccess(null), 3500);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <UserCheck className="w-3 h-3" /> Editor
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            <Eye className="w-3 h-3" /> Viewer
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="w-[95vw] sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Quản Lý Tài Khoản & Phân Quyền
              </h3>
              <p className="text-[11px] text-slate-400">
                Quyền Quản trị viên (Admin) · Quản lý user, reset mật khẩu và phân quyền
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Admin Self-Password Security Notice & Quick Action */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">
                  Quy tắc bảo mật tài khoản:
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Admin có quyền sửa username & reset mật khẩu trực tiếp cho <strong className="text-slate-800">người dùng khác</strong>. Tuy nhiên, Admin <strong className="text-red-700">không thể tự đổi mật khẩu của chính mình</strong> tại danh sách này mà phải dùng tính năng xác thực mật khẩu cũ.
                </p>
              </div>
            </div>
            {onOpenPersonalChangePassword && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPersonalChangePassword();
                }}
                className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu của tôi</span>
              </button>
            )}
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* User List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách tài khoản ({users.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Nhấp vào icon chìa khóa để reset mật khẩu người dùng
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/40">
              {users.map((u) => {
                const isCurrent =
                  u.username.toLowerCase() === currentUsername.toLowerCase();
                const isRootAdmin = u.username.toLowerCase() === 'admin';
                const isEditingThisUser = editingTargetUser === u.username;
                const isResettingThisUser = resetTargetUser === u.username;

                return (
                  <div key={u.username} className="p-3.5 hover:bg-white transition-colors space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Avatar + Username & Role */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          {isEditingThisUser ? (
                            /* Inline Edit Username Form */
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <input
                                type="text"
                                value={editingNewUsername}
                                onChange={(e) => setEditingNewUsername(e.target.value)}
                                className="px-2.5 py-1 text-xs font-medium border border-blue-400 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                placeholder="Nhập username mới..."
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveUsername(u.username)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                                title="Lưu tên mới"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTargetUser(null)}
                                className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-800">
                                {u.username}
                              </span>

                              {/* Allow Admin to edit other users' usernames */}
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditUsername(u)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Chỉnh sửa Tên đăng nhập (Username)"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                  Tài khoản đang đăng nhập
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-1 flex items-center gap-2">
                            {/* Role selector for other users, or static badge for current admin */}
                            {!isCurrent ? (
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  onUpdateRole(u.username, e.target.value as UserRole)
                                }
                                className="text-[11px] font-semibold py-0.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="viewer">Viewer (Chỉ xem)</option>
                                <option value="editor">Editor (Chỉnh sửa)</option>
                                <option value="admin">Admin (Quản trị)</option>
                              </select>
                            ) : (
                              getRoleBadge(u.role)
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Reset Password Button */}
                        {isCurrent ? (
                          /* RULE 2: Admin cannot reset their own password in this general user list */
                          <button
                            type="button"
                            disabled
                            className="px-2.5 py-1 text-xs bg-slate-100 text-slate-400 border border-slate-200 rounded-lg cursor-not-allowed flex items-center gap-1.5 opacity-70"
                            title="Tài khoản Admin không được tự đổi mật khẩu tại đây. Hãy dùng chức năng 'Đổi mật khẩu của tôi'."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden sm:inline">Khóa tự reset</span>
                          </button>
                        ) : (
                          /* RULE 1: Admin can reset password for any other user */
                          <button
                            type="button"
                            onClick={() => handleStartResetPassword(u.username)}
                            className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                            title="Reset Mật khẩu cho tài khoản này (Không cần biết mật khẩu cũ)"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Reset Mật khẩu</span>
                          </button>
                        )}

                        {/* Delete User Button */}
                        {!isRootAdmin && !isCurrent ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Bạn có chắc chắn muốn xóa tài khoản "${u.username}" khỏi hệ thống?`
                                )
                              ) {
                                onDeleteUser(u.username);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Reset Password Expanded Sub-form for Target User */}
                    {isResettingThisUser && (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                          <span className="flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                            Nhập mật khẩu mới cho user: <strong>{u.username}</strong>
                          </span>
                          <span className="text-[11px] text-indigo-600 font-normal">
                            (Admin đặt lại trực tiếp, không yêu cầu mật khẩu cũ)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showResetPass ? 'text' : 'password'}
                              value={resetNewPassword}
                              onChange={(e) => setResetNewPassword(e.target.value)}
                              placeholder="Nhập mật khẩu mới..."
                              className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowResetPass(!showResetPass)}
                              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title={showResetPass ? 'Ẩn' : 'Hiện'}
                            >
                              {showResetPass ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setResetNewPassword(
                                `Rohto@${Math.floor(1000 + Math.random() * 9000)}`
                              )
                            }
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer shrink-0"
                            title="Tạo mật khẩu ngẫu nhiên"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Mật khẩu mẫu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConfirmResetPassword(u.username)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Lưu Mật Khẩu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setResetTargetUser(null)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                            title="Đóng"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add User Form */}
          <form
            onSubmit={handleCreate}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3"
          >
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-blue-600" /> Thêm người dùng mới
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="VD: minh.rohto"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mật khẩu khởi tạo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phân quyền (Role)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="viewer">
                  Viewer — Chỉ xem sơ đồ, tìm kiếm, lọc phòng ban, xuất báo cáo
                </option>
                <option value="editor">
                  Editor — Thêm, sửa, di chuyển vị trí bàn ghế trên sơ đồ
                </option>
                <option value="admin">
                  Admin — Toàn quyền quản trị, đổi ảnh Site, quản lý users & reset mật khẩu
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tạo tài khoản mới</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400">
            Dữ liệu tài khoản được lưu trữ và đồng bộ bảo mật trực tiếp trên Cloud Firestore Realtime
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer shrink-0"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
