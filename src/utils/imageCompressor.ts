/**
 * Tiện ích nén ảnh sơ đồ tự động trước khi lưu lên Cloud Firestore / LocalStorage
 * Giúp tối ưu hóa dung lượng (thường từ 5-15MB xuống còn ~200-450KB)
 * Đảm bảo không vượt quá giới hạn 1MB của Firestore Document mà vẫn giữ độ nét cao.
 */

export async function compressImage(
  input: File | string,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let shouldRevoke = false;

    if (typeof input === 'string') {
      srcUrl = input;
    } else if (input && typeof (input as Blob).slice === 'function') {
      srcUrl = URL.createObjectURL(input as Blob);
      shouldRevoke = true;
    } else {
      resolve(String(input));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Nếu ảnh quá lớn, thu nhỏ tỷ lệ theo maxWidth / maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (shouldRevoke) URL.revokeObjectURL(srcUrl);
          resolve(srcUrl);
          return;
        }

        // Vẽ nền trắng trong trường hợp ảnh có kênh alpha (PNG)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Khử răng cưa và vẽ ảnh
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ra JPEG định dạng tối ưu nén
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        if (shouldRevoke) {
          URL.revokeObjectURL(srcUrl);
        }

        resolve(compressedDataUrl);
      } catch (err) {
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);
        // Nếu có lỗi bảo mật hoặc cross-origin, trả về URL gốc
        resolve(srcUrl);
      }
    };

    img.onerror = (err) => {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);
      reject(err);
    };

    img.src = srcUrl;
  });
}
