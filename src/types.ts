export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  username: string;
  password?: string;
  role: UserRole;
}

export type Department = string;

export interface Desk {
  id: string; // Mã số bàn (VD: SALE-01)
  name: string; // Họ và tên nhân viên
  dept: Department; // Phòng ban (thuộc Site)
  empCode?: string; // Mã nhân viên (VD: RMV-0123)
  title?: string; // Chức vụ (VD: Sales Manager)
  site: string; // Tên Site / Chi nhánh (VD: "Rohto New Layout - June 2026")
  note?: string; // Ghi chú bổ sung
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  fontSize?: number | null; // Cỡ chữ riêng của nhãn tên bàn này (2px - 32px, mặc định 13px)
  customSize?: number | null; // Kích thước cũ (giữ tương thích)
  rotation?: number; // Góc xoay chữ tên nhân viên (0 - 360 độ)
  employeeName?: string; // Alias tương thích ngược
  employeeCode?: string; // Alias tương thích ngược
  department?: string; // Alias tương thích ngược
  siteId?: string; // Alias tương thích ngược
  status?: 'occupied' | 'empty'; // Trạng thái bàn
  updatedAt?: number; // Timestamp cập nhật
}

export interface Site {
  id: string;
  name: string;
  mapImage: string;
  description?: string;
  departments: string[]; // Danh sách các phòng ban độc lập của từng Site
  pinSize?: number; // Kích thước icon mặc định của riêng Site này (px)
}

export type InteractionMode = 'cursor' | 'add' | 'move';
