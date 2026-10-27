# ☁️ HƯỚNG DẪN KẾT NỐI VÀ ĐỒNG BỘ DỮ LIỆU REAL-TIME QUA FIREBASE CLOUD

Hệ thống Sơ đồ chỗ ngồi Rohto đã được tích hợp đầy đủ cơ chế **Auto-save & Real-time Synchronization** qua **Google Firebase Firestore**. Khi kích hoạt:
- Toàn bộ dữ liệu (Danh sách Sites, vị trí bàn ghế, thông tin nhân viên, phòng ban, tài khoản và ảnh sơ đồ đã nén tối ưu) sẽ được lưu trữ tập trung trên Cloud.
- Bất kỳ thay đổi nào từ Admin/Editor (kéo thả bàn, cập nhật nhân sự, đổi ảnh sơ đồ,...) sẽ lập tức phản hồi tự động sang màn hình của tất cả người dùng khác đang mở web trong thời gian thực mà không cần F5.

---

## 🚀 3 Bước Lấy API Key Firebase Miễn Phí (Mất 2 Phút)

1. **Tạo Project Firebase**:
   - Truy cập: [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Đăng nhập tài khoản Google và bấm **"Add project"** (Thêm dự án) -> Đặt tên dự án (ví dụ: `rohto-office-layout`) -> Bấm Tiếp tục cho đến khi hoàn tất.

2. **Kích hoạt Cơ sở dữ liệu Cloud Firestore**:
   - Ở thanh menu bên trái, chọn **Build** -> **Firestore Database** -> Bấm **Create database**.
   - Chọn vị trí Cloud (khuyên chọn `asia-southeast1` - Singapore hoặc `asia-east1` - Đài Loan để tốc độ tại Việt Nam nhanh nhất).
   - Chọn chế độ bảo mật: Chọn **Start in test mode** (để ứng dụng có thể đọc/ghi dữ liệu ngay lập tức).
   - Bấm **Enable**.

3. **Lấy mã cấu hình (Firebase SDK Config)**:
   - Tại trang chủ Project, bấm vào biểu tượng bánh răng ⚙️ (Project settings) ở góc trên bên trái -> chọn **Project settings**.
   - Cuộn xuống phần **Your apps**, bấm vào biểu tượng Web `</>` (Add app).
   - Đặt App nickname (ví dụ: `Rohto Web`) -> Bấm **Register app**.
   - Bạn sẽ thấy đoạn mã `firebaseConfig` gồm:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIzaSy...",
       authDomain: "rohto-office-layout.firebaseapp.com",
       projectId: "rohto-office-layout",
       storageBucket: "rohto-office-layout.appspot.com",
       messagingSenderId: "...",
       appId: "..."
     };
     ```

---

## 🛠️ Cách Kích Hoạt Trong Ứng Dụng (Chọn 1 trong 3 cách)

### Cách 1: Nhập trực tiếp trên Giao Diện Web (Tiện lợi nhất)
1. Mở ứng dụng trên trình duyệt web.
2. Bấm vào nút trạng thái Cloud trên thanh Header góc trên bên phải (**"☁️ Chưa kết nối Cloud"** hoặc **"☁️ Đã lưu tự động"**).
3. Copy toàn bộ đoạn `firebaseConfig = { ... }` ở Firebase Console và dán vào ô **"Dán nhanh Firebase Config JSON"** (hoặc điền `API Key` và `Project ID`).
4. Bấm **"Kiểm tra kết nối"** -> Khi báo thành công, bấm **"Lưu cấu hình"**.
5. Bấm nút **"Đẩy dữ liệu hiện tại lên Cloud"** để sao lưu toàn bộ sơ đồ mẫu và tài khoản lên Firestore ngay lập tức!

### Cách 2: Điền vào file cấu hình `src/firebaseConfig.ts`
Mở file `src/firebaseConfig.ts` và thay thế giá trị trong `DEFAULT_HARDCODED_CONFIG`:
```typescript
export const DEFAULT_HARDCODED_CONFIG: FirebaseCustomConfig = {
  apiKey: "AIzaSy...", // Dán apiKey của bạn vào đây
  authDomain: "rohto-office-layout.firebaseapp.com",
  projectId: "rohto-office-layout", // Dán projectId của bạn vào đây
  storageBucket: "rohto-office-layout.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};
```

### Cách 3: Thêm vào biến môi trường `.env` hoặc Cài đặt trên Vercel
Khi deploy lên Vercel, vào mục **Settings** -> **Environment Variables** và thêm:
- `VITE_FIREBASE_API_KEY`: Giá trị `apiKey`
- `VITE_FIREBASE_AUTH_DOMAIN`: Giá trị `authDomain`
- `VITE_FIREBASE_PROJECT_ID`: Giá trị `projectId`
- `VITE_FIREBASE_STORAGE_BUCKET`: Giá trị `storageBucket`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Giá trị `messagingSenderId`
- `VITE_FIREBASE_APP_ID`: Giá trị `appId`

---

## 🔒 Quy Tắc Bảo Mật Firestore Rules (Tùy chọn)
Để đảm bảo ứng dụng luôn đọc/ghi ổn định lâu dài, trong Firebase Console -> **Firestore Database** -> Tab **Rules**, dán đoạn sau và bấm **Publish**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
*(Bạn cũng có thể siết chặt rules theo tài khoản hoặc IP khi cần).*
