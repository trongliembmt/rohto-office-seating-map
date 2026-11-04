import React from 'react';
import { Department, Desk, InteractionMode } from '../types';
import { getDeptTheme, getShortName, parseCleanNumber } from '../constants';
import {
  MousePointer,
  PlusCircle,
  Move,
  Search,
  Filter,
  Download,
  Upload,
  Image as ImageIcon,
  User as UserIcon,
  X,
  FileSpreadsheet,
  IdCard,
  Building,
  RotateCw,
  Type,
} from 'lucide-react';

export interface SidebarProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  onCursorClick?: () => void;
  onDeselectDesk?: () => void;
  canEdit: boolean;
  isAdmin: boolean;
  pinSize?: number;
  onPinSizeChange?: (size: number) => void;
  onFontSizeChange?: (deskId: string, size: number) => void;
  onRotateDesk?: (deskId: string, deg: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDept: Department | 'all';
  onDeptChange: (dept: Department | 'all') => void;
  siteDepartments: string[];
  onOpenManageDeptsModal?: () => void;
  desks: Desk[];
  filteredDesks: Desk[];
  selectedDeskId: string | null;
  onSelectDesk: (desk: Desk) => void;
  onOpenDeskModal?: (desk: Desk) => void;
  onOpenExportModal: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeBgImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  onModeChange,
  onCursorClick,
  onDeselectDesk,
  canEdit,
  isAdmin,
  onFontSizeChange,
  onRotateDesk,
  searchQuery,
  onSearchChange,
  selectedDept,
  onDeptChange,
  siteDepartments,
  onOpenManageDeptsModal,
  desks,
  filteredDesks,
  selectedDeskId,
  onSelectDesk,
  onOpenDeskModal,
  onOpenExportModal,
  onExportJson,
  onImportJson,
  onChangeBgImage,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const totalDesks = desks.length;
  const occupiedCount = desks.filter((d) => d.name && d.name.trim()).length;
  const vacantCount = totalDesks - occupiedCount;

  const selectedDesk = desks.find((d) => d.id === selectedDeskId);
  const currentDeskFontSize = selectedDesk
    ? Math.max(2, Math.min(32, Math.round(parseCleanNumber(selectedDesk.fontSize ?? selectedDesk.customSize, 13))))
    : 13;
  const currentDeskRotation = selectedDesk
    ? parseCleanNumber(selectedDesk.rotation, 0)
    : 0;

  // Xử lý click nút Con trỏ: Nếu đang ở cursor và đã chọn bàn -> Hủy chọn bàn; ngược lại chuyển mode = 'cursor'
  const handleCursorButtonClick = () => {
    if (onCursorClick) {
      onCursorClick();
    } else if (mode === 'cursor' && selectedDeskId) {
      if (onDeselectDesk) {
        onDeselectDesk();
      } else {
        onSelectDesk({ id: '' } as Desk);
      }
    } else {
      onModeChange('cursor');
    }
  };

  return (
    <aside
      onWheel={(e) => e.stopPropagation()}
      style={{ maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}
      className={`bg-white p-4 flex flex-col h-full max-h-full overflow-y-auto overscroll-contain ${
        isMobileDrawer
          ? 'w-full shadow-none border-none'
          : 'w-80 shrink-0 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80'
      }`}
    >
      {/* Mobile Drawer Header */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Tìm Kiếm & Danh Sách Chỗ Ngồi</h2>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Đóng bảng tìm kiếm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Khối 1: Ô Tìm kiếm */}
      <div className="relative mb-2.5">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm tên, mã NV, mã bàn..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            title="Xóa tìm kiếm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Khối 2: Bộ lọc Phòng ban & Nút Quản lý (Gọn gàng trên cùng 1 hàng) */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="relative flex-1">
          <Building className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedDept}
            onChange={(e) => onDeptChange(e.target.value as Department | 'all')}
            className="w-full pl-8 pr-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium text-slate-700 truncate"
          >
            <option value="all">Tất cả phòng ban ({totalDesks})</option>
            {siteDepartments.map((d) => {
              const count = desks.filter((item) => item.dept === d).length;
              return (
                <option key={d} value={d}>
                  {d} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {canEdit && onOpenManageDeptsModal && (
          <button
            type="button"
            onClick={onOpenManageDeptsModal}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition-all cursor-pointer shadow-2xs"
            title="Quản lý Phòng ban của Site"
          >
            <Building className="w-4 h-4 text-blue-600" />
          </button>
        )}
      </div>

      {/* Khối 3: Chế độ thao tác (Hàng 3 nút liền nhau) */}
      {canEdit ? (
        <div className="mb-2.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={handleCursorButtonClick}
              className={`py-1.5 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'cursor'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 ring-2 ring-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title={mode === 'cursor' && selectedDeskId ? 'Bấm để hủy chọn bàn' : 'Xem và chọn bàn bình thường'}
            >
              <MousePointer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] truncate">Con trỏ</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('add')}
              className={`py-1.5 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'add'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Click lên sơ đồ để thêm bàn mới"
            >
              <PlusCircle className={`w-3.5 h-3.5 shrink-0 ${mode === 'add' ? 'text-white' : 'text-blue-600'}`} />
              <span className="text-[11px] truncate">+ Thêm bàn</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('move')}
              className={`py-1.5 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'move'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Kéo thả trực tiếp vị trí bàn trên bản đồ"
            >
              <Move className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] truncate">Di chuyển</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
          <MousePointer className="w-3.5 h-3.5 text-blue-500" />
          <span>Chế độ: <b>Chỉ xem & Tìm kiếm</b> (Viewer)</span>
        </div>
      )}

      {/* Khối 4: Card tinh chỉnh Bàn đang chọn (Selected Desk Quick Control) */}
      <div className="mb-2.5 p-2.5 bg-slate-50/90 border border-blue-100 rounded-xl transition-all shadow-2xs">
        {/* Hàng tiêu đề */}
        <div className="flex items-center justify-between text-xs mb-2">
          {selectedDesk ? (
            <span
              className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]"
              title={`Bàn ${selectedDesk.id} (${selectedDesk.name || 'Trống'})`}
            >
              Bàn {selectedDesk.id} ({getShortName(selectedDesk.name) || selectedDesk.name || 'trống'})
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic font-medium truncate">
              👉 Click chọn 1 bàn trên sơ đồ
            </span>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedDesk && canEdit && onOpenDeskModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDeskModal(selectedDesk);
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 cursor-pointer"
                title="Mở popup chỉnh sửa hoặc xóa bàn"
              >
                Sửa / Xóa
              </button>
            )}
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Lưu realtime
            </span>
          </div>
        </div>

        {/* Khung điều khiển (làm mờ khi chưa chọn bàn) */}
        <div className={`space-y-2 ${!selectedDesk ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Hàng Cỡ chữ */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 w-16 shrink-0 text-slate-700">
              <Type className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-semibold">Cỡ chữ</span>
            </div>
            <input
              type="range"
              min={2}
              max={32}
              step={1}
              disabled={!selectedDesk || !canEdit}
              value={currentDeskFontSize}
              onChange={(e) => {
                if (selectedDesk && onFontSizeChange) {
                  onFontSizeChange(selectedDesk.id, Number(e.target.value));
                }
              }}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold font-mono shrink-0">
              <input
                type="number"
                min={2}
                max={32}
                step={1}
                disabled={!selectedDesk || !canEdit}
                value={currentDeskFontSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && selectedDesk && onFontSizeChange) {
                    onFontSizeChange(selectedDesk.id, Math.max(2, Math.min(32, val)));
                  }
                }}
                className="w-8 text-center bg-transparent text-blue-900 font-bold focus:outline-none"
                title="Nhập cỡ chữ (2 - 32px)"
              />
              <span className="text-[10px] text-blue-600 select-none">px</span>
            </div>
          </div>

          {/* Hàng Xoay */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 w-16 shrink-0 text-slate-700">
              <RotateCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-semibold">Xoay</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              disabled={!selectedDesk || !canEdit}
              value={currentDeskRotation}
              onChange={(e) => {
                if (selectedDesk && onRotateDesk) {
                  onRotateDesk(selectedDesk.id, Number(e.target.value));
                }
              }}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold font-mono shrink-0">
              <input
                type="number"
                min={0}
                max={360}
                step={1}
                disabled={!selectedDesk || !canEdit}
                value={currentDeskRotation}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && selectedDesk && onRotateDesk) {
                    onRotateDesk(selectedDesk.id, Math.max(0, Math.min(360, val)));
                  }
                }}
                className="w-9 text-center bg-transparent text-indigo-900 font-bold focus:outline-none"
                title="Nhập góc xoay (0 - 360°)"
              />
              <span className="text-[10px] text-indigo-500 select-none">°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Khối 5: Hàng Nút Báo Cáo & Tác Vụ (Bố cục 1 nút dài + 3 nút vuông) */}
      <div className="flex items-center gap-1.5 mb-2.5">
        {/* Nút chính bên trái: Nút dài màu xanh lá cây đậm sang trọng */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="flex-1 h-9 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-w-0"
          title="Xuất báo cáo chỗ ngồi (Excel / CSV)"
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span className="truncate">Xuất báo cáo</span>
        </button>

        {/* 3 nút vuông nhỏ bên phải: Viền bo góc màu xanh nhạt */}
        {canEdit && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Nút 1: Sao lưu / Export JSON */}
            <button
              type="button"
              onClick={onExportJson}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 transition-all cursor-pointer shadow-2xs"
              title="Sao lưu sơ đồ (Tải JSON)"
            >
              <Download className="w-4 h-4 text-blue-600" />
            </button>

            {/* Nút 2: Phục hồi / Import JSON (Chỉ Admin) */}
            {isAdmin && (
              <label
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 transition-all cursor-pointer shadow-2xs"
                title="Phục hồi sơ đồ (Nhập JSON)"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportJson}
                  className="hidden"
                />
              </label>
            )}

            {/* Nút 3: Đổi ảnh sơ đồ Site (Chỉ Admin) */}
            {isAdmin && (
              <label
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 transition-all cursor-pointer shadow-2xs"
                title="Đổi ảnh nền mặt bằng"
              >
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={onChangeBgImage}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Khối 6: Thống kê trạng thái */}
      <div className="mb-2.5 py-1.5 px-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <span className="text-slate-600 text-[11px]">Đã có người:</span>
          <b className="text-slate-900 font-bold text-xs">{occupiedCount}</b>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
          <span className="text-slate-600 text-[11px]">Trống:</span>
          <b className="text-slate-900 font-bold text-xs">{vacantCount}</b>
        </div>
      </div>

      {/* 8. Danh sách bàn nhân viên (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredDesks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Không tìm thấy chỗ ngồi phù hợp.
          </div>
        ) : (
          filteredDesks.map((d) => {
            const isSelected = d.id === selectedDeskId;
            const isEmpty = !d.name || !d.name.trim();
            const theme = getDeptTheme(d.dept);

            return (
              <div
                key={d.id}
                onClick={() => onSelectDesk(d)}
                onDoubleClick={() => {
                  if (onOpenDeskModal) {
                    onOpenDeskModal(d);
                  }
                }}
                title="Click 1 lần: Tự động Zoom & Pan tới bàn · Nhấp đúp: Mở popup thông tin"
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-400'
                    : 'bg-white hover:bg-slate-50/80 border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white ${
                      isEmpty ? 'bg-amber-500' : theme.bg
                    } shadow-xs`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {d.name || <i className="text-amber-700 font-normal">(Bàn trống)</i>}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {d.id}
                      </span>
                    </div>

                    {/* Emp Code & Title */}
                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-600 mb-1">
                      {d.empCode && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9.5px] bg-slate-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                          <IdCard className="w-2.5 h-2.5" /> {d.empCode}
                        </span>
                      )}
                      {(d.title || d.note) && (
                        <span className="truncate text-slate-500 font-medium">
                          {d.title || d.note}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${theme.lightBg}`}>
                        {d.dept}
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="pt-1.5 border-t border-blue-200/60 flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-[10px] text-blue-700 font-medium">
                      {canEdit ? '⚡ Nhấp đúp để sửa' : 'Đã chọn bàn này'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenDeskModal) onOpenDeskModal(d);
                      }}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10.5px] font-semibold cursor-pointer shadow-2xs"
                    >
                      {canEdit ? 'Sửa thông tin' : 'Xem chi tiết'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
