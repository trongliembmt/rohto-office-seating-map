import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert,
  Building,
} from 'lucide-react';

interface ChangeMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingImage: { file: File; previewUrl: string } | null;
  currentSiteName: string;
  onConfirmChange: (file: File, base64Url: string) => void;
}

export const ChangeMapModal: React.FC<ChangeMapModalProps> = ({
  isOpen,
  onClose,
  pendingImage,
  currentSiteName,
  onConfirmChange,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);

  // Reset to step 1 whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setImgDimensions(null);
    }
  }, [isOpen, pendingImage]);

  if (!isOpen || !pendingImage) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const handleConfirm = () => {
    onConfirmChange(pendingImage.file, pendingImage.previewUrl);
    onClose();
  };

  const fileSizeKB = Math.round(pendingImage.file.size / 1024);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-[95vw] sm:max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                step === 1 ? 'bg-blue-600' : 'bg-red-600 animate-pulse'
              }`}
            >
              {step === 1 ? <ImageIcon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    step === 1 ? 'bg-blue-950 text-blue-300 border border-blue-700' : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  Xác nhận {step}/2 bước
                </span>
                <span className="text-xs text-slate-400">Site: {currentSiteName}</span>
              </div>
              <h3 className="font-bold text-base leading-tight mt-0.5">
                {step === 1
                  ? 'Bước 1/2: Kiểm tra bản xem trước ảnh sơ đồ'
                  : 'Bước 2/2: Xác nhận lần cuối ghi đè ảnh'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {step === 1 ? (
            /* ================= BƯỚC 1: XEM TRƯỚC (PREVIEW) ================= */
            <div className="space-y-4">
              {/* Thông báo Bước 1 */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <b className="text-blue-950 block mb-0.5">
                    Bước 1/2: Bạn đang yêu cầu thay đổi bản đồ nền của Site. Vui lòng kiểm tra kỹ ảnh xem trước.
                  </b>
                  <span>
                    Hình ảnh mới sẽ thay thế sơ đồ hiện tại của Site <b>"{currentSiteName}"</b>. Hãy kiểm tra các nét vẽ và tỷ lệ mặt bằng xem trước bên dưới.
                  </span>
                </div>
              </div>

              {/* Thông tin file */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-slate-800">Tệp đã chọn:</span>
                  <span className="truncate max-w-[240px] text-blue-700 font-mono font-medium">
                    {pendingImage.file.name}
                  </span>
                  <span className="text-slate-400 font-mono">({fileSizeKB} KB)</span>
                </div>
                {imgDimensions && (
                  <span className="text-[11px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {imgDimensions.width} × {imgDimensions.height} px
                  </span>
                )}
              </div>

              {/* Khung xem trước ảnh */}
              <div className="relative w-full h-72 bg-slate-900 rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                <img
                  src={pendingImage.previewUrl}
                  alt="Xem trước ảnh sơ đồ mới"
                  onLoad={handleImageLoad}
                  className="max-h-full max-w-full object-contain rounded shadow-lg"
                />
                <div className="absolute bottom-2 right-2 bg-slate-950/80 text-white text-[10px] px-2 py-0.5 rounded font-mono backdrop-blur-xs">
                  Bản xem trước
                </div>
              </div>
            </div>
          ) : (
            /* ================= BƯỚC 2: XÁC NHẬN GHI ĐÈ LẦN CUỐI ================= */
            <div className="space-y-4 animate-fadeIn">
              {/* Cảnh báo đỏ Bước 2 */}
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3.5 text-xs text-red-900 leading-relaxed shadow-sm">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <b className="text-red-950 text-sm block">
                    Bước 2/2: Xác nhận ghi đè ảnh sơ đồ mới? (Không thể hoàn tác)
                  </b>
                  <p className="text-red-800">
                    Hành động này sẽ thay thế hoàn toàn sơ đồ nền cũ của Site <b>"{currentSiteName}"</b> bằng hình ảnh mới:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-red-700 font-medium pl-1 pt-1">
                    <li>Ảnh nền mới sẽ được áp dụng trực tiếp lên hệ thống ngay lập tức.</li>
                    <li>
                      Tọa độ các bàn hiện có trên sơ đồ sẽ giữ nguyên vị trí theo tỷ lệ phần trăm (%).
                    </li>
                    <li>Sau khi áp dụng, bạn sẽ không thể tự động quay lại ảnh cũ trừ khi tải lại tệp cũ.</li>
                  </ul>
                </div>
              </div>

              {/* Tóm tắt thông tin xác nhận */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700 pb-2 border-b border-slate-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" /> Site áp dụng:
                  </span>
                  <span className="font-bold text-slate-900">{currentSiteName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 pb-2 border-b border-slate-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> Tệp ảnh mới:
                  </span>
                  <span className="font-mono text-slate-900 truncate max-w-[260px]">
                    {pendingImage.file.name} ({fileSizeKB} KB)
                  </span>
                </div>
                {imgDimensions && (
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">Độ phân giải:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {imgDimensions.width} × {imgDimensions.height} px
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Bước 1</span>
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Tiếp tục sang Bước 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer animate-pulse"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Bước 2/2: Xác nhận ghi đè ảnh sơ đồ mới? (Không thể hoàn tác)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
