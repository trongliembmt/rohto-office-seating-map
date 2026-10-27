import React, { useState } from 'react';
import { Site } from '../types';
import { Plus, Edit2, Trash2, Building, Check, X, MapPin } from 'lucide-react';

interface SiteTabsProps {
  sites: Site[];
  activeSiteId: string;
  onSelectSite: (siteId: string) => void;
  isAdmin: boolean;
  onAddSite: (siteName: string, mapImage: string) => void;
  onRenameSite: (siteId: string, newName: string) => void;
  onDeleteSite: (siteId: string) => void;
  desksCountBySite: Record<string, number>;
}

export const SiteTabs: React.FC<SiteTabsProps> = ({
  sites,
  activeSiteId,
  onSelectSite,
  isAdmin,
  onAddSite,
  onRenameSite,
  onDeleteSite,
  desksCountBySite,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteImage, setNewSiteImage] = useState<string>('Rohto New Layout - June 2026.png');

  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartAdd = () => {
    if (!isAdmin) {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }
    setIsAdding(true);
    setNewSiteName('');
    setNewSiteImage('Rohto New Layout - June 2026.png');
  };

  const handleSaveNewSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }
    const trimmed = newSiteName.trim();
    if (!trimmed) return;

    if (sites.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Tên Site / Chi nhánh này đã tồn tại!');
      return;
    }

    onAddSite(trimmed, newSiteImage);
    setIsAdding(false);
    setNewSiteName('');
  };

  const handleStartRename = (site: Site) => {
    if (!isAdmin) {
      alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
      return;
    }
    setEditingSiteId(site.id);
    setEditingName(site.name);
  };

  const handleSaveRename = (siteId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingSiteId(null);
      return;
    }
    onRenameSite(siteId, trimmed);
    setEditingSiteId(null);
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setNewSiteImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl px-3 py-2 shadow-sm mb-3 overflow-x-auto">
      {/* List of Site Tabs */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto py-0.5 pr-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-blue-600" /> Site:
        </span>

        {sites.map((site) => {
          const isActive = site.id === activeSiteId;
          const isEditing = site.id === editingSiteId;
          const deskCount = desksCountBySite[site.name] || 0;

          if (isEditing) {
            return (
              <div
                key={site.id}
                className="flex items-center gap-1 bg-blue-50 border border-blue-300 rounded-xl px-2 py-1 shrink-0"
              >
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  autoFocus
                  className="text-xs px-1.5 py-0.5 bg-white border border-blue-400 rounded focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(site.id)}
                  className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                  title="Lưu tên mới"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSiteId(null)}
                  className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={site.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              onClick={() => onSelectSite(site.id)}
            >
              <Building className={`w-3.5 h-3.5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`} />
              <span className="truncate max-w-[180px]">{site.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-blue-800/80 text-blue-100' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {deskCount}
              </span>

              {/* Admin Actions on hover */}
              {isAdmin && (
                <div
                  className={`flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleStartRename(site)}
                    className="p-0.5 hover:scale-110 rounded transition-transform cursor-pointer"
                    title="Đổi tên Site"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {sites.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) {
                          alert('Bạn không có quyền thực hiện thao tác này. Chỉ Admin mới có quyền quản lý Site!');
                          return;
                        }
                        if (
                          confirm(
                            `Bạn có chắc chắn muốn xóa Site "${site.name}"? Tất cả bàn thuộc Site này sẽ bị xóa cùng.`
                          )
                        ) {
                          onDeleteSite(site.id);
                        }
                      }}
                      className="p-0.5 hover:scale-110 hover:text-red-300 rounded transition-transform cursor-pointer"
                      title="Xóa Site"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Site Button (Admin Only) */}
        {isAdmin && !isAdding && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-blue-400 text-blue-700 hover:bg-blue-50 text-xs font-semibold transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Site mới</span>
          </button>
        )}
      </div>

      {/* Add Site Inline Form Modal / Box */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <form
            onSubmit={handleSaveNewSite}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" /> Thêm Site / Chi Nhánh Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên Site / Chi nhánh
              </label>
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="VD: Chi nhánh Hà Nội, Văn phòng Tầng 5..."
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ảnh mặt bằng nền (Độ phân giải gốc)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Nếu không tải ảnh, hệ thống sẽ tự động dùng ảnh sơ đồ mặc định của công ty.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Tạo Site
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
