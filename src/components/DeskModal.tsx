import React, { useState, useEffect } from 'react';
import { Department, Desk, Site } from '../types';
import { DEFAULT_DEPTS, getDeptTheme, parseCleanNumber } from '../constants';
import {
  X,
  Trash2,
  Save,
  User as UserIcon,
  Tag,
  Building,
  Briefcase,
  IdCard,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface DeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  desk: (Desk & { isNew?: boolean }) | null;
  canEdit: boolean;
  isAdmin?: boolean;
  onSave: (desk: Desk, isNew?: boolean) => void;
  onDelete: (deskId: string) => void;
  sites: Site[];
  currentSiteName: string;
  currentSitePinSize?: number;
}

export const DeskModal: React.FC<DeskModalProps> = ({
  isOpen,
  onClose,
  desk,
  canEdit,
  isAdmin = false,
  onSave,
  onDelete,
  sites,
  currentSiteName,
}) => {
  const [site, setSite] = useState('');
  const [deskId, setDeskId] = useState('');
  const [empName, setEmpName] = useState('');
  const [dept, setDept] = useState<Department>('Sale');
  const [empCode, setEmpCode] = useState('');
  const [title, setTitle] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Lấy danh sách phòng ban tương ứng của Site đang được chọn trong Modal
  const targetSite =
    sites.find((s) => s.name === site) ||
    sites.find((s) => s.name === currentSiteName) ||
    sites[0];
  const availableDepts =
    targetSite?.departments && targetSite.departments.length > 0
      ? targetSite.departments
      : DEFAULT_DEPTS;

  useEffect(() => {
    if (desk) {
      const initialSite = desk.site || currentSiteName;
      setSite(initialSite);
      setDeskId(desk.id || '');
      setEmpName(desk.name || '');

      const activeSiteObj =
        sites.find((s) => s.name === initialSite) ||
        sites.find((s) => s.name === currentSiteName) ||
        sites[0];
      const depts =
        activeSiteObj?.departments && activeSiteObj.departments.length > 0
          ? activeSiteObj.departments
          : DEFAULT_DEPTS;

      setDept(depts.includes(desk.dept) ? desk.dept : depts[0] || 'Sale');
      setEmpCode(desk.empCode || '');
      setTitle(desk.title || desk.note || '');
      setIsConfirmingDelete(false);
    }
  }, [desk, currentSiteName, sites]);

  if (!isOpen || !desk) return null;

  const handleSiteChange = (newSiteName: string) => {
    setSite(newSiteName);
    const newSiteObj = sites.find((s) => s.name === newSiteName);
    const newDepts =
      newSiteObj?.departments && newSiteObj.departments.length > 0
        ? newSiteObj.departments
        : DEFAULT_DEPTS;
    if (!newDepts.includes(dept)) {
      setDept(newDepts[0] || 'Sale');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const trimmedId = deskId.trim();
    if (!trimmedId) return;

    onSave(
      {
        ...desk,
        site: site || currentSiteName,
        id: trimmedId,
        name: empName.trim(),
        dept,
        empCode: empCode.trim(),
        title: title.trim(),
        note: title.trim(),
        fontSize: Math.max(2, Math.min(32, Math.round(parseCleanNumber(desk.fontSize ?? desk.customSize, 13)))),
        customSize: Math.max(2, Math.min(32, Math.round(parseCleanNumber(desk.customSize ?? desk.fontSize, 13)))),
        rotation: parseCleanNumber(desk.rotation, 0),
      },
      desk.isNew
    );
  };

  const theme = getDeptTheme(dept);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[95vw] sm:max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-3.5 h-3.5 rounded-full ${theme.bg}`} />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {canEdit
                  ? desk.isNew
                    ? 'Thêm Vị Trí Bàn Mới'
                    : `Chỉnh Sửa Chỗ Ngồi: ${desk.id}`
                  : `Thông Tin Chỗ Ngồi: ${desk.id}`}
              </h3>
              <p className="text-[10.5px] sm:text-[11px] text-slate-400">
                {canEdit ? 'Cập nhật thông tin nhân viên và vị trí làm việc' : 'Chế độ chỉ xem thông tin'}
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

        {/* Form Body with Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">

          {/* Status Badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs font-medium text-slate-500">Tình trạng chỗ ngồi:</span>
            {empName.trim() ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã có người ngồi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Bàn trống
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 1. Site / Chi nhánh */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Site / Chi nhánh
              </label>
              <select
                value={site}
                onChange={(e) => handleSiteChange(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 cursor-pointer"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Mã số bàn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Mã số bàn (Desk ID)
              </label>
              <input
                type="text"
                value={deskId}
                onChange={(e) => setDeskId(e.target.value)}
                placeholder="VD: SALE-01, MKT-02..."
                disabled={!canEdit}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 3. Họ và tên nhân viên */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Họ và tên nhân viên
              </label>
              <input
                type="text"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="Để trống nếu là bàn trống..."
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>

            {/* 4. Mã nhân viên */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-400" /> Mã nhân viên (Emp Code)
              </label>
              <input
                type="text"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                placeholder="VD: RMV-0123"
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 5. Phòng ban (Chỉ hiển thị phòng ban của Site đang chọn) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Phòng ban ({availableDepts.length})
              </label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value as Department)}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 cursor-pointer"
              >
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Chức vụ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Chức vụ (Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Sales Manager, IT Lead..."
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-slate-50 disabled:bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1 shrink-0">
            {canEdit && !desk.isNew ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 p-1 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-rose-800 px-1 hidden sm:inline">
                    Xác nhận xóa bàn {desk.id}?
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(String(desk.id));
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    title="Xác nhận xóa vĩnh viễn bàn này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsConfirmingDelete(false);
                    }}
                    className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(true);
                  }}
                  className="px-2.5 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Xóa chỗ ngồi này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xóa chỗ ngồi này</span>
                  <span className="sm:hidden">Xóa</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 sm:px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Đóng
              </button>

              {canEdit && (
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{desk.isNew ? 'Lưu vị trí' : 'Lưu thay đổi'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
