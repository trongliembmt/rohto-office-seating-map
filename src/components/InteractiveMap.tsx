import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Department, Desk, InteractionMode } from '../types';
import { getDeptTheme, getShortName } from '../constants';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  HelpCircle,
  FolderOpen,
  X,
  Crosshair,
  Edit3,
  RotateCw,
  Type,
} from 'lucide-react';

export interface InteractiveMapProps {
  desks: Desk[];
  mode: InteractionMode;
  canEdit: boolean;
  pinSize?: number;
  searchQuery: string;
  selectedDept: Department | 'all';
  selectedDeskId: string | null;
  targetDeskToFocus?: { desk: Desk; timestamp: number } | null;
  onSelectDesk: (desk: Desk | null) => void;
  onDeselectDesk?: () => void;
  onDoubleClickDesk?: (desk: Desk) => void;
  onAddDeskAt: (x: number, y: number) => void;
  onMoveDesk: (deskId: string, x: number, y: number) => void;
  onMoveDeskEnd?: (deskId: string, x: number, y: number) => void;
  onRotateDesk?: (deskId: string, newRotation: number) => void;
  onChangeDeskFontSize?: (deskId: string, newSize: number) => void;
  onOpenDeskModal?: (desk: Desk) => void;
  customBgUrl: string | null;
  onUploadImage: (file: File) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  desks,
  mode,
  canEdit,
  pinSize = 13,
  searchQuery,
  selectedDept,
  selectedDeskId,
  targetDeskToFocus,
  onSelectDesk,
  onDeselectDesk,
  onDoubleClickDesk,
  onAddDeskAt,
  onMoveDesk,
  onMoveDeskEnd,
  onRotateDesk,
  onChangeDeskFontSize,
  onOpenDeskModal,
  customBgUrl,
  onUploadImage,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<{ deskId: string; time: number } | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Natural image dimensions (độ phân giải gốc 1:1, không bị kéo ép CSS)
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 2000,
    height: 1414,
  });

  // Figma-like pan & zoom state
  const [scale, setScale] = useState<number>(0.65);
  const [panX, setPanX] = useState<number>(20);
  const [panY, setPanY] = useState<number>(20);

  // Smooth transition animation state (only enabled for programmatic zoom to user)
  const [isSmoothAnimating, setIsSmoothAnimating] = useState<boolean>(false);

  // Dragging / Panning state (for map stage)
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  // Moving desk pin state (360-degree, scale-aware fluid drag)
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [liveDragPos, setLiveDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStateRef = useRef<{
    deskId: string;
    initialDeskX: number;
    initialDeskY: number;
    startClientX: number;
    startClientY: number;
    scale: number;
    mapWidth: number;
    mapHeight: number;
    lastCalculatedX: number;
    lastCalculatedY: number;
  } | null>(null);

  // Multi-touch gestures tracking (Pinch-to-zoom & Touch pan on iPad / Mobile)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    scale: number;
    midX: number;
    midY: number;
    panX: number;
    panY: number;
  } | null>(null);

  // Image source resolution
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

  // Handle image load to detect Natural Resolution
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setImageError(false);
    }
  };

  // Image error fallback sequence
  const handleImageError = () => {
    if (imgSrc.includes('.png')) {
      setImgSrc('Rohto New Layout - June 2026.jpg');
    } else if (imgSrc.includes('.jpg')) {
      setImgSrc('/rohto-layout-default.svg');
    } else {
      setImageError(true);
    }
  };

  // Fit natural map dimensions into viewport
  const fitCanvas = useCallback(() => {
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const mapW = naturalDimensions.width;
    const mapH = naturalDimensions.height;

    const scaleX = (vRect.width - 50) / mapW;
    const scaleY = (vRect.height - 50) / mapH;
    const targetScale = Math.min(1.0, Math.max(0.25, Math.min(scaleX, scaleY)));

    const targetPanX = Math.max(10, (vRect.width - mapW * targetScale) / 2);
    const targetPanY = Math.max(10, (vRect.height - mapH * targetScale) / 2);

    setIsSmoothAnimating(true);
    setScale(targetScale);
    setPanX(targetPanX);
    setPanY(targetPanY);
  }, [naturalDimensions]);

  // Zoom and pan to a specific desk, placing it at the exact viewport center with scale = 2.2
  const zoomToDesk = useCallback((desk: Desk, targetZoom = 2.2) => {
    if (!viewportRef.current) return;
    const vRect = viewportRef.current.getBoundingClientRect();
    const vWidth = vRect.width;
    const vHeight = vRect.height;
    const mapW = naturalDimensions.width;
    const mapH = naturalDimensions.height;

    // Calculate pixel coordinates of desk on 1:1 natural map
    const deskPixelX = (desk.x / 100) * mapW;
    const deskPixelY = (desk.y / 100) * mapH;

    const targetScale = Math.min(4.0, Math.max(0.4, targetZoom));

    // Calculate panX & panY to center the desk in viewport center
    const targetPanX = (vWidth / 2) - (deskPixelX * targetScale);
    const targetPanY = (vHeight / 2) - (deskPixelY * targetScale);

    setIsSmoothAnimating(true);
    setScale(targetScale);
    setPanX(targetPanX);
    setPanY(targetPanY);
  }, [naturalDimensions]);

  // Automatically trigger smooth zoom & pan when targetDeskToFocus updates
  useEffect(() => {
    if (targetDeskToFocus?.desk) {
      zoomToDesk(targetDeskToFocus.desk, 2.2);
    }
  }, [targetDeskToFocus, zoomToDesk]);

  // Initial fit
  useEffect(() => {
    const timer = setTimeout(fitCanvas, 150);
    window.addEventListener('resize', fitCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', fitCanvas);
    };
  }, [fitCanvas]);

  // Spacebar detection for panning
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

  // 360-degree scale-aware dragging listener for pin movement (No lag, No 8-directional constraint)
  useEffect(() => {
    if (!activeDragId) return;

    let rafId: number | null = null;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      // 1. Delta in real physical screen pixels:
      const deltaClientX = e.clientX - ds.startClientX;
      const deltaClientY = e.clientY - ds.startClientY;

      // 2. Exact coordinate conversion accounting for Figma zoom scale:
      const deltaMapPxX = deltaClientX / ds.scale;
      const deltaMapPxY = deltaClientY / ds.scale;

      // 3. Convert to map percentage (0 - 100%):
      const deltaPercentX = (deltaMapPxX / ds.mapWidth) * 100;
      const deltaPercentY = (deltaMapPxY / ds.mapHeight) * 100;

      // 4. Calculate high-precision 360-degree continuous floating-point coordinates:
      const nextX = Math.min(99.6, Math.max(0.4, ds.initialDeskX + deltaPercentX));
      const nextY = Math.min(99.6, Math.max(0.4, ds.initialDeskY + deltaPercentY));

      ds.lastCalculatedX = nextX;
      ds.lastCalculatedY = nextY;

      // 5. Update position with requestAnimationFrame for 60fps/120fps fluid motion
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setLiveDragPos({ id: ds.deskId, x: nextX, y: nextY });
        onMoveDesk(ds.deskId, nextX, nextY);
      });
    };

    const handleWindowPointerUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      const ds = dragStateRef.current;
      if (ds) {
        // Commit final position (clean 2-decimal rounded for persistent storage)
        const finalX = Math.round(ds.lastCalculatedX * 100) / 100;
        const finalY = Math.round(ds.lastCalculatedY * 100) / 100;
        onMoveDesk(ds.deskId, finalX, finalY);
        onMoveDeskEnd?.(ds.deskId, finalX, finalY);
      }
      dragStateRef.current = null;
      setActiveDragId(null);
      setLiveDragPos(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [activeDragId, onMoveDesk, onMoveDeskEnd]);

  // Zoom centered on cursor position (isolated from browser zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Turn off transition immediately for responsive, lag-free wheel zooming
    setIsSmoothAnimating(false);
    if (!viewportRef.current) return;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(4.0, Math.max(0.3, scale * factor));

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Anchor equation: mouse position remains at the exact same spot on drawing
    const newPanX = mouseX - (mouseX - panX) * (newScale / scale);
    const newPanY = mouseY - (mouseY - panY) * (newScale / scale);

    setScale(newScale);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const zoomByStep = (factor: number) => {
    setIsSmoothAnimating(false);
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = Math.min(4.0, Math.max(0.3, scale * factor));
    const newPanX = centerX - (centerX - panX) * (newScale / scale);
    const newPanY = centerY - (centerY - panY) * (newScale / scale);

    setScale(newScale);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  // Pan & Multi-touch Pinch interactions on background viewport
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsSmoothAnimating(false);
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;

    if ((e.target as HTMLElement).closest('.desk-pin, .desk-pill-badge, .desk-pill-item, .canvas-ui-btn, [data-desk-id]')) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2-finger Touch Gesture: Pinch-to-Zoom on iPad & Mobile
    if (activePointersRef.current.size === 2) {
      const points = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const midX = (points[0].x + points[1].x) / 2;
      const midY = (points[0].y + points[1].y) / 2;
      pinchStartRef.current = {
        dist: dist > 0 ? dist : 1,
        scale,
        midX,
        midY,
        panX,
        panY,
      };
      setIsPanning(false);
      return;
    }

    const isMiddle = e.button === 1;
    const isLeft = e.button === 0;

    if (isMiddle || spacePressed || (isLeft && mode !== 'add')) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panX, y: e.clientY - panY });
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerDownPosRef.current) {
      const dist = Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y);
      if (dist > 5) {
        hasMovedRef.current = true;
      }
    }

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Xử lý 2 ngón tay chụm / mở để phóng to thu nhỏ (Pinch-to-Zoom)
    if (activePointersRef.current.size === 2 && pinchStartRef.current && viewportRef.current) {
      const points = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const currentMidX = (points[0].x + points[1].x) / 2;
      const currentMidY = (points[0].y + points[1].y) / 2;

      const { dist: startDist, scale: startScale, midX: startMidX, midY: startMidY, panX: startPanX, panY: startPanY } = pinchStartRef.current;
      if (startDist > 0) {
        const factor = currentDist / startDist;
        const newScale = Math.min(4.0, Math.max(0.25, startScale * factor));

        const rect = viewportRef.current.getBoundingClientRect();
        const originX = startMidX - rect.left;
        const originY = startMidY - rect.top;

        const deltaX = currentMidX - startMidX;
        const deltaY = currentMidY - startMidY;

        const newPanX = originX - (originX - startPanX) * (newScale / startScale) + deltaX;
        const newPanY = originY - (originY - startPanY) * (newScale / startScale) + deltaY;

        setScale(newScale);
        setPanX(newPanX);
        setPanY(newPanY);
      }
      return;
    }

    // Xử lý 1 ngón tay vuốt hoặc kéo chuột trượt bản đồ (Touch Pan)
    if (isPanning && activePointersRef.current.size <= 1) {
      setPanX(e.clientX - startPan.x);
      setPanY(e.clientY - startPan.y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      setIsPanning(false);
    } else if (activePointersRef.current.size === 1) {
      const remaining = Array.from(activePointersRef.current.values())[0];
      setStartPan({ x: remaining.x - panX, y: remaining.y - panY });
      setIsPanning(true);
    }
  };

  // Click vào khoảng trống bản đồ: Thêm bàn nếu mode === 'add', hoặc hủy chọn bàn
  const handleMapClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) return;
    if ((e.target as HTMLElement).closest('.desk-pin, .desk-pill-badge, .desk-pill-item, .canvas-ui-btn, button, input')) return;

    if (mode === 'add' && canEdit && !spacePressed && !isPanning && !activeDragId && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.min(99, Math.max(1, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(99, Math.max(1, ((e.clientY - rect.top) / rect.height) * 100));
      onAddDeskAt(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
      return;
    }

    // Click vào khoảng trống bản đồ để hủy chọn bàn
    if (selectedDeskId && (mode === 'cursor' || mode === 'move')) {
      if (onDeselectDesk) {
        onDeselectDesk();
      } else {
        onSelectDesk(null);
      }
    }
  };

  // Click vào khoảng trống khung viewport (ngoài viền bản đồ) để hủy chọn bàn
  const handleViewportClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) return;
    if ((e.target as HTMLElement).closest('.desk-pin, .desk-pill-badge, .desk-pill-item, .canvas-ui-btn, button, input, [data-desk-id]')) return;
    if (selectedDeskId && (mode === 'cursor' || mode === 'move')) {
      if (onDeselectDesk) {
        onDeselectDesk();
      } else {
        onSelectDesk(null);
      }
    }
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
        (d.empCode && d.empCode.toLowerCase().includes(q)) ||
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.dept && d.dept.toLowerCase().includes(q)) ||
        (d.note && d.note.toLowerCase().includes(q));

      if (matchDept && matchText) {
        matchedIds.add(d.id);
      }
    });
  }

  // Determine cursor
  let cursorClass = 'cursor-grab';
  if (mode === 'add') {
    cursorClass = 'add-mode-active !cursor-crosshair cursor-crosshair';
  } else if (activeDragId || isPanning) {
    cursorClass = 'cursor-grabbing';
  } else if (spacePressed) {
    cursorClass = 'cursor-grab';
  } else if (mode === 'move') {
    cursorClass = 'cursor-default';
  }
  const selectedDesk = desks.find((d) => d.id === selectedDeskId);

  return (
    <div
      ref={viewportRef}
      onClick={handleViewportClick}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: 'none',
        cursor: mode === 'add' ? 'crosshair' : undefined,
      }}
      className={`relative flex-1 h-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner canvas-grid-pattern select-none touch-none ${cursorClass} ${
        mode === 'add' ? 'add-mode-active !cursor-crosshair' : ''
      }`}
    >
      {/* Zoom / Pan Stage */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
          transition: isSmoothAnimating
            ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'none',
        }}
        onTransitionEnd={() => setIsSmoothAnimating(false)}
        className="absolute top-0 left-0"
      >
        {/* Bản đồ hiển thị ở độ phân giải tự nhiên (Natural Resolution 1:1) - Không kéo dãn */}
        <div
          ref={mapRef}
          onClick={handleMapClick}
          style={{
            width: `${naturalDimensions.width}px`,
            height: `${naturalDimensions.height}px`,
            minWidth: `${naturalDimensions.width}px`,
            minHeight: `${naturalDimensions.height}px`,
            cursor: mode === 'add' ? 'crosshair' : undefined,
          }}
          className={`relative bg-white rounded-md shadow-2xl border border-slate-300 ${
            mode === 'add' ? 'add-mode-active !cursor-crosshair' : ''
          }`}
        >
          {/* Ảnh nền mặt bằng với natural resolution */}
          <img
            src={imgSrc}
            alt="Rohto New Layout - June 2026"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              width: `${naturalDimensions.width}px`,
              height: `${naturalDimensions.height}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'block',
              imageRendering: '-webkit-optimize-contrast',
            }}
            className="pointer-events-none select-none"
            draggable={false}
          />

          {/* Interactive Desk Text Badges / Pills (Không còn Icon người - Chỉ hiển thị nhãn chữ) */}
          {desks.map((d) => {
            const isSelected = d.id === selectedDeskId;
            const isMatched = matchedIds.has(d.id);
            const isEmpty = !d.name || !d.name.trim();
            const theme = getDeptTheme(d.dept);
            const shortName = getShortName(d.name);
            const labelText = isEmpty ? d.id : (shortName || d.id);

            // Cỡ chữ & độ lớn nhãn tên: Độc lập 100% cho từng bàn (min 2px, max 32px, mặc định 13px)
            const effectiveFontSize =
              typeof d.fontSize === 'number' && d.fontSize > 0
                ? Math.max(2, Math.min(32, d.fontSize))
                : (typeof d.customSize === 'number' && d.customSize > 0
                    ? Math.max(2, Math.min(32, d.customSize))
                    : 13);

            // Live 360-degree drag coordinates (chống lem subpixel với 2 số thập phân khi đứng yên)
            const isDraggingThis = activeDragId === d.id;
            const rawX = isDraggingThis && liveDragPos ? liveDragPos.x : d.x;
            const rawY = isDraggingThis && liveDragPos ? liveDragPos.y : d.y;
            const displayX = parseFloat(Number(rawX).toFixed(2));
            const displayY = parseFloat(Number(rawY).toFixed(2));

            // Tối ưu kích thước khung nhãn (Badge / Pill Container) khi cỡ chữ cực nhỏ (2px - 8px)
            const isUltraSmall = effectiveFontSize <= 5;
            const isSmall = effectiveFontSize <= 8;

            const padY = isUltraSmall
              ? Math.max(0.5, effectiveFontSize * 0.12)
              : isSmall
              ? Math.max(1, effectiveFontSize * 0.16)
              : Math.max(2, Math.round(effectiveFontSize * 0.22));

            const padX = isUltraSmall
              ? Math.max(1.5, effectiveFontSize * 0.3)
              : isSmall
              ? Math.max(2.5, effectiveFontSize * 0.42)
              : Math.max(5, Math.round(effectiveFontSize * 0.58));

            const borderWidth = isUltraSmall ? '0.75px' : isSmall ? '1px' : '2px';
            const borderRadius = isUltraSmall ? '2px' : isSmall ? '3px' : '6px';
            const ringClass = isUltraSmall
              ? 'ring-1 ring-slate-950'
              : isSmall
              ? 'ring-2 ring-slate-950'
              : 'ring-4 ring-slate-950';

            return (
              <div
                key={d.id}
                data-desk-id={d.id}
                style={{
                  left: `${displayX}%`,
                  top: `${displayY}%`,
                  zIndex: isDraggingThis ? 60 : (isSelected ? 50 : (isMatched ? 30 : 20)),
                  transition: isDraggingThis ? 'none !important' : undefined,
                  willChange: 'left, top',
                  touchAction: 'none',
                  cursor: mode === 'add' ? 'crosshair' : undefined,
                }}
                className={`absolute select-none pointer-events-auto group desk-pin desk-pill-item ${
                  mode === 'add' ? 'add-mode-active !cursor-crosshair' : ''
                }`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (mode === 'move' && canEdit) {
                    e.preventDefault();
                    setIsSmoothAnimating(false);

                    dragStateRef.current = {
                      deskId: d.id,
                      initialDeskX: d.x,
                      initialDeskY: d.y,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      scale,
                      mapWidth: naturalDimensions.width,
                      mapHeight: naturalDimensions.height,
                      lastCalculatedX: d.x,
                      lastCalculatedY: d.y,
                    };

                    setActiveDragId(d.id);
                    setLiveDragPos({ id: d.id, x: d.x, y: d.y });
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mode === 'move' || activeDragId) return;

                  const now = Date.now();
                  const prevClick = clickTimerRef.current;
                  const isQuickDoubleClick =
                    prevClick &&
                    prevClick.deskId === d.id &&
                    now - prevClick.time < 350;

                  if (isQuickDoubleClick) {
                    clickTimerRef.current = null;
                    if (onDoubleClickDesk) {
                      onDoubleClickDesk(d);
                    }
                  } else {
                    clickTimerRef.current = { deskId: d.id, time: now };
                    onSelectDesk(d);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  clickTimerRef.current = null;
                  if (onDoubleClickDesk && !activeDragId) {
                    onDoubleClickDesk(d);
                  }
                }}
              >
                {/* 🏷️ Nhãn chữ (Text Pill / Badge) xoay tròn 360 độ trực tiếp theo góc chiếc bàn */}
                <div
                  style={{
                    transform: `translate3d(-50%, -50%, 0) rotate(${d.rotation || 0}deg)`,
                    transformOrigin: 'center center',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    willChange: 'transform',
                    transformStyle: 'preserve-3d',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'geometricPrecision',
                    fontSize: `${effectiveFontSize}px`,
                    padding: `${padY}px ${padX}px`,
                    borderWidth: borderWidth,
                    borderRadius: borderRadius,
                    lineHeight: 1.1,
                    transition: isDraggingThis ? 'none !important' : 'box-shadow 150ms ease-out',
                    cursor: mode === 'add' ? 'crosshair' : undefined,
                  }}
                  className={`desk-pill-badge font-bold text-center leading-tight whitespace-nowrap border-white/95 backdrop-blur-2xs antialiased transition-all ${
                    isUltraSmall ? 'shadow-2xs' : isSmall ? 'shadow-xs' : 'shadow-md'
                  } ${
                    isDraggingThis
                      ? 'cursor-grabbing ring-2 ring-blue-500 shadow-2xl scale-110 !transition-none'
                      : (mode === 'move'
                          ? 'cursor-grab active:cursor-grabbing hover:scale-105'
                          : (mode === 'add' ? '!cursor-crosshair' : 'cursor-pointer hover:scale-105'))
                  } ${isSelected && !isDraggingThis ? `${ringClass} shadow-xl scale-110` : ''} ${
                    isMatched && !isDraggingThis ? `pin-match-pulse ${ringClass} ring-pink-500 scale-110` : ''
                  } ${
                    isEmpty
                      ? 'bg-amber-500 text-white font-mono'
                      : `${theme.bg} text-white`
                  }`}
                >
                  {labelText}
                </div>

                {/* ℹ️ Hover Tooltip: Tách riêng, LUÔN NẰM NGANG 0° BÌNH THƯỜNG, ẩn khi đang kéo thả */}
                {!isDraggingThis && !activeDragId && (
                  <div
                    style={{
                      transform: 'translate(-50%, -100%)',
                    }}
                    className="absolute bottom-full left-0 mb-2.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-in fade-in duration-100"
                  >
                    <div className="bg-slate-900/95 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap backdrop-blur-xs border border-slate-700/60 leading-tight">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="font-mono text-blue-300">{d.id}</span>
                        <span>{d.name || <i className="text-amber-400 font-normal">(Bàn trống)</i>}</span>
                        {d.empCode && (
                          <span className="font-mono text-[9px] bg-blue-900/90 text-blue-200 px-1 py-0.2 rounded">
                            {d.empCode}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-1">
                        <span className="font-medium text-emerald-300">{d.dept}</span>
                        {(d.title || d.note) && <span>· {d.title || d.note}</span>}
                      </div>
                      <div className="text-[9.5px] text-sky-300 mt-0.5 flex items-center gap-2 font-mono">
                        <span>Cỡ chữ: {effectiveFontSize}px</span>
                        <span>·</span>
                        <span>Góc xoay: {d.rotation || 0}°</span>
                      </div>
                      {canEdit && mode === 'cursor' && (
                        <div className="text-[9.5px] text-amber-300 font-medium mt-1 pt-1 border-t border-slate-700/60 flex items-center gap-1">
                          <span>⚡ Nhấp đúp chuột để chỉnh sửa bàn</span>
                        </div>
                      )}
                      {canEdit && mode === 'move' && (
                        <div className="text-[9.5px] text-blue-300 font-medium mt-1 pt-1 border-t border-slate-700/60 flex items-center gap-1">
                          <span>✋ Nhấn giữ và kéo thả 360° tự do</span>
                        </div>
                      )}
                    </div>
                    {/* Mũi tên tooltip */}
                    <div className="w-2 h-1 bg-slate-900/95 border-b border-r border-slate-700/60 -mt-0.5 rotate-45 transform" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Thông báo nếu chưa tìm thấy ảnh và cho phép chọn file */}
      {imageError && (
        <div className="absolute inset-8 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-2xl border-2 border-dashed border-blue-300 p-8 text-center max-w-md mx-auto my-auto shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            Nạp ảnh mặt bằng "Rohto New Layout - June 2026"
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Chọn tệp ảnh <b>Rohto New Layout - June 2026.png/jpg</b> để hiển thị độ phân giải gốc 1:1 siêu nét.
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

      {/* 🔄 Floating Quick Bar: Thanh điều khiển nổi nhanh tinh gọn (không có chữ rườm rà) */}
      {selectedDesk && (
        <div className="canvas-ui-btn floating-toolbar absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl px-2.5 sm:px-3 py-1.5 shadow-2xl border border-slate-700/80 flex items-center gap-1.5 sm:gap-2 max-w-[96vw] overflow-x-auto whitespace-nowrap animate-in slide-in-from-top-2 duration-200">
          {/* Thông tin bàn đang chọn (Mã bàn - Tên) */}
          <div className="flex items-center gap-1.5 shrink-0 pr-1.5 border-r border-slate-700/80">
            <span className={`w-2 h-2 rounded-full ${getDeptTheme(selectedDesk.dept).bg}`} />
            <span className="font-mono font-bold text-xs text-blue-300">{selectedDesk.id}</span>
            <span className="text-xs font-bold text-white max-w-[70px] sm:max-w-[100px] truncate" title={selectedDesk.name || 'Trống'}>
              {getShortName(selectedDesk.name) || selectedDesk.name || 'Trống'}
            </span>
          </div>

          {/* Xoay: Chỉ icon xoay tròn + ô nhập số độ (ẩn spinner) + thanh trượt */}
          <div className="flex items-center gap-1 shrink-0" title="Xoay hướng chữ">
            <RotateCw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="flex items-center gap-0.5 shrink-0">
              <input
                type="number"
                min={0}
                max={360}
                step={1}
                value={selectedDesk.rotation || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && onRotateDesk) {
                    onRotateDesk(selectedDesk.id, Math.max(0, Math.min(360, val)));
                  }
                }}
                className="w-10 px-1 py-0.5 text-center text-xs font-bold font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 rounded focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 shrink-0"
                title="Nhập góc xoay (0 - 360°)"
              />
              <span className="text-[10px] text-indigo-400 font-bold">°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={selectedDesk.rotation || 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (onRotateDesk) onRotateDesk(selectedDesk.id, val);
              }}
              className="w-16 sm:w-24 md:w-28 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 shrink-0"
              title="Kéo trượt để xoay"
            />
          </div>

          {/* Kích thước: Chỉ icon chữ T + ô số kích thước (ẩn spinner) + thanh trượt */}
          <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-slate-700/80" title="Kích thước chữ">
            <Type className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="flex items-center gap-0.5 shrink-0">
              <input
                type="number"
                min={2}
                max={32}
                step={1}
                value={
                  typeof selectedDesk.fontSize === 'number' && selectedDesk.fontSize > 0
                    ? selectedDesk.fontSize
                    : (typeof selectedDesk.customSize === 'number' && selectedDesk.customSize > 0
                        ? selectedDesk.customSize
                        : 13)
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && onChangeDeskFontSize) {
                    onChangeDeskFontSize(selectedDesk.id, Math.max(2, Math.min(32, val)));
                  }
                }}
                className="w-10 px-1 py-0.5 text-center text-xs font-bold font-mono text-sky-300 bg-sky-950/80 border border-sky-700/60 rounded focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400 shrink-0"
                title="Nhập cỡ chữ (2 - 32)"
              />
              <span className="text-[10px] text-sky-400 font-bold">px</span>
            </div>
            <input
              type="range"
              min={2}
              max={32}
              step={1}
              value={
                typeof selectedDesk.fontSize === 'number' && selectedDesk.fontSize > 0
                  ? selectedDesk.fontSize
                  : (typeof selectedDesk.customSize === 'number' && selectedDesk.customSize > 0
                      ? selectedDesk.customSize
                      : 13)
              }
              onChange={(e) => {
                const val = Number(e.target.value);
                if (onChangeDeskFontSize) onChangeDeskFontSize(selectedDesk.id, val);
              }}
              className="w-14 sm:w-20 md:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 shrink-0"
              title="Kéo trượt cỡ chữ (2 - 32)"
            />
          </div>

          <div className="w-[1px] h-4 bg-slate-700 shrink-0" />

          {/* Nút Sửa / Chi tiết mở DeskModal */}
          <button
            type="button"
            onClick={() => {
              if (onOpenDeskModal) onOpenDeskModal(selectedDesk);
              else if (onDoubleClickDesk) onDoubleClickDesk(selectedDesk);
            }}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
            title="Mở toàn bộ tùy chỉnh chi tiết bàn này"
          >
            <Edit3 className="w-3 h-3" />
            <span>Sửa</span>
          </button>

          {/* Nút Đóng / Bỏ chọn bàn */}
          <button
            type="button"
            onClick={() => {
              if (onDeselectDesk) onDeselectDesk();
              else onSelectDesk(null);
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer shrink-0"
            title="Bỏ chọn bàn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Inspection Card (Khi chạm/chọn bàn trên điện thoại & tablet) */}
      {selectedDesk && (
        <div className="canvas-ui-btn lg:hidden absolute bottom-3 left-3 right-3 z-40 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-3.5 h-3.5 rounded-full ${getDeptTheme(selectedDesk.dept).bg} ring-2 ring-white/30 shrink-0`} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-bold text-blue-300 text-xs">{selectedDesk.id}</span>
                  <span className="text-xs font-bold text-white truncate">
                    {selectedDesk.name || <i className="text-amber-400 font-normal">(Bàn trống)</i>}
                  </span>
                  {selectedDesk.empCode && (
                    <span className="font-mono text-[9px] bg-blue-900/90 text-blue-200 px-1.5 py-0.2 rounded shrink-0">
                      {selectedDesk.empCode}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-emerald-300">{selectedDesk.dept}</span>
                  {(selectedDesk.title || selectedDesk.note) && (
                    <span className="text-slate-400 truncate">· {selectedDesk.title || selectedDesk.note}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onDeselectDesk) onDeselectDesk();
                else onSelectDesk(null);
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
              title="Đóng chi tiết"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions for Selected Desk on Mobile */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => zoomToDesk(selectedDesk, 2.2)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
              <span>Định vị</span>
            </button>
            {canEdit && onDoubleClickDesk && (
              <button
                type="button"
                onClick={() => onDoubleClickDesk(selectedDesk)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa bàn</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Figma-like Navigation Guide & Natural Resolution Indicator (Bottom-Left) */}
      <div className="canvas-ui-btn absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-md text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-1.5 sm:gap-2 pointer-events-none z-20">
        <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="hidden sm:inline">
          <b>Lăn chuột:</b> Zoom · <b>Kéo chuột:</b> Trượt ·{' '}
          {canEdit ? (
            mode === 'move' ? (
              <b className="text-blue-700">Kéo thả bàn 360°</b>
            ) : (
              <b className="text-blue-700">Nhấp đúp: Sửa bàn</b>
            )
          ) : (
            <span>Nhấp để xem thông tin</span>
          )}
        </span>
        <span className="sm:hidden font-medium">
          👆 Chạm để xem · ✌️ 2 ngón zoom / trượt
        </span>
        <span className="hidden md:inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
          {naturalDimensions.width}×{naturalDimensions.height}px Natural
        </span>
      </div>

      {/* Floating Figma-style Zoom Controls (Responsive: Top-Right on mobile, Bottom-Right on desktop) */}
      <div className="canvas-ui-btn absolute top-3 right-3 sm:top-auto sm:bottom-4 sm:right-4 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 sm:p-1.5 shadow-xl flex items-center gap-1 text-white z-30">
        <button
          type="button"
          onClick={() => zoomByStep(0.85)}
          className="w-7 h-7 sm:w-7 sm:h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-slate-300 hover:text-white"
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
          title="Click để đặt lại tỉ lệ 100% (1:1 Natural Pixels)"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => zoomByStep(1.18)}
          className="w-7 h-7 sm:w-7 sm:h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-slate-300 hover:text-white"
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
