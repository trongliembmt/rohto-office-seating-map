import { Desk } from '../types';

/**
 * Hàm chuẩn hóa duy nhất toàn hệ thống cho mọi object bàn (Desk)
 * Đảm bảo dữ liệu luôn đúng kiểu Number, chuỗi Unicode NFC chuẩn,
 * loại bỏ customSize cũ và các trường undefined.
 */
export function sanitizeDeskData(desk: any): Desk {
  if (!desk) {
    return {
      id: '',
      site: 'Rohto New Layout - June 2026',
      siteId: 'Rohto New Layout - June 2026',
      name: '',
      employeeName: '',
      dept: 'Sale',
      department: 'Sale',
      empCode: '',
      employeeCode: '',
      title: '',
      note: '',
      status: 'empty',
      x: 50,
      y: 50,
      fontSize: 13,
      rotation: 0,
      updatedAt: Date.now(),
    };
  }

  // 1. Cỡ chữ (fontSize) chuẩn số nguyên từ 2px đến 32px (fallback 13px)
  const rawSize = desk.fontSize ?? desk.customSize ?? 13;
  const numSize = Number(rawSize);
  const cleanFontSize = isNaN(numSize) || numSize < 2 ? 13 : Math.min(32, Math.round(numSize));

  // 2. Góc xoay (rotation) chuẩn số nguyên từ 0 đến 359 độ (fallback 0)
  const rawRotation = desk.rotation ?? 0;
  const numRotation = Number(rawRotation);
  const cleanRotation = isNaN(numRotation) ? 0 : Math.round(((numRotation % 360) + 360) % 360);

  // 3. Chuẩn hóa chuỗi tiếng Việt Unicode NFC và khoảng trắng
  const cleanName = String(desk.name ?? desk.employeeName ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanEmpCode = String(desk.empCode ?? desk.employeeCode ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanDept = String(desk.dept ?? desk.department ?? 'Sale')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanTitle = String(desk.title ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanNote = String(desk.note ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanSite = String(desk.site ?? desk.siteId ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim() || 'Rohto New Layout - June 2026';

  const cleanSiteId = String(desk.siteId ?? desk.site ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim() || cleanSite;

  // 4. Tọa độ x, y làm tròn 2 chữ số thập phân
  const rawX = Number(desk.x ?? 50);
  const rawY = Number(desk.y ?? 50);
  const cleanX = Number(Number(isNaN(rawX) ? 50 : rawX).toFixed(2));
  const cleanY = Number(Number(isNaN(rawY) ? 50 : rawY).toFixed(2));

  return {
    id: String(desk.id || '').trim(),
    siteId: cleanSiteId,
    site: cleanSite,
    employeeName: cleanName,
    name: cleanName,
    employeeCode: cleanEmpCode,
    empCode: cleanEmpCode,
    department: cleanDept || 'Sale',
    dept: cleanDept || 'Sale',
    title: cleanTitle,
    note: cleanNote,
    status: cleanName ? 'occupied' : 'empty',
    x: cleanX,
    y: cleanY,
    fontSize: cleanFontSize,
    rotation: cleanRotation,
    updatedAt: typeof desk.updatedAt === 'number' ? desk.updatedAt : Date.now(),
  };
}
