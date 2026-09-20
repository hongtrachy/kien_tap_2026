# Nền tảng Quản lý & Phân tích Incentive (Incentive Lifecycle Platform)

Web Demo nền tảng quản trị và phân tích toàn bộ vòng đời thưởng (Incentive Management & Analytics) phục vụ chuyên viên C&B, Kế toán trưởng, Line Manager và Nhân viên.

## 1. Cách chạy ứng dụng

### Chạy trực tiếp qua HTTP Server (Khuyên dùng)
Do tính năng đọc file CSV (`csv.csv`) cần giao thức HTTP (tránh bị trình duyệt chặn CORS):
```bash
# Sử dụng Python (có sẵn trên máy)
python -m http.server 8080 --directory DEMO

# Mở trình duyệt tại địa chỉ:
http://localhost:8080/index.html
```

Hoặc sử dụng Node.js:
```bash
npx serve DEMO -l 8080
```

### Chạy kiểm thử tự động (Unit Tests)
Kiểm tra tính chính xác của hàm tính toán lõi cho 4 nhân vật neo (An, Bình, Chi, Dũng):
```bash
node tests/test_engine.mjs
```

Kiểm tra toàn bộ luồng demo 5 phút bằng headless Chrome:
```bash
node scripts/test_demo_flow.mjs
```

---

## 2. Cấu trúc thư mục

```
KIENTAP_ - Copy/
├── AUDIT.md                   # Báo cáo audit hiện trạng ban đầu (Trước khi sửa)
├── CHANGELOG.md               # Báo cáo chi tiết sau tối ưu & Tự phản biện thiết kế
├── README.md                  # Hướng dẫn chạy và cấu hình
├── DEMO/                      # Thư mục mã nguồn ứng dụng web
│   ├── index.html             # Giao diện chính (8 màn hình & Drawer chi tiết)
│   ├── csv.csv                # Bộ dữ liệu may mặc Kaggle đối chiếu
│   ├── css/
│   │   ├── tokens.css         # Design tokens: Thang màu Slate, Deep Teal, Typography
│   │   └── styles.css         # Stylesheet trung tâm (Chống AI-slop, tabular-nums)
│   └── js/
│       ├── engine.js          # Hàm tính toán lõi duy nhất (Pure calculation engine)
│       ├── dataset.js         # Bộ 120 nhân sự chuẩn hóa Q3/2026 & 4 nhân vật neo
│       ├── app.js             # Quản lý trạng thái, routing, drawer và kịch bản demo
│       ├── charts.js          # Khởi tạo biểu đồ phân tích (Chart.js)
│       └── automation.js      # Module xử lý dữ liệu tự động
├── tests/
│   └── test_engine.mjs        # Unit test suite kiểm thử chính xác từng con số
├── scripts/
│   ├── capture_before.mjs     # Script chụp ảnh giao diện ban đầu
│   ├── capture_after.mjs      # Script chụp ảnh 8 màn hình sau tối ưu
│   └── test_demo_flow.mjs     # Script kiểm tra kịch bản thuyết trình 5 phút
└── docs/
    └── screenshots/
        ├── before/            # 4 ảnh chụp hiện trạng ban đầu
        └── after/             # 8 ảnh chụp giao diện hoàn thiện sau tối ưu
```

---

## 3. Cách thay đổi cấu hình Scheme

Các tham số của đường cong chi trả được tham số hóa động tại `DEMO/js/engine.js`:
```javascript
const DEFAULT_SCHEME_CONFIG = {
  thresholdMin: 0.70,     // Dưới 70% không có thưởng (0.0x)
  thresholdTarget: 1.00,  // Đạt 100% nhận 1.0 lần mức thưởng mục tiêu
  thresholdMax: 1.20,     // Từ 100% đến 120% tăng tuyến tính lên 1.5x
  factorAtMin: 0.0,
  factorAtTarget: 1.0,
  factorCap: 1.5,         // Trần hệ số chi trả tối đa bảo vệ ngân sách
  defaultTargetIncentive: 20000000 // 20 triệu VNĐ
};
```
Bạn cũng có thể thay đổi trực tiếp trên giao diện tại mục **Thiết kế & Mô phỏng (What-If)** để kéo thanh trượt mô phỏng ngân sách trước khi áp dụng.

---

## 4. Kịch bản Demo 5 phút phục vụ thuyết trình

1. **Tổng quan (Phút 1)**: Mở Tổng quan thấy kỳ Q3/2026 đang ở bước **Validate & Approve**, ngân sách dự kiến và 3 việc khẩn cấp cần làm hôm nay.
2. **Kiểm tra dữ liệu (Phút 2)**: Vào Kiểm tra dữ liệu &rarr; xem so sánh Before vs After của **Dũng** &rarr; bấm "Khấu trừ bản ghi trùng 90M" &rarr; thưởng Dũng về 20M chuẩn.
3. **Hiệu chỉnh Target (Phút 3)**: Chuyển vai trò sang **Approver (Hội đồng hiệu chỉnh)** &rarr; xem đề xuất của **Bình** (thị trường co hẹp 10.2%) &rarr; bấm "Phê duyệt hệ số 0.9" &rarr; target thành 900M, thưởng thành 16.3M và ghi nhật ký người duyệt.
4. **Phê duyệt Lô & Xuất Payroll (Phút 4)**: Bấm "Duyệt toàn bộ lô" &rarr; bấm "Xuất CSV cho Payroll" kèm modal xác nhận an toàn.
5. **Phân tích Scheme (Phút 4.5)**: Xem đường cong chi trả liên tục với 4 nhân vật neo & biểu đồ phát hiện dồn ứ tại 95% - 99% kèm khối "Đề xuất để cân nhắc".
6. **Bản giải trình Nhân viên (Phút 5)**: Đổi vai trò sang **Nhân viên (Bình)** &rarr; hiển thị thẻ di động giải thích minh bạch từng bước tính và nút gửi khiếu nại.
