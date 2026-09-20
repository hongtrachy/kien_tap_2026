# Hệ thống Quản lý và Đề xuất Thưởng Thông minh (Incentive Management & Analytics)

Nền tảng quản trị và phân tích toàn bộ vòng đời thưởng (Incentive Lifecycle Platform) tích hợp **Học máy (Machine Learning)** và **Cơ chế đề xuất 3 nguồn** phục vụ chuyên viên C&B, Hội đồng duyệt / Kế toán, Quản lý trực tiếp và Nhân viên.

> [!NOTE]
> **Nhánh phát triển**: `feature/de-xuat-thuong-thong-minh` (Tạo từ nhánh `ux-overhaul`).  
> **Lưu ý bảo mật**: Cơ chế xác thực tài khoản trong ứng dụng là cơ chế mô phỏng trên trình duyệt phục vụ đánh giá đề tài kiến tập, không phải giải pháp bảo mật thật cấp doanh nghiệp.

---

## 1. Khởi chạy Ứng dụng

### Chạy trực tiếp qua HTTP Server (Khuyên dùng)
Để ứng dụng đọc tệp tin dự đoán học máy JSON (`DEMO/data/ml_predictions.json`) không bị trình duyệt chặn CORS:
```bash
# Khởi chạy bằng Python
python -m http.server 8080 --directory DEMO

# Truy cập ứng dụng tại trình duyệt:
http://localhost:8080/index.html
```

---

## 2. Tài khoản Mẫu và Phân quyền Mô phỏng

Hệ thống cung cấp 3 tài khoản đại diện với quyền hạn và góc nhìn được phân định nghiêm ngặt:

| Vai trò | Tên tài khoản | Tên hiển thị | Thẩm quyền dữ liệu & Giao diện |
| :--- | :--- | :--- | :--- |
| **Admin (C&B & Tài chính)** | `admin` | Nguyễn Thu Trang | Xem toàn công ty, điều hành tối ưu cơ chế, phê duyệt cấp hai, xuất file chi trả Payroll CSV. |
| **Quản lý trực tiếp** | `manager` | Trần Minh Đức | Xem nhân viên thuộc phòng mình (Kinh doanh Miền Nam), đánh giá hiệu suất, đề xuất thưởng, quyết định thưởng cuối. |
| **Nhân viên** | `employee` | Trần Thị Bình (EMP-002) | Chỉ xem duy nhất dữ liệu của bản thân (Phiếu thưởng minh bạch), gửi yêu cầu giải trình / khiếu nại. Bị chặn tuyệt đối các màn hình quản trị. |

*Thanh trên cùng có hộp chọn "Vai trò" để người thuyết trình chuyển nhanh giữa 3 góc nhìn trong buổi báo cáo 5 phút.*

---

## 3. Kiểm thử Tự động (Unit Tests)

Hệ thống trang bị 3 bộ kiểm thử tự động độc lập:

```bash
# 1. Kiểm thử tính toán lõi cho 4 nhân vật neo (An, Bình, Chi, Dũng)
node tests/test_engine.mjs

# 2. Kiểm thử tỷ lệ có trọng số, hệ số quy mô, đề xuất 3 nguồn và ngân sách quỹ
node tests/test_engine_v2.mjs

# 3. Kiểm thử phân quyền truy cập và bảo vệ dữ liệu giữa 3 vai trò
node tests/test_auth.mjs
```

### Pipeline Huấn luyện Học máy (Machine Learning)
```bash
# Chạy script Python huấn luyện và kiểm tra công bằng
python ml/train.py

# Hoặc sinh lại tệp JSON dự đoán bằng Node.js
node ml/generate_ml_data.mjs
```

---

## 4. Cấu trúc Tài liệu Bàn giao

- [`DU_LIEU_VA_CONG_THUC.md`](DU_LIEU_VA_CONG_THUC.md): Bản mô tả chi tiết toàn bộ các trường dữ liệu, công thức tính toán và chỉ số kinh doanh.
- [`ML_KHAO_SAT.md`](ML_KHAO_SAT.md): Báo cáo khảo sát dữ liệu nhân sự công khai, kiến trúc mô hình Gradient Boosting, và thẻ mô hình.
- [`ASSUMPTIONS.md`](ASSUMPTIONS.md): Bảng tổng hợp các giả định khoa học, thiết kế đầu việc và phương pháp luận mô phỏng.
- [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md): Kịch bản thuyết trình demo 5 phút chi tiết theo từng phút với số liệu thực tế.
- [`LY_DO_DE_XUAT_HE_THONG.md`](LY_DO_DE_XUAT_HE_THONG.md): Bài luận văn xuôi phục vụ viết báo cáo khoa học.
- [`CHANGELOG.md`](CHANGELOG.md): Báo cáo chi tiết quá trình tối ưu và tự phản biện thiết kế.
- [`AUDIT.md`](AUDIT.md): Báo cáo hiện trạng ban đầu trước khi nâng cấp.
