import { Desk, Site, User } from './types';

export const DEFAULT_DEPTS: string[] = [
  'Sale',
  'Marketing',
  'Admin',
  'Market Develop',
  'Finance',
];

export const ALLOWED_DEPTS = DEFAULT_DEPTS;

// Bộ màu cố định cho các phòng ban truyền thống
export const DEPT_THEMES: Record<
  string,
  {
    name: string;
    bg: string;
    lightBg: string;
    text: string;
    border: string;
    accent: string;
  }
> = {
  Sale: {
    name: 'Sale',
    bg: 'bg-blue-600',
    lightBg: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-700',
    border: 'border-blue-500',
    accent: '#2563eb',
  },
  Marketing: {
    name: 'Marketing',
    bg: 'bg-emerald-600',
    lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-500',
    accent: '#059669',
  },
  Admin: {
    name: 'Admin',
    bg: 'bg-amber-600',
    lightBg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-500',
    accent: '#d97706',
  },
  'Market Develop': {
    name: 'Market Develop',
    bg: 'bg-rose-600',
    lightBg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    border: 'border-rose-500',
    accent: '#e11d48',
  },
  Finance: {
    name: 'Finance',
    bg: 'bg-sky-600',
    lightBg: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'text-sky-700',
    border: 'border-sky-500',
    accent: '#0284c7',
  },
};

// Bảng màu bổ trợ luân phiên cho các phòng ban mới được thêm vào Site (VD: QC, R&D, Logistics...)
const EXTENDED_PALETTES = [
  {
    bg: 'bg-purple-600',
    lightBg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-500',
    accent: '#9333ea',
  },
  {
    bg: 'bg-teal-600',
    lightBg: 'bg-teal-50 text-teal-700 border-teal-200',
    text: 'text-teal-700',
    border: 'border-teal-500',
    accent: '#0d9488',
  },
  {
    bg: 'bg-indigo-600',
    lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-500',
    accent: '#4f46e5',
  },
  {
    bg: 'bg-orange-600',
    lightBg: 'bg-orange-50 text-orange-700 border-orange-200',
    text: 'text-orange-700',
    border: 'border-orange-500',
    accent: '#ea580c',
  },
  {
    bg: 'bg-cyan-600',
    lightBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    border: 'border-cyan-500',
    accent: '#0891b2',
  },
  {
    bg: 'bg-pink-600',
    lightBg: 'bg-pink-50 text-pink-700 border-pink-200',
    text: 'text-pink-700',
    border: 'border-pink-500',
    accent: '#db2777',
  },
];

export const getDeptTheme = (dept: string) => {
  if (DEPT_THEMES[dept]) {
    return DEPT_THEMES[dept];
  }
  // Băm tên phòng ban để chọn màu nhất quán
  let hash = 0;
  for (let i = 0; i < dept.length; i++) {
    hash = (hash << 5) - hash + dept.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % EXTENDED_PALETTES.length;
  const palette = EXTENDED_PALETTES[index];
  return {
    name: dept,
    ...palette,
  };
};

/**
 * Chuẩn hóa kiểu dữ liệu số an toàn (Number Parsing)
 * Tự động loại bỏ các chuỗi dính "px", "deg", "%", khoảng trắng,
 * ngăn chặn NaN hoặc undefined gây sai lệch lưới subpixel CSS.
 */
export function parseCleanNumber(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.-]/g, '');
    if (!cleaned) return fallback;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export const DEFAULT_USERS: User[] = [
  { username: 'admin', password: 'Rohto@admin', role: 'admin' },
];

export const MAIN_SITE_NAME = 'Rohto New Layout - June 2026';

export const DEFAULT_SITES: Site[] = [
  {
    id: 'site-rohto-main',
    name: MAIN_SITE_NAME,
    mapImage: 'Rohto New Layout - June 2026.png',
    description: 'Trụ sở văn phòng chính',
    departments: ['Sale', 'Marketing', 'Admin', 'Market Develop', 'Finance'],
    pinSize: 13,
  },
];

export const DEFAULT_DESKS: Desk[] = [
  // 1. SALE (Left wing)
  {
    id: 'SALE-01',
    name: 'Nguyễn Văn An',
    dept: 'Sale',
    empCode: 'RMV-0101',
    title: 'Sales Manager',
    site: MAIN_SITE_NAME,
    x: 25.5,
    y: 22.0,
  },
  {
    id: 'SALE-02',
    name: 'Trần Thị Bình',
    dept: 'Sale',
    empCode: 'RMV-0102',
    title: 'Senior Sales Executive',
    site: MAIN_SITE_NAME,
    x: 22.0,
    y: 28.5,
  },
  {
    id: 'SALE-03',
    name: '',
    dept: 'Sale',
    empCode: '',
    title: 'Chỗ trống dự phòng',
    site: MAIN_SITE_NAME,
    x: 18.5,
    y: 35.0,
  },
  {
    id: 'SALE-04',
    name: 'Lê Hoàng Cường',
    dept: 'Sale',
    empCode: 'RMV-0104',
    title: 'Account Executive',
    site: MAIN_SITE_NAME,
    x: 26.5,
    y: 35.5,
  },
  {
    id: 'SALE-05',
    name: 'Phạm Hồng Dung',
    dept: 'Sale',
    empCode: 'RMV-0105',
    title: 'Sales Administrator',
    site: MAIN_SITE_NAME,
    x: 22.5,
    y: 42.0,
  },
  {
    id: 'SALE-06',
    name: 'Đặng Tuấn Em',
    dept: 'Sale',
    empCode: 'RMV-0106',
    title: 'Channel Specialist',
    site: MAIN_SITE_NAME,
    x: 19.0,
    y: 46.5,
  },
  {
    id: 'SALE-07',
    name: 'Vũ Quốc Hưng',
    dept: 'Sale',
    empCode: 'RMV-0107',
    title: 'Key Account Manager',
    site: MAIN_SITE_NAME,
    x: 27.5,
    y: 52.0,
  },
  {
    id: 'SALE-08',
    name: '',
    dept: 'Sale',
    empCode: '',
    title: 'Bàn chờ nhân sự mới',
    site: MAIN_SITE_NAME,
    x: 30.0,
    y: 56.5,
  },

  // 2. MARKETING (Bottom-Left wing)
  {
    id: 'MKT-01',
    name: 'Võ Mai Hương',
    dept: 'Marketing',
    empCode: 'RMV-0201',
    title: 'Marketing Director',
    site: MAIN_SITE_NAME,
    x: 34.5,
    y: 67.5,
  },
  {
    id: 'MKT-02',
    name: 'Hoàng Anh Kiệt',
    dept: 'Marketing',
    empCode: 'RMV-0202',
    title: 'Senior Brand Manager',
    site: MAIN_SITE_NAME,
    x: 38.5,
    y: 73.5,
  },
  {
    id: 'MKT-03',
    name: 'Đỗ Thùy Linh',
    dept: 'Marketing',
    empCode: 'RMV-0203',
    title: 'Digital Marketing Lead',
    site: MAIN_SITE_NAME,
    x: 42.5,
    y: 79.5,
  },
  {
    id: 'MKT-04',
    name: 'Nguyễn Minh Nhật',
    dept: 'Marketing',
    empCode: 'RMV-0204',
    title: 'Content Creator',
    site: MAIN_SITE_NAME,
    x: 45.0,
    y: 84.5,
  },
  {
    id: 'MKT-05',
    name: '',
    dept: 'Marketing',
    empCode: '',
    title: 'Thực tập sinh Marketing',
    site: MAIN_SITE_NAME,
    x: 38.0,
    y: 80.0,
  },
  {
    id: 'MKT-06',
    name: 'Phan Gia Phúc',
    dept: 'Marketing',
    empCode: 'RMV-0206',
    title: 'Graphic Designer',
    site: MAIN_SITE_NAME,
    x: 41.5,
    y: 87.0,
  },

  // 3. ADMIN (Bottom-Right wing)
  {
    id: 'ADM-01',
    name: 'Nguyễn Trọng Liêm',
    dept: 'Admin',
    empCode: 'RMV-0888',
    title: 'IT System Admin',
    site: MAIN_SITE_NAME,
    x: 62.5,
    y: 74.0,
  },
  {
    id: 'ADM-02',
    name: 'Lý Kim Ngân',
    dept: 'Admin',
    empCode: 'RMV-0302',
    title: 'HR Specialist',
    site: MAIN_SITE_NAME,
    x: 58.5,
    y: 84.5,
  },
  {
    id: 'ADM-03',
    name: 'Trịnh Văn Phát',
    dept: 'Admin',
    empCode: 'RMV-0303',
    title: 'Office Facility Manager',
    site: MAIN_SITE_NAME,
    x: 63.5,
    y: 87.5,
  },
  {
    id: 'ADM-04',
    name: '',
    dept: 'Admin',
    empCode: '',
    title: 'Bàn lễ tân / Hành chính',
    site: MAIN_SITE_NAME,
    x: 55.0,
    y: 75.0,
  },
  {
    id: 'ADM-05',
    name: 'Chu Thu Quỳnh',
    dept: 'Admin',
    empCode: 'RMV-0305',
    title: 'C&B Executive',
    site: MAIN_SITE_NAME,
    x: 58.0,
    y: 91.0,
  },

  // 4. MARKET DEVELOP (Middle-Right wing)
  {
    id: 'MDEV-01',
    name: 'Bùi Quang Sơn',
    dept: 'Market Develop',
    empCode: 'RMV-0401',
    title: 'Head of Market Develop',
    site: MAIN_SITE_NAME,
    x: 71.0,
    y: 55.0,
  },
  {
    id: 'MDEV-02',
    name: 'Dương Yến Thảo',
    dept: 'Market Develop',
    empCode: 'RMV-0402',
    title: 'Market Research Specialist',
    site: MAIN_SITE_NAME,
    x: 73.5,
    y: 59.5,
  },
  {
    id: 'MDEV-03',
    name: '',
    dept: 'Market Develop',
    empCode: '',
    title: 'Bàn thực tập sinh R&D',
    site: MAIN_SITE_NAME,
    x: 75.5,
    y: 64.0,
  },
  {
    id: 'MDEV-04',
    name: 'Cao Hữu Thịnh',
    dept: 'Market Develop',
    empCode: 'RMV-0404',
    title: 'Business Analyst',
    site: MAIN_SITE_NAME,
    x: 69.0,
    y: 61.5,
  },

  // 5. FINANCE (Top-Right wing)
  {
    id: 'FIN-01',
    name: 'Tạ Minh Uyên',
    dept: 'Finance',
    empCode: 'RMV-0501',
    title: 'Chief Accountant',
    site: MAIN_SITE_NAME,
    x: 77.0,
    y: 46.5,
  },
  {
    id: 'FIN-02',
    name: 'Hồ Bảo Vân',
    dept: 'Finance',
    empCode: 'RMV-0502',
    title: 'Senior Tax Accountant',
    site: MAIN_SITE_NAME,
    x: 79.5,
    y: 42.0,
  },
  {
    id: 'FIN-03',
    name: 'Phạm Đức Vinh',
    dept: 'Finance',
    empCode: 'RMV-0503',
    title: 'Internal Auditor',
    site: MAIN_SITE_NAME,
    x: 82.5,
    y: 37.0,
  },
  {
    id: 'FIN-04',
    name: '',
    dept: 'Finance',
    empCode: '',
    title: 'Bàn kiểm toán viên độc lập',
    site: MAIN_SITE_NAME,
    x: 84.5,
    y: 33.0,
  },
];

export const STORAGE_KEYS = {
  SESSION: 'rohto_seating_session_v3',
  LOGIN_TIME: 'rohto_seating_login_time',
  LAST_ACTIVITY: 'rohto_seating_last_activity',
};

// Thời gian hiệu lực phiên làm việc: 60 phút (3600 giây = 3.600.000 ms)
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

/**
 * Trích xuất từ cuối cùng trong chuỗi Họ và Tên nhân viên (VD: "Nguyễn Trọng Liêm" -> "Liêm")
 */
export function getShortName(fullName?: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1] || '';
}
