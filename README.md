# 📸 Photo Journal — Bonus 7: Advanced feature integration

Ứng dụng chụp & xem lại ảnh tích hợp nhiều tính năng nâng cao.

## Tính năng

| # | Yêu cầu | Triển khai |
|---|---------|-----------|
| 1 | Image picker để chụp ảnh | `expo-image-picker` → `launchCameraAsync` (nút máy ảnh nổi) |
| 2 | Gemini AI generate description | `gemini.js` gọi `gemini-2.0-flash` với ảnh base64 |
| 3 | Google Map xem vị trí chụp | `react-native-maps` + marker; toạ độ lấy bằng `expo-location` |
| 4 | Async storage lưu thông tin | `@react-native-async-storage/async-storage` (`storage.js`) |
| 5 | Cho phép xoá ảnh | Nút thùng rác trong màn hình chi tiết (có xác nhận) |

## ⚙️ Cấu hình bắt buộc

Mở `gemini.js` và dán **Gemini API key** của bạn vào:

```js
export const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
```

Lấy key miễn phí tại: https://aistudio.google.com/apikey

> Không có key thì các chức năng khác vẫn chạy bình thường — chỉ phần
> mô tả AI sẽ báo lỗi nhẹ thay vì crash.

## ▶️ Chạy thử

- **Expo Snack**: mở link, nhấn **Save**, quét QR bằng **Expo Go** trên điện thoại
  (camera/GPS/bản đồ cần thiết bị thật, không chạy đầy đủ trên web preview).
- **Local**: `npm install` rồi `npx expo start`.

## Cấu trúc

- `App.js` — UI: lưới ảnh, nút chụp, modal chi tiết (ảnh + bản đồ + mô tả + xoá)
- `storage.js` — đọc/ghi danh sách ảnh vào AsyncStorage
- `gemini.js` — gọi Gemini API tạo mô tả ảnh

# mma-last-bonus
