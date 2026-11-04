import React from 'react';
import { Department, Desk, InteractionMode } from '../types';
import { ALLOWED_DEPTS, DEPT_THEMES } from '../constants';
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
  Users,
  Armchair,
  CheckCircle,
} from 'lucide-react';

interface ToolbarProps {
  mode: InteractionMode;
  onModeChange: (mode: InteractionMode) => void;
  canEdit: boolean;
  isAdmin: boolean;
  pinSize: number;
  onPinSizeChange: (size: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDept: Department | 'all';
  onDeptChange: (dept: Department | 'all') => void;
  desks: Desk[];
  filteredDesks: Desk[];
  selectedDeskId: string | null;
  onSelectDesk: (desk: Desk) => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeBgImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  onModeChange,
  canEdit,
  isAdmin,
  pinSize,
  onPinSizeChange,
  searchQuery,
  onSearchChange,
  selectedDept,
  onDeptChange,
  desks,
  filteredDesks,
  selectedDeskId,
  onSelectDesk,
  onExportJson,
  onImportJson,
  onChangeBgImage,
}) => {
  const totalDesks = desks.length;
  const occupiedCount = desks.filter((d) => d.name && d.name.trim()).length;
  const vacantCount = totalDesks - occupiedCount;

  return (
    <aside className="w-80 shrink-0 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 flex flex-col h-full overflow-hidden">
      {/* Search Input */}
      <div className="mb-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600" /> Tìm kiếm nhân viên
          </span>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Xóa tìm
            </button>
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tên, mã bàn (VD: SALE-01), số nhánh..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Department Filter */}
      <div className="mb-3">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-600" /> Phòng ban (5 bộ phận)
        </label>
        <select
          value={selectedDept}
          onChange={(e) => onDeptChange(e.target.value as Department | 'all')}
          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium text-slate-700"
        >
          <option value="all">🏢 Tất cả phòng ban ({totalDesks})</option>
          {ALLOWED_DEPTS.map((d) => {
            const count = desks.filter((item) => item.dept === d).length;
            return (
              <option key={d} value={d}>
                {d} ({count} chỗ ngồi)
              </option>
            );
          })}
        </select>
      </div>

      {/* Mode Toolbar (3 chế độ) - Only shown if canEdit */}
      {canEdit ? (
        <div className="mb-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1">
            Chế độ tương tác
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onModeChange('cursor')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === 'cursor'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Xem và chọn bàn bình thường"
            >
              <MousePointer className="w-4 h-4 text-blue-600" />
              <span className="text-[11px]">↖ Con trỏ</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('add')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === 'add'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Click lên sơ đồ để thêm bàn mới"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="text-[11px]">➕ Thêm bàn</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('move')}
              className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === 'move'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Kéo thả trực tiếp vị trí bàn trên bản đồ"
            >
              <Move className="w-4 h-4" />
              <span className="text-[11px]">✋ Di chuyển</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
          <MousePointer className="w-3.5 h-3.5 text-blue-500" />
          <span>Chế độ: <b>Chỉ xem & Tìm kiếm</b> (Viewer)</span>
        </div>
      )}

      {/* Pin Size Slider */}
      <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-slate-500" /> Kích thước Icon
          </span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
            {pinSize}px
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPinSizeChange(Math.max(10, pinSize - 2))}
            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center cursor-pointer"
          >
            -
          </button>
          <input
            type="range"
            min={10}
            max={36}
            step={1}
            value={pinSize}
            onChange={(e) => onPinSizeChange(Number(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <button
            type="button"
            onClick={() => onPinSizeChange(Math.min(36, pinSize + 2))}
            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Admin Backup / Restore & Background Image (Only Admin) */}
      {isAdmin && (
        <div className="mb-3 p-2 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5">
          <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider px-1">
            Quản trị dữ liệu & Bản đồ
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={onExportJson}
              className="py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Tải file JSON sao lưu sơ đồ"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Sao lưu JSON</span>
            </button>

            <label
              className="py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Khôi phục dữ liệu từ file JSON"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Nạp JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={onImportJson}
                className="hidden"
              />
            </label>
          </div>

          <label
            className="w-full py-1.5 px-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Đổi file hình ảnh mặt bằng khác"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Đổi ảnh mặt bằng (Rohto Layout)</span>
            <input
              type="file"
              accept="image/*"
              onChange={onChangeBgImage}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="flex items-center justify-between py-2 px-1 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
        <span>Tổng: <b className="text-slate-800">{totalDesks}</b></span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          Có người: <b className="text-blue-700">{occupiedCount}</b>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Trống: <b className="text-amber-700">{vacantCount}</b>
        </span>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-1 border-t border-slate-100 pt-2">
        {filteredDesks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Không tìm thấy chỗ ngồi phù hợp.
          </div>
        ) : (
          filteredDesks.map((d) => {
            const isSelected = d.id === selectedDeskId;
            const isEmpty = !d.name || !d.name.trim();
            const theme = DEPT_THEMES[d.dept] || DEPT_THEMES.Sale;

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDesk(d)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-400'
                    : 'bg-white hover:bg-slate-50/80 border-slate-100 hover:border-slate-200'
                }`}
              >
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

                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${theme.lightBg}`}>
                      {d.dept}
                    </span>
                    {d.note && (
                      <span className="truncate max-w-[110px] text-[10px] text-slate-400" title={d.note}>
                        {d.note}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
