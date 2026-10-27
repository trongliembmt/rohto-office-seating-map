import React, { useState } from 'react';
import { Desk, Site } from '../types';
import {
  exportCurrentSiteToExcel,
  exportAllSitesToExcel,
  exportDesksToCSV,
} from '../utils/exportReport';
import {
  X,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Building,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSite: Site;
  allSites: Site[];
  allDesks: Desk[];
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  currentSite,
  allSites,
  allDesks,
}) => {
  const [scope, setScope] = useState<'current' | 'all'>('current');

  if (!isOpen) return null;

  const currentSiteDesks = allDesks.filter(
    (d) =>
      d.site === currentSite.name ||
      (!d.site && currentSite.id === 'site-rohto-main')
  );

  const handleExportXLSX = () => {
    if (scope === 'current') {
      exportCurrentSiteToExcel(currentSite, currentSiteDesks);
    } else {
      exportAllSitesToExcel(allSites, allDesks);
    }
    onClose();
  };

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (scope === 'current') {
      const safeName = currentSite.name.replace(/[^a-zA-Z0-9]/g, '_');
      exportDesksToCSV(
        currentSiteDesks,
        `Report_ChoNgoi_${safeName}_${timestamp}.csv`
      );
    } else {
      exportDesksToCSV(
        allDesks,
        `Report_ChoNgoi_TongHop_TatCa_Sites_${timestamp}.csv`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[95vw] sm:max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Xuất Báo Cáo Sơ Đồ Chỗ Ngồi</h3>
              <p className="text-[10.5px] sm:text-[11px] text-slate-400">
                Xuất file Excel (.xlsx) thông minh theo Site & file CSV chuẩn UTF-8
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* 1. Lựa chọn phạm vi xuất dữ liệu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn hình thức xuất báo cáo:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Lựa chọn A: Xuất Báo Cáo Site Hiện Tại */}
              <button
                type="button"
                onClick={() => setScope('current')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'current'
                    ? 'border-emerald-500 bg-emerald-50/80 text-slate-900 ring-2 ring-emerald-400/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <Building className="w-3.5 h-3.5 text-emerald-600" /> Xuất Site Hiện Tại
                    </span>
                    {scope === 'current' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div
                    className="text-[11px] text-slate-500 line-clamp-2 font-medium"
                    title={currentSite.name}
                  >
                    {currentSite.name}
                  </div>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 mt-3 pt-2 border-t border-emerald-200/50">
                  {currentSiteDesks.length} chỗ ngồi
                </div>
              </button>

              {/* Lựa chọn B: Xuất Báo Cáo Tổng Hợp Tất Cả Site */}
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'all'
                    ? 'border-emerald-500 bg-emerald-50/80 text-slate-900 ring-2 ring-emerald-400/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" /> Tổng Hợp Tất Cả Site
                    </span>
                    {scope === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Toàn bộ {allSites.length} chi nhánh / site
                  </div>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 mt-3 pt-2 border-t border-emerald-200/50">
                  Tổng {allDesks.length} chỗ ngồi
                </div>
              </button>
            </div>
          </div>

          {/* 2. Diễn giải định dạng xuất */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Đặc điểm dữ liệu khi xuất:</span>
            </div>

            {scope === 'all' ? (
              <div className="text-[11.5px] text-slate-600 space-y-1">
                <p className="flex items-center gap-1 text-emerald-800 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>File Excel (.xlsx) sẽ tự động tạo bảng tổng hợp Master kèm các sheet con cho từng Site.</span>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Dễ dàng tra cứu, đối chiếu theo cột <b>Site</b> và <b>Phòng Ban</b>.
                </p>
              </div>
            ) : (
              <div className="text-[11.5px] text-slate-600">
                <p className="text-emerald-800 font-semibold">
                  Chỉ lọc và xuất đúng danh sách {currentSiteDesks.length} bàn của Site "{currentSite.name}".
                </p>
              </div>
            )}

            <div className="pt-1.5 border-t border-slate-200/60">
              <div className="text-[10.5px] text-slate-400">
                Các cột xuất chuẩn: Site · Họ tên nhân viên · Phòng Ban · Mã NV · Chức vụ · Mã số bàn · Tọa độ X · Tọa độ Y.
              </div>
            </div>
          </div>

          {/* 3. Nút hành động */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleExportXLSX}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {scope === 'current'
                  ? '📊 Xuất file Excel (.xlsx) - Site Hiện Tại'
                  : '📊 Xuất file Excel (.xlsx) - Tổng Hợp Kèm Các Sheet Con'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>
                {scope === 'current'
                  ? '📄 Xuất file CSV (.csv) - Site Hiện Tại'
                  : '📄 Xuất file CSV (.csv) - Toàn Bộ Dữ Liệu'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
