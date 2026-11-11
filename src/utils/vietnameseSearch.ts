import { Desk } from '../types';

/**
 * Chuẩn hóa chuỗi tiếng Việt:
 * 1. Chuyển Unicode về chuẩn NFC (precomposed).
 * 2. Thay thế non-breaking spaces (\u00A0) thành khoảng trắng thường.
 * 3. Chuyển về chữ thường (toLowerCase).
 * 4. Gộp nhiều khoảng trắng liên tiếp thành 1 và trim 2 đầu.
 */
export function normalizeText(str: string = ''): string {
  return String(str || '')
    .normalize('NFC')
    .replace(/\u00A0/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tương thích alias: normalizeSearchText
 */
export const normalizeSearchText = normalizeText;

/**
 * Loại bỏ toàn bộ dấu tiếng Việt:
 * 1. Chuyển Unicode về dạng NFD (decomposed) để tách dấu khỏi ký tự gốc.
 * 2. Xóa các combining diacritical marks (\u0300-\u036f).
 * 3. Chuyển 'đ' / 'Đ' thành 'd' / 'D'.
 * 4. Chuyển về chữ thường và chuẩn hóa khoảng trắng.
 */
export function removeAccents(str: string = ''): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\u00A0/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tương thích alias: removeVietnameseTones
 */
export const removeVietnameseTones = removeAccents;

/**
 * Tìm kiếm thông minh theo cụm từ và từng từ đơn lẻ (Hỗ trợ cả có dấu NFC và không dấu):
 */
export function matchSearch(targetText: string = '', searchTerm: string = ''): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;

  const cleanQuery = normalizeText(searchTerm);
  const unaccentedQuery = removeAccents(searchTerm);

  if (!cleanQuery) return true;

  const cleanTarget = normalizeText(targetText);
  const unaccentedTarget = removeAccents(targetText);

  // 1. Khớp chính xác cụm từ nguyên vẹn (có dấu hoặc không dấu)
  if (cleanTarget.includes(cleanQuery) || unaccentedTarget.includes(unaccentedQuery)) {
    return true;
  }

  // 2. Tách từ khóa thành các từ đơn lẻ
  const unaccentedWords = unaccentedQuery.split(' ').filter(Boolean);
  const cleanWords = cleanQuery.split(' ').filter(Boolean);

  // Hỗ trợ gõ không dấu nhiều từ (ví dụ "thao vy" hoặc "vy thao" đều tìm ra "Thảo Vy")
  if (unaccentedWords.length > 0 && unaccentedWords.every((word) => unaccentedTarget.includes(word))) {
    return true;
  }

  // Hỗ trợ gõ có dấu nhiều từ (ví dụ "vy thảo" tìm ra "Thảo Vy")
  if (cleanWords.length > 0 && cleanWords.every((word) => cleanTarget.includes(word))) {
    return true;
  }

  return false;
}

/**
 * Kiểm tra xem một đối tượng Desk (Chỗ ngồi) có khớp với từ khóa tìm kiếm hay không:
 */
export function isDeskMatchSearch(desk: Desk, searchTerm: string = ''): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;

  // Gộp tất cả các trường thông tin cần tìm kiếm của bàn thành 1 chuỗi tổng hợp
  const fullInfo = `${desk.name || ''} ${desk.empCode || ''} ${desk.id || ''} ${desk.dept || ''} ${desk.title || ''} ${desk.note || ''} ${desk.site || ''}`;

  return matchSearch(fullInfo, searchTerm);
}
