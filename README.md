# Rohto Interactive Office Seating Map (June 2026 Layout)

Ứng dụng Web tương tác quản lý sơ đồ chỗ ngồi văn phòng dựa trên bản vẽ mặt bằng **Rohto New Layout - June 2026**. Ứng dụng được xây dựng theo kiến trúc React hiện đại (Vite + Tailwind CSS), hỗ trợ điều hướng kiểu Figma mượt mà, phân quyền RBAC và hiển thị bản vẽ ở **Độ phân giải gốc (Natural Resolution 1:1)** để giữ nguyên độ sắc nét của mọi chú thích kỹ thuật.

---

## 🌟 Tính Năng Nổi Bật

1. **Hiển thị ảnh bản vẽ ở Độ phân giải gốc (Natural Resolution 1:1)**:
   - Tự động nhận diện kích thước thật (`naturalWidth` × `naturalHeight`) của file ảnh bản vẽ.
   - Tuyệt đối không dùng CSS ép co dãn (`no stretch`, `maxWidth: none`) để không làm mờ các kích thước (1400, 1200, 971...), tên phòng họp (Osaka, Tokyo, Saigon, Da Nang, Hanoi, Kyoto, Fujisan) hay các ghi chú kỹ thuật.
   - Hỗ trợ cuộn chuột zoom mượt mà từ 40% đến 400% tại đúng vị trí con trỏ chuột.

2. **Khung bản đồ tương tác kiểu Figma (Figma-like Canvas)**:
   - Tách biệt hoàn toàn khỏi zoom của trình duyệt Chrome (`wheel event` được cô lập).
   - Zoom in / Zoom out ngay tại vị trí trỏ chuột (40% - 400%).
   - Kéo trượt (Pan) linh hoạt bằng cách: Giữ phím `Space` + kéo chuột trái, hoặc giữ chuột giữa, hoặc kéo chuột trực tiếp trên vùng nền trống.
   - **Tương tác Sidebar List**:
     - **Click 1 lần (Single Click)**: Tự động tính toán vị trí, phóng to (Zoom `2.2x`) và trượt (Pan) mượt mà (`transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)`) đưa bàn của nhân viên đó về ngay chính giữa khung nhìn (Viewport Center) mà không bật popup che khuất sơ đồ.
     - **Tự động ngắt transition khi thao tác thủ công**: Khi người dùng tự kéo chuột Pan hoặc lăn bánh xe Wheel, transition tự động tắt ngay lập tức để không gây trễ/lag.
     - **Nhấp đúp chuột (Double Click)**: Nhấp đúp vào item trong danh sách (hoặc nhấp đúp trực tiếp vào icon trên bản đồ) sẽ lập tức mở Modal (Popup) chỉnh sửa/xem chi tiết chỗ ngồi.
   - Cụm điều khiển nổi góc dưới phải: `-`, Zoom % (click để reset 100% 1:1 pixels), `+`, và `Fit` (tự động căn vừa khung nhìn).

3. **Hệ thống Quản lý Nhiều Site / Chi nhánh theo dạng Tab (Multi-Site Tabs)**:
   - Thanh điều hướng dạng Tabs ngay phía trên khung bản đồ (tab mặc định là "Rohto New Layout - June 2026").
   - Mỗi Site lưu trữ độc lập: Tên Site, Ảnh mặt bằng riêng (độ phân giải gốc), và Danh sách các bàn thuộc Site đó.
   - Tài khoản `Admin` có quyền:
     - "+ Thêm Site mới": Nhập tên Site và tải ảnh mặt bằng riêng của chi nhánh đó.
     - Đổi tên Site (Rename) và tự động đồng bộ lại toàn bộ dữ liệu bàn thuộc Site.
     - Xóa Site (Delete) với cảnh báo an toàn.
   - Chuyển đổi tab lập tức chuyển đổi sơ đồ nền, danh sách nhân viên ở Sidebar và bộ đếm thống kê.

4. **Trường dữ liệu đầy đủ trong Popup Chỉnh sửa chỗ ngồi (Desk Modal)**:
   - Bao gồm 6 trường dữ liệu chuẩn:
     1. `Site`: Tên Site / Chi nhánh (tự động theo Tab hoặc chọn chuyển Site).
     2. `Họ và tên nhân viên`: Nhập tên nhân viên hoặc để trống nếu là bàn trống.
     3. `Phòng Ban`: 5 phòng ban chuẩn (Sale, Marketing, Admin, Market Develop, Finance).
     4. `Mã nhân viên`: Mã số nhân viên (VD: RMV-0123).
     5. `Chức vụ`: Vị trí công tác (VD: Sales Manager, IT System Admin...).
     6. `Mã số bàn`: Mã định danh bàn (VD: SALE-01).
   - Thanh tìm kiếm Sidebar hỗ trợ tìm tức thời theo cả Mã nhân viên (`empCode`), Họ tên, Mã bàn và Chức vụ.

5. **Quy trình Xác nhận An toàn 2 Bước Đổi Ảnh Sơ Đồ (Double Confirmation Modal)**:
   - **Bước 1/2 (Xem trước - Preview)**: Khi người dùng chọn file ảnh mới từ nút "Đổi ảnh sơ đồ Site này", hệ thống không áp dụng ngay mà hiển thị Modal xem trước ảnh mới, kiểm tra độ phân giải (pixels) và dung lượng file kèm thông báo: *"Bước 1/2: Bạn đang yêu cầu thay đổi bản đồ nền của Site. Vui lòng kiểm tra kỹ ảnh xem trước."* kèm nút *"Tiếp tục sang Bước 2"*.
   - **Bước 2/2 (Xác nhận lần cuối - Final Warning)**: Modal chuyển sang trạng thái cảnh báo với nút màu đỏ: *"Bước 2/2: Xác nhận ghi đè ảnh sơ đồ mới? (Không thể hoàn tác)"*. Chỉ khi người dùng bấm xác nhận ở bước thứ 2 này thì sơ đồ mới chính thức được ghi đè và lưu vào Site.

6. **Tính năng Xuất Báo Cáo (Export Report ra .xlsx và .csv)**:
   - Tích hợp thư viện SheetJS (`xlsx`) với 2 định dạng:
     - 📊 **Xuất Excel (.xlsx)**: Tạo worksheet tự động căn chỉnh độ rộng cột tối ưu.
     - 📄 **Xuất CSV (.csv)**: Hỗ trợ mã hóa tiếng Việt có dấu UTF-8 with BOM (`\uFEFF`) khi mở bằng Excel.
   - Tùy chọn phạm vi xuất dữ liệu:
     - "Site hiện tại"
     - "Tất cả các Site"
   - Cấu trúc file xuất chuẩn 6 cột theo đúng thứ tự:
     1. `Site` | 2. `Họ và tên nhân viên` | 3. `Phòng Ban` | 4. `Mã nhân viên` | 5. `Chức vụ` | 6. `Mã số bàn`

5. **Thanh công cụ điều khiển (Sidebar)**:
   - 3 chế độ thao tác: ↖ **Con trỏ** (Xem/Chọn), ➕ **Thêm bàn** (Click vào ghế để tạo), ✋ **Di chuyển bàn** (Kéo thả).
   - Thanh trượt điều chỉnh kích thước Icon User (10px - 36px) theo thời gian thực.
   - Tìm kiếm tức thời theo tên nhân viên, mã bàn, số máy nhánh.
   - Sao lưu dữ liệu ra file JSON & Nạp lại file JSON an toàn.

---

## 📁 Cấu Trúc Thư Mục (Component Architecture)

```text
├── public/
│   ├── Rohto New Layout - June 2026.png  # Ảnh mặt bằng độ phân giải gốc
│   ├── Rohto New Layout - June 2026.jpg  # Ảnh dự phòng
│   └── rohto-layout-default.svg         # Bản vẽ vector kiến trúc 2000x1414 tự nhiên
├── src/
│   ├── components/
│   │   ├── InteractiveMap.tsx           # Khung bản đồ Canvas Zoom/Pan kiểu Figma (Natural Res)
│   │   ├── Sidebar.tsx                  # Thanh công cụ, tìm kiếm, 5 phòng ban & kích thước icon
│   │   ├── LoginModal.tsx               # Màn hình đăng nhập & gợi ý tài khoản mẫu
│   │   ├── UserManagementModal.tsx      # Modal quản lý tài khoản & phân quyền (Chỉ Admin)
│   │   └── DeskModal.tsx                # Modal xem & cập nhật chi tiết bàn làm việc
│   ├── constants.ts                     # 5 phòng ban chuẩn, tài khoản mặc định, danh sách bàn mẫu
│   ├── types.ts                         # Định nghĩa kiểu dữ liệu TypeScript (User, Desk, Department)
│   ├── App.tsx                          # Component gốc điều phối trạng thái, xác thực và dữ liệu
│   ├── index.css                        # Cấu hình Tailwind CSS, animation pulse, canvas dot-grid
│   └── main.tsx                         # Entry point ứng dụng React
├── index.html                           # File HTML chính
├── package.json                         # Dependencies & Scripts
├── tsconfig.json                        # Cấu hình TypeScript
└── vite.config.ts                       # Cấu hình Vite build
```

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Development)

### Bước 1: Cài đặt Dependencies
Mở terminal trong thư mục dự án và chạy lệnh:
```bash
npm install
```

### Bước 2: Khởi chạy Dev Server
```bash
npm run dev
```
Trình duyệt sẽ mở tại địa chỉ `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

---

## 📤 Hướng Dẫn Push Lên GitHub

1. Khởi tạo Git repository trong thư mục dự án:
```bash
git init
```

2. Thêm tất cả các file vào Git:
```bash
git add .
```

3. Tạo commit đầu tiên:
```bash
git commit -m "feat: Rohto Office Seating Map complete React app"
```

4. Liên kết với repository trên GitHub và đẩy mã nguồn lên:
```bash
git branch -M main
git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/rohto-seating-map.git
git push -u origin main
```

---

## ⚡ Hướng Dẫn Deploy Lên Vercel (Miễn Phí)

Dự án đã được cấu hình tối ưu 100% cho các nền tảng Static Hosting (Vercel, GitHub Pages, Netlify):

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub của bạn.
2. Bấm nút **"Add New..."** ➜ **"Project"**.
3. Chọn repository GitHub `rohto-seating-map` vừa push.
4. Ở phần cấu hình Build & Output Settings, giữ nguyên mặc định:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Bấm **"Deploy"**. Trong vòng 30 giây, Vercel sẽ cung cấp link trang web trực tuyến (VD: `https://rohto-seating-map.vercel.app`) để toàn thể công ty sử dụng!
