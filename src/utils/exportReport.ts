import * as XLSX from 'xlsx';
import { Desk, Site } from '../types';

export interface FormattedReportRow {
  Site: string;
  'Họ và tên nhân viên': string;
  'Phòng Ban': string;
  'Mã nhân viên': string;
  'Chức vụ': string;
  'Mã số bàn': string;
  'Tọa độ X (%)': number;
  'Tọa độ Y (%)': number;
}

// Hàm chuẩn hóa dữ liệu thành các dòng báo cáo chuẩn
export const formatReportData = (desksList: Desk[]): FormattedReportRow[] => {
  return desksList.map((desk) => ({
    Site: desk.site || 'Rohto Default',
    'Họ và tên nhân viên': desk.name || '(Bàn trống)',
    'Phòng Ban': desk.dept || '',
    'Mã nhân viên': desk.empCode || '',
    'Chức vụ': desk.title || desk.note || '',
    'Mã số bàn': desk.id || '',
    'Tọa độ X (%)': Math.round(desk.x * 10) / 10,
    'Tọa độ Y (%)': Math.round(desk.y * 10) / 10,
  }));
};

const COLS_CONFIG = [
  { wch: 25 }, // Site
  { wch: 25 }, // Họ và tên
  { wch: 18 }, // Phòng Ban
  { wch: 15 }, // Mã NV
  { wch: 22 }, // Chức vụ
  { wch: 14 }, // Mã số bàn
  { wch: 14 }, // Tọa độ X
  { wch: 14 }, // Tọa độ Y
];

// Hàm làm sạch tên sheet để phù hợp tiêu chuẩn Microsoft Excel (<= 31 ký tự, không chứa ký tự đặc biệt)
const getSafeSheetName = (name: string, fallback: string): string => {
  const safe = name.replace(/[\\/?*[\]:]/g, '_').trim();
  return (safe || fallback).slice(0, 30);
};

// 1. Xuất file Excel (.xlsx) cho Site hiện tại
export const exportCurrentSiteToExcel = (
  currentSite: Site,
  siteDesks: Desk[],
  fileName?: string
) => {
  const safeSiteName = getSafeSheetName(currentSite.name, 'Site_Report');
  const timestamp = new Date().toISOString().slice(0, 10);
  const finalFileName =
    fileName || `Report_ChoNgoi_${safeSiteName}_${timestamp}.xlsx`;

  const data = formatReportData(siteDesks);
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = COLS_CONFIG;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSiteName);

  XLSX.writeFile(workbook, finalFileName);
};

// 2. Xuất file Excel (.xlsx) tổng hợp TẤT CẢ các Site:
// Gồm Sheet 1 là bảng tổng hợp tất cả, kèm các sheet con độc lập cho từng Site
export const exportAllSitesToExcel = (
  allSites: Site[],
  allDesks: Desk[],
  fileName?: string
) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  const finalFileName =
    fileName || `Report_ChoNgoi_TongHop_TatCa_Sites_${timestamp}.xlsx`;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Master Sheet tổng hợp toàn bộ các Site
  const masterData = formatReportData(allDesks);
  const masterWorksheet = XLSX.utils.json_to_sheet(masterData);
  masterWorksheet['!cols'] = COLS_CONFIG;
  XLSX.utils.book_append_sheet(workbook, masterWorksheet, 'TongHop_TatCa');

  // Sheet 2, 3, ...: Sheet con cho từng Site độc lập
  const usedSheetNames = new Set<string>(['TongHop_TatCa']);

  allSites.forEach((site) => {
    let sheetName = getSafeSheetName(site.name, 'Site');
    // Tránh trùng tên sheet
    if (usedSheetNames.has(sheetName)) {
      sheetName = `${sheetName.slice(0, 26)}_${Math.floor(Math.random() * 89 + 10)}`;
    }
    usedSheetNames.add(sheetName);

    const siteDesks = allDesks.filter(
      (d) => d.site === site.name || (!d.site && site.id === 'site-rohto-main')
    );
    const siteData = formatReportData(siteDesks);
    const siteWorksheet = XLSX.utils.json_to_sheet(siteData);
    siteWorksheet['!cols'] = COLS_CONFIG;

    XLSX.utils.book_append_sheet(workbook, siteWorksheet, sheetName);
  });

  XLSX.writeFile(workbook, finalFileName);
};

// 3. Xuất file CSV (với BOM UTF-8 để mở tiếng Việt có dấu chuẩn 100% trong Excel)
export const exportDesksToCSV = (desksList: Desk[], fileName: string) => {
  const data = formatReportData(desksList);
  const headers: (keyof FormattedReportRow)[] = [
    'Site',
    'Họ và tên nhân viên',
    'Phòng Ban',
    'Mã nhân viên',
    'Chức vụ',
    'Mã số bàn',
    'Tọa độ X (%)',
    'Tọa độ Y (%)',
  ];

  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map(
          (fieldName) =>
            `"${String(row[fieldName] ?? '').replace(/"/g, '""')}"`
        )
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
