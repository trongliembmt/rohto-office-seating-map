import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Department, Desk, InteractionMode } from '../types';
import { DEPT_THEMES, getShortName } from '../constants';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  User as UserIcon,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';

interface FigmaCanvasProps {
  desks: Desk[];
  mode: InteractionMode;
  canEdit: boolean;
  pinSize: number;
  searchQuery: string;
  selectedDept: Department | 'all';
  selectedDeskId: string | null;
  onSelectDesk: (desk: Desk) => void;
  onAddDeskAt: (x: number, y: number) => void;
  onMoveDesk: (deskId: string, x: number, y: number) => void;
  customBgUrl: string | null;
  onUploadImage: (file: File) => void;
}

export const FigmaCanvas: React.FC<FigmaCanvasProps> = ({
  desks,
  mode,
  canEdit,
  pinSize,
  searchQuery,
  selectedDept,
  selectedDeskId,
  onSelectDesk,
  onAddDeskAt,
  onMoveDesk,
  customBgUrl,
  onUploadImage,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Figma-like pan & zoom state
  const [scale, setScale] = useState<number>(0.85);
  const [panX, setPanX] = useState<number>(30);
  const [panY, setPanY] = useState<number>(30);

  // Dragging / Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  // Moving desk pin state
  const [draggingDeskId, setDraggingDeskId] = useState<string | null>(null);

  // Floor plan image source fallback
  const [imgSrc, setImgSrc] = useState<string>(
    customBgUrl || 'Rohto New Layout - June 2026.png'
  );
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (customBgUrl) {
      setImgSrc(customBgUrl);
      setImageError(false);
    }
  }, [customBgUrl]);

  // Handle fallback image error sequence
  const handleImageError = () => {
    if (imgSrc.includes('.png')) {
      setImgSrc('Rohto New Layout - June 2026.jpg');
    } else if (imgSrc.includes('.jpg')) {
      setImgSrc('/rohto-layout-default.svg');
    } else {
      setImageError(true);
    }
  };

  // Fit canvas to viewport
  const fitCanvas = useCallback(() => {
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const mapWidth = 1200;
    const mapHeight = 860;

    const scaleX = (vRect.width - 60) / mapWidth;
    const scaleY = (vRect.height - 60) / mapHeight;
    const targetScale = Math.min(1.2, Math.max(0.45, Math.min(scaleX, scaleY)));

    const targetPanX = Math.max(15, (vRect.width - mapWidth * targetScale) / 2);
    const targetPanY = Math.max(15, (vRect.height - mapHeight * targetScale) / 2);

    setScale(targetScale);
    setPanX(targetPanX);
    setPanY(targetPanY);
  }, []);

  // Initial fit on mount
  useEffect(() => {
    const timer = setTimeout(fitCanvas, 150);
    window.addEventListener('resize', fitCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', fitCanvas);
    };
  }, [fitCanvas]);

  // Spacebar detection for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cursor-anchored Zoom In / Zoom Out (Zoom at mouse cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!viewportRef.current) return;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(4.0, Math.max(0.4, scale * factor));

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Anchor equation: mouse position remains at the same relative spot on map
    const newPanX = mouseX - (mouseX - panX) * (newScale / scale);
    const newPanY = mouseY - (mouseY - panY) * (newScale / scale);

    setScale(newScale);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const zoomByStep = (factor: number) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.min(4.0, Math.max(0.4, scale * factor));
    const newPanX = centerX - (centerX - panX) * (newScale / scale);
    const newPanY = centerY - (centerY - panY) * (newScale / scale);

    setScale(newScale);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  // Pan interaction (Viewport pointer events)
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking a pin or a button, don't start pan
    if ((e.target as HTMLElement).closest('.desk-pin, .canvas-ui-btn')) return;

    // Middle click or Space + Left click or clicking empty canvas in Cursor/Move mode
    const isMiddle = e.button === 1;
    const isLeft = e.button === 0;

    if (isMiddle || spacePressed || (isLeft && mode !== 'add')) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panX, y: e.clientY - panY });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPanX(e.clientX - startPan.x);
      setPanY(e.clientY - startPan.y);
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  // Add Desk Click on Map
  const handleMapClick = (e: React.MouseEvent) => {
    if (mode !== 'add' || !canEdit || spacePressed || isPanning) return;
    if ((e.target as HTMLElement).closest('.desk-pin')) return;
    if (!mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.min(99, Math.max(1, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(99, Math.max(1, ((e.clientY - rect.top) / rect.height) * 100));

    onAddDeskAt(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  // Matched search IDs
  const matchedIds = new Set<string>();
  const q = searchQuery.trim().toLowerCase();
  if (q || selectedDept !== 'all') {
    desks.forEach((d) => {
      const matchDept = selectedDept === 'all' || d.dept === selectedDept;
      const matchText =
        !q ||
        d.id.toLowerCase().includes(q) ||
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.dept && d.dept.toLowerCase().includes(q)) ||
        (d.note && d.note.toLowerCase().includes(q));

      if (matchDept && matchText) {
        matchedIds.add(d.id);
      }
    });
  }

  // Determine cursor style
  let cursorClass = 'cursor-grab';
  if (isPanning) cursorClass = 'cursor-grabbing';
  else if (spacePressed) cursorClass = 'cursor-grab';
  else if (mode === 'add') cursorClass = 'cursor-crosshair';
  else if (mode === 'move') cursorClass = 'cursor-move';

  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative flex-1 h-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner canvas-grid-pattern select-none ${cursorClass}`}
    >
      {/* Zoom Stage */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
        className="absolute top-0 left-0 transition-none"
      >
        {/* Map Paper Card */}
        <div
          ref={mapRef}
          onClick={handleMapClick}
          style={{ width: '1200px' }}
          className="relative bg-white rounded-lg shadow-2xl border border-slate-300 overflow-hidden"
        >
          {/* Floor plan image */}
          <img
            src={imgSrc}
            alt="Rohto New Layout - June 2026"
            onError={handleImageError}
            className="w-full h-auto block pointer-events-none select-none"
            draggable={false}
          />

          {/* Interactive Desk Pins */}
          {desks.map((d) => {
            const isSelected = d.id === selectedDeskId;
            const isMatched = matchedIds.has(d.id);
            const isEmpty = !d.name || !d.name.trim();
            const theme = DEPT_THEMES[d.dept] || DEPT_THEMES.Sale;
            const effectivePinSize = typeof d.customSize === 'number' && d.customSize > 0 ? d.customSize : pinSize;
            const shortName = getShortName(d.name);

            return (
              <div
                key={d.id}
                style={{
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  width: `${effectivePinSize}px`,
                  height: `${effectivePinSize}px`,
                  touchAction: 'none',
                }}
                className={`desk-pin absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all group z-10 ${
                  mode === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } ${isSelected ? 'ring-4 ring-slate-900 scale-125 z-30' : ''} ${
                  isMatched ? 'pin-match-pulse ring-4 ring-pink-500 scale-125 z-25' : ''
                } ${
                  isEmpty
                    ? 'bg-amber-500 border-2 border-white shadow-md text-white'
                    : `${theme.bg} border-2 border-white shadow-md text-white`
                }`}
                onPointerDown={(e) => {
                  if (mode === 'move' && canEdit) {
                    e.stopPropagation();
                    e.preventDefault();
                    setDraggingDeskId(d.id);
                    const pinEl = e.currentTarget;
                    pinEl.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => {
                  if (mode === 'move' && draggingDeskId === d.id && mapRef.current) {
                    const rect = mapRef.current.getBoundingClientRect();
                    const currentX = Math.min(
                      99,
                      Math.max(1, ((e.clientX - rect.left) / rect.width) * 100)
                    );
                    const currentY = Math.min(
                      99,
                      Math.max(1, ((e.clientY - rect.top) / rect.height) * 100)
                    );
                    onMoveDesk(
                      d.id,
                      Math.round(currentX * 10) / 10,
                      Math.round(currentY * 10) / 10
                    );
                  }
                }}
                onPointerUp={() => {
                  if (draggingDeskId === d.id) {
                    setDraggingDeskId(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode !== 'move') {
                    onSelectDesk(d);
                  }
                }}
              >
                <UserIcon
                  style={{ width: `${Math.max(8, effectivePinSize * 0.65)}px`, height: `${Math.max(8, effectivePinSize * 0.65)}px` }}
                  className="pointer-events-none stroke-[2.5]"
                />

                {/* Name Tag (Tên gọi - từ cuối cùng của Họ và Tên) với góc xoay 0° - 360° */}
                {shortName && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 pointer-events-none z-15 select-none">
                    <div
                      style={{
                        transform: `rotate(${d.rotation || 0}deg)`,
                        transformOrigin: 'center',
                      }}
                      className="inline-block transition-transform duration-150"
                    >
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/95 text-slate-800 font-bold text-[10px] sm:text-[11px] shadow-sm border border-slate-300/90 leading-tight whitespace-nowrap backdrop-blur-2xs">
                        {shortName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                  <div className="bg-slate-900/95 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap backdrop-blur-xs border border-slate-700/60 leading-tight">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="font-mono text-blue-300">{d.id}</span>
                      <span>{d.name || <i className="text-amber-400 font-normal">(Bàn trống)</i>}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                      <span className="font-medium text-emerald-300">{d.dept}</span>
                      {d.note && <span>· {d.note}</span>}
                    </div>
                  </div>
                  {/* Tooltip triangle arrow */}
                  <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Missing Image Fallback Notification Box */}
      {imageError && (
        <div className="absolute inset-8 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-2xl border-2 border-dashed border-blue-300 p-8 text-center max-w-md mx-auto my-auto shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            Nạp ảnh mặt bằng "Rohto New Layout - June 2026"
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Chọn tệp ảnh <b>Rohto New Layout - June 2026.png/jpg</b> từ máy tính của bạn để hiển thị làm nền sơ đồ văn phòng.
          </p>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer transition-all">
            <FolderOpen className="w-4 h-4" />
            <span>Chọn file ảnh mặt bằng</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Floating Figma-like Navigation Guide (Bottom-Left) */}
      <div className="canvas-ui-btn absolute bottom-4 left-4 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-md text-[11px] text-slate-600 flex items-center gap-2 pointer-events-none">
        <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>
          <b>Lăn chuột:</b> Zoom tại con trỏ · <b>Kéo nền trống:</b> Di chuyển · <b>Giữ Space:</b> Kéo trượt bản đồ
        </span>
      </div>

      {/* Floating Figma-style Zoom Controls (Bottom-Right) */}
      <div className="canvas-ui-btn absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex items-center gap-1 text-white z-40">
        <button
          type="button"
          onClick={() => zoomByStep(0.85)}
          className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-slate-300 hover:text-white"
          title="Thu nhỏ sơ đồ (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPanX(40);
            setPanY(40);
          }}
          className="px-2 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-xs font-mono font-bold text-blue-300 hover:text-white"
          title="Click để đặt lại 100%"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => zoomByStep(1.18)}
          className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-slate-300 hover:text-white"
          title="Phóng to sơ đồ (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={fitCanvas}
          className="px-2 h-7 rounded-lg hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer text-xs font-semibold text-slate-300 hover:text-white"
          title="Căn chỉnh vừa khung nhìn (Fit to screen)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </button>
      </div>
    </div>
  );
};
