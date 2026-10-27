import React, { useState } from 'react';
import { Desk, Site } from '../types';
import { getDeptTheme } from '../constants';
import {
  X,
  Building,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface ManageSiteDepartmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSite: Site;
  siteDesks: Desk[];
  onAddDepartment: (siteId: string, deptName: string) => { success: boolean; message: string };
  onDeleteDepartment: (siteId: string, deptName: string) => { success: boolean; message: string };
}

export const ManageSiteDepartmentsModal: React.FC<ManageSiteDepartmentsModalProps> = ({
  isOpen,
  onClose,
  currentSite,
  siteDesks,
  onAddDepartment,
  onDeleteDepartment,
}) => {
  const [newDeptName, setNewDeptName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const departments = currentSite.departments || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDeptName.trim();
    if (!clean) {
      setFeedback({ type: 'error', text: 'Tên phòng ban không được để trống!' });
      return;
    }

    const res = onAddDepartment(currentSite.id, clean);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setNewDeptName('');
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleDelete = (deptName: string) => {
    if (departments.length <= 1) {
      alert('Không thể xóa! Mỗi Site cần duy trì tối thiểu 1 phòng ban.');
      return;
    }

    const desksInDept = siteDesks.filter((d) => d.dept === deptName);
    const fallbackDept = departments.find((d) => d !== deptName) || 'Sale';

    let confirmMsg = `Bạn có chắc chắn muốn xóa phòng ban "${deptName}" khỏi Site "${currentSite.name}"?`;
    if (desksInDept.length > 0) {
      confirmMsg += `\n\n⚠️ Chú ý: Hiện có ${desksInDept.length} bàn chỗ ngồi thuộc phòng ban này. Sau khi xóa, các bàn sẽ được tự động chuyển sang phòng ban "${fallbackDept}" để đảm bảo dữ liệu chỗ ngồi không bị mất.`;
    }

    if (confirm(confirmMsg)) {
      const res = onDeleteDepartment(currentSite.id, deptName);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[95vw] sm:max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Quản Lý Phòng Ban Của Site</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Admin & Editor
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Site: <span className="text-white font-semibold">{currentSite.name}</span>
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

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Form thêm phòng ban mới */}
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Thêm phòng ban mới cho Site này
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => {
                  setNewDeptName(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="VD: QC, R&D, Logistics, Kế toán HN..."
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              * Phòng ban mới sẽ chỉ xuất hiện trong Site này, có màu sắc nhận diện riêng và hiển thị ngay trên bộ lọc.
            </p>
          </form>

          {/* Danh sách phòng ban hiện tại */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách phòng ban ({departments.length})
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Tổng cộng {siteDesks.length} chỗ ngồi
              </span>
            </div>

            <div className="space-y-2">
              {departments.map((dept) => {
                const theme = getDeptTheme(dept);
                const count = siteDesks.filter((d) => d.dept === dept).length;
                const isOnlyOne = departments.length <= 1;

                return (
                  <div
                    key={dept}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full ${theme.bg} shadow-xs shrink-0`} />
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{dept}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>
                            {count > 0 ? (
                              <b className="text-slate-700">{count} chỗ ngồi</b>
                            ) : (
                              <span className="text-slate-400 italic">0 chỗ ngồi</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOnlyOne}
                      onClick={() => handleDelete(dept)}
                      className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isOnlyOne
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200'
                      }`}
                      title={
                        isOnlyOne
                          ? 'Không thể xóa phòng ban duy nhất'
                          : `Xóa phòng ban ${dept} khỏi Site`
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Xóa</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Chính sách bảo toàn dữ liệu:</b> Khi bạn xóa một phòng ban, mọi nhân viên và chỗ ngồi đang thuộc phòng ban đó sẽ được tự động bảo toàn và di chuyển sang phòng ban khác trong Site, không bao giờ bị mất dữ liệu.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
