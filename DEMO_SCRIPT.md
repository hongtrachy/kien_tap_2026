# KỊCH BẢN THUYẾT TRÌNH VÀ NGHIỆM THU DEMO 5 PHÚT (DEMO_SCRIPT.md)
## Hệ thống Quản lý và Đề xuất Thưởng Thông minh (Incentive Management & Analytics)

Tài liệu này được biên soạn cho buổi báo cáo tiến độ với Giảng viên hướng dẫn / Hội đồng thẩm định. Mọi con số trong kịch bản đều được sinh trực tiếp từ mã nguồn thực tế và dữ liệu chuẩn của hệ thống.

---

### Phút 1: Đăng nhập Quản trị viên (Admin C&B) & Điều hành Kỳ Thưởng
- **Hành động**: Đăng nhập với vai trò **Quản trị viên (Admin C&B - Nguyễn Thu Trang)**.
- **Màn hình**: `Tổng quan kỳ thưởng` (Menu ngang).
- **Thao tác**:
  1. Giới thiệu thẻ thông báo tự động: Hệ thống hiển thị lần xử lý ngầm gần nhất (18/09/2026 09:15) với 120/120 hồ sơ đã đồng bộ và phát hiện 5 cảnh báo dữ liệu. Khối này chỉ hiển thị cho Quản lý và Admin, nhân viên không nhìn thấy.
  2. Chọn bộ lọc kỳ: **Quý 3/2026**, chọn "Tính đến ngày": **Tuần 3 (Ngày công 15/22)**.
  3. Chỉ ra dải 4 chỉ số phẳng:
     - **Tỷ lệ đạt chỉ tiêu có trọng số**: **98,5%** (Tốc độ hoàn thành 1.02x, nhanh hơn tiến độ thời gian).
     - **Khoản thưởng tạm tính đến ngày**: **1.642.500.000 ₫** (Dự phóng cuối kỳ: 1.710.000.000 ₫).
     - **Chi phí so với quỹ thưởng**: **97,7%** (An toàn dưới ngân sách trần 1,75 tỷ đồng).
     - **Tiến độ thời gian**: **68,2%** (15/22 ngày làm việc).
  4. Bấm nút **"Cách tính"** tại ô Tỷ lệ đạt: Modal mở ra giải thích công thức toán học có trọng số $w_i = \text{Giá trị gói} \times \text{Độ phức tạp}$ và trích xuất số liệu thật (Tổng trọng số 96.000 điểm).
  5. Bấm nút **"Ẩn số tiền"** trên thanh công cụ: Toàn bộ con số tài chính nhạy cảm chuyển thành `•••••• ₫` để bảo vệ quyền riêng tư khi thuyết trình nơi đông người.

---

### Phút 2: Khối Đề xuất Tối ưu Cơ chế Thưởng & Duyệt Hàng loạt
- **Vấn đề**: Doanh nghiệp phát hiện 20 nhân sự đang dồn ứ tại mức 95%-99% sát mốc 100% và biến động sức mua thị trường miền Nam giảm 10.2%.
- **Thao tác**:
  1. Tại khối **"Đề xuất tối ưu cơ chế thưởng"**, người thuyết trình giới thiệu 3 đề xuất cụ thể:
     - Đề xuất 1: Hiệu chỉnh hệ số độ khó 0.9 vùng Đông Nam Bộ (+6,3M ₫).
     - Đề xuất 2: Giảm độ dốc vùng dồn ứ 95%-99% (-12,5M ₫).
     - Đề xuất 3: Tách cơ chế trọng số cho gói thầu B2B dài hạn (+0,0M ₫).
  2. Bấm **"Duyệt tất cả đề xuất"**: Hệ thống mở Modal xác nhận an toàn nêu rõ hệ quả tài chính (ngân sách điều chỉnh ròng -6.200.000 ₫) và thông báo quyền hoàn tác.
  3. Bấm **"Xác nhận duyệt ngay"**: Thanh thông báo đếm ngược màu hổ phách xuất hiện: *"Đã duyệt hàng loạt (Hoàn tác trong 300s)"*. Bấm thử nút **"Hoàn tác"** để chứng minh tính năng an toàn trong quản trị nhân sự.

---

### Phút 3: Đăng nhập Quản lý Trực tiếp (Trần Minh Đức) & Đề xuất Thưởng Thông minh
- **Hành động**: Chuyển nhanh vai trò sang **Quản lý trực tiếp (Trần Minh Đức - Trưởng phòng Kinh doanh Miền Nam)**.
- **Màn hình**: `Đề xuất mức thưởng` (Menu ngang).
- **Thao tác**:
  1. Chỉ ra thanh bước mảnh (Thin Stepper): `Hiệu suất` $\rightarrow$ `Đề xuất` $\rightarrow$ `Quyết định` $\rightarrow$ `Duyệt cấp hai` $\rightarrow$ `Thông tin chi tiết`.
  2. Mở hồ sơ **Trần Thị Bình (EMP-002)**:
     - Thấy rõ 4 gói việc đảm nhận: Thaco (380/450M), Vinamilk (300/350M), Đại lý Cần Thơ (110/120M), Tối ưu công nợ (60/80M).
     - Thấy 3 nguồn độc lập cấu thành đề xuất:
       + **Theo quy tắc (70%)**: $R_{\text{quy\_tắc}} = 81,5\%$ (Từ tỷ lệ đạt 94,4% sau độ khó 0.9).
       + **Học máy đề xuất (30%)**: $R_{\text{học\_máy}} = 83,0\%$ (Khoảng tin cậy [75%, 90%], phân tích từ 4 kỳ lịch sử).
       + **Đánh giá của quản lý**: $\Delta_{\text{quản\_lý}} = +0,8\%$ (Điểm chấm 4.3/5 sau chuẩn hóa z-score).
       + **Đề xuất tổng hợp**: **82,8%** (Tương ứng tiền thưởng: **16.560.000 ₫**).
  3. Đọc văn bản giải trình tự động tạo bằng tiếng Việt: Minh bạch, không mập mờ, chỉ rõ từng nguồn đóng góp.
  4. Trải nghiệm **Khung hỏi đáp cho Quản lý**:
     - Bấm *"Vì sao đề xuất mức này?"*: Hệ thống trích dẫn đúng các con số cấu thành.
     - Bấm *"Nếu hạ xuống 60% thì thay đổi gì?"*: Hệ thống trả lời chi phí giảm về 12.000.000 ₫ và cảnh báo lệch quá 10% bắt buộc qua duyệt cấp hai.
     - Bấm *"Có nên cân nhắc thăng tiến không?"*: Hệ thống trả lời chưa đủ điều kiện do cần tích lũy thêm chuỗi kỳ vượt trội.
  5. Thao tác trên **Thanh kéo What-If**: Kéo thử thanh trượt từ 83% về 65%: Ngay lập tức cảnh báo màu hổ phách xuất hiện: *"Lệch >10%: Bắt buộc duyệt cấp hai"*.
  6. Bấm nút **"Đồng ý mức đề xuất"**: Hệ thống chốt mức thưởng cho nhân sự.

---

### Phút 4: Đăng nhập Nhân viên (Trần Thị Bình) & Xem Bản Giải trình
- **Hành động**: Chuyển vai trò sang **Nhân viên (Trần Thị Bình)**.
- **Thử nghiệm phân quyền**: Cố tình truy cập route `#payroll` hoặc `#recommendation`: Hệ thống từ chối quyền truy cập và tự động chuyển về giao diện cá nhân. Menu trên cùng chỉ hiển thị 4 mục: *Tổng quan của tôi, Hồ sơ của tôi, Hiệu suất của tôi, Thưởng của tôi*.
- **Màn hình**: `Thưởng của tôi` (`view-slip`).
- **Nội dung quan sát**:
  - Giao diện thiết kế trang trọng, dễ hiểu, không ngôn ngữ phán xét.
  - Thấy rõ mức thưởng thực nhận: **16.300.000 ₫** (Tỷ lệ đạt có trọng số: **94,4%**).
  - Đọc phần giải thích minh bạch: Chỉ tiêu gốc 1.000M $\rightarrow$ Áp dụng hệ số độ khó 0.9 còn 900M do thị trường miền Nam co hẹp $\rightarrow$ Thực đạt 850M $\rightarrow$ Tính tuyến tính theo đường cong quy chế ra 81,5%.
  - Nút **"Gửi yêu cầu giải trình"**: Bấm mở hộp thoại, ghi nhận khiếu nại kèm cam kết thời hạn giải quyết trong vòng 15 ngày làm việc.

---

### Phút 5: Kiểm tra Dữ liệu & Xuất Bảng Chi trả (Payroll CSV)
- **Hành động**: Chuyển vai trò lại **Admin C&B**.
- **Màn hình**: `Kiểm tra dữ liệu` (`view-validation`):
  - Xem ca **Phạm Tiến Dũng (EMP-004)** bị trùng lặp hợp đồng 90.000.000 ₫ (HĐ-RET-099).
  - Bấm nút **"Khấu trừ bản ghi trùng (90M ₫)"**: Doanh số Dũng lập tức về đúng 900M ₫ (100%), tiền thưởng cập nhật từ 25M về đúng 20M ₫.
- **Màn hình**: `Tính thưởng và chi trả` (`view-payroll`):
  - Kiểm tra trạng thái lô: 120/120 hồ sơ đã sẵn sàng.
  - Bấm **"Xuất file Payroll CSV"**: Modal mở ra với tổng số tiền 1.710.450.000 ₫.
  - Bấm **"Tải file CSV"**: Trình duyệt tải xuống tệp tin `PAYROLL_Q3_2026_FINAL.csv` có mã hóa UTF-8 với BOM, mở xem được ngay trên Excel tiếng Việt mà không lỗi phông chữ.
