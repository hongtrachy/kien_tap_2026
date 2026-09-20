# AUDIT VÀ ĐÁNH GIÁ HIỆN TRẠNG UI/UX - WEB DEMO INCENTIVE MANAGEMENT & ANALYTICS

**Dự án**: Nền tảng Quản lý & Phân tích Chu kỳ Incentive Doanh nghiệp  
**Phiên bản audit**: 1.0 (Trước khi tối ưu - Pre-overhaul)  
**Nhánh thực hiện**: `ux-overhaul` (Bản gốc tại `main` / `KIENTAP_` được giữ nguyên vẹn)  
**Ngày thực hiện**: 20/09/2026  
**Chuyên gia đánh giá**: Senior Product Designer & Senior Frontend Engineer  

---

## 1. TỔNG QUAN HIỆN TRẠNG KỸ THUẬT (TECH STACK & ARCHITECTURE)

- **Ngôn ngữ & Nền tảng**: HTML5, Vanilla JavaScript (ES6+), CSS3.
- **Thư viện UI / Utility**: 
  - Tailwind CSS qua CDN (`cdn.tailwindcss.com`).
  - FontAwesome 6.4.0 (`cdnjs.cloudflare.com`).
- **Thư viện xử lý dữ liệu & trực quan hóa**:
  - PapaParse 5.4.1 (Parse CSV phía client).
  - Chart.js (Vẽ biểu đồ phân bố).
- **Bộ dữ liệu hiện tại**: Tập tin `csv.csv` (1.197 dòng) phỏng theo bộ dữ liệu năng suất xưởng may mặc (Kaggle Garment Dataset), gồm các trường: `date`, `quarter`, `department`, `day`, `team`, `targeted_productivity`, `smv`, `wip`, `over_time`, `incentive`, `idle_time`, `actual_productivity`.
- **Cấu trúc Route & Trạng thái**:
  - Không có Router hay URL Hash/Query params.
  - Sử dụng hàm đơn giản `switchTab(tabId)` ẩn hiện `div.tab-view`. Mọi reload trang đều mất trạng thái hiện tại.
- **Logic tính toán hiện tại**:
  - `achievementRate = actual / target`.
  - Tiền thưởng `incentive` lấy trực tiếp từ cột sẵn trong file CSV, **chưa áp dụng hàm đường cong chi trả liên tục** (Continuous Payout Curve) của đề xuất đề tài.
  - Phân loại lỗi cứng trong `automation.js`: `UNEARNED_INCENTIVE`, `EXTREME_INCENTIVE`, `MISSING_WIP`, `IDLE_TIME_ALERT`.

---

## 2. NHỮNG GÌ ĐANG TỐT VÀ NÊN GIỮ

1. **Khả năng tải và parse dữ liệu CSV linh hoạt client-side**: Xử lý mượt mà dữ liệu từ CSV nội bộ hoặc cho phép người dùng nạp file CSV ngoài không phụ thuộc server.
2. **Ý niệm về phân loại bất thường dữ liệu (Validation Anomalies)**: Đã có bước phát hiện các ca "Chưa đạt target nhưng vẫn nhận thưởng" hoặc "Outlier vọt mức" – đây là nền tảng cốt lõi của tầng *Công bằng về thủ tục*.
3. **Phân tích tương quan theo bracket thưởng**: Ý tưởng so sánh Target vs Actual theo từng tier thưởng trong Task 3 là hướng đi đúng cho phân tích scheme.
4. **Hiệu năng nhẹ**: Sử dụng vanilla JS không cồng kềnh, tải nhanh, dễ kiểm soát luồng dữ liệu.

---

## 3. CÁC VẤN ĐỀ UX/UI CỤ THỂ THEO TỪNG MÀN HÌNH

### Màn hình 1: Dashboard Tổng Quan (`view-dashboard`)
- **Vấn đề phân cấp thông tin (Hierarchy)**:
  - Bốn thẻ KPI trên cùng mang phong cách "landing page" với số rất to nhưng thiếu ngữ cảnh nghiệp vụ: Không có so sánh với ngân sách kỳ, không thể hiện kỳ đang ở bước nào trong quy trình 8 bước.
  - Tên các mục là "Task 1", "Task 2", "Task 3" – mang cảm giác bài tập sinh viên nộp bài thay vì một phần mềm nghiệp vụ B2B chuyên nghiệp cho phòng C&B và Tài chính.
- **Thiếu Actionable Workflow**: Không trả lời được câu hỏi cốt tử của người làm C&B: *"Hôm nay mở máy lên tôi cần xử lý những việc gì?"* (Số lỗi cần duyệt, hiệu chỉnh cần xem xét, lô chi trả đang nghẽn ở đâu).
- **Màu sắc & Thẻ (Card Bloat)**: Sử dụng các viền bo tròn lớn, màu tím/indigo đặc trưng template AI, các khối card lồng nhau không cần thiết.

### Màn hình 2: Bảng Tính Incentive (`view-task1`)
- **Trải nghiệm bảng dữ liệu kém**:
  - Render toàn bộ hàng ngàn dòng vào DOM cùng lúc mà không có phân trang, thanh cuộn bảng bị kẹt trong container nhỏ (`max-h-[500px]`), giật lag khi cuộn.
  - Bảng không hỗ trợ: Tìm kiếm theo tên/mã, sắp xếp cột (sortable headers), chọn nhiều dòng (bulk selection), lọc nâng cao theo trạng thái.
  - Con số tỷ lệ và số tiền căn lề trái hoặc lộn xộn, không dùng `tabular-nums`, rất khó quét mắt so sánh số liệu tài chính.
- **Thiếu tính năng Truy vết (Traceability) & Drawer chi tiết**:
  - Bấm vào một dòng trong bảng **không có bất kỳ phản hồi nào**. Người dùng không thể biết con số incentive được tính từ đâu, công thức ra sao, dữ liệu thô thế nào.

### Màn hình 3: Cảnh Báo Lỗi & Giám Sát (`view-task2`)
- **Nút bấm chết (Dead UI)**:
  - Danh sách lỗi có các nút "Chi tiết" nhưng bấm vào hoàn toàn không có sự kiện gì xảy ra.
  - Không có giao diện So sánh Trước vs Sau (Before vs After) khi giải quyết lỗi.
  - Không có nút hành động cụ thể: Ví dụ gỡ bản ghi trùng, điều chỉnh doanh số ghi nhận, gửi thông báo xác minh.

### Màn hình 4: Phân Tích Scheme (`view-task3`)
- **Biểu đồ chưa phản ánh triết lý cốt lõi của Đề tài**:
  - Hiện tại chỉ là biểu đồ cột gom theo nhóm thưởng thô.
  - Thiếu hẳn **Biểu đồ Đường cong chi trả liên tục** (với các mốc ngưỡng 70%, 100%, 120%, trần 1.5x) và tọa độ vị trí của từng nhân viên (như An, Bình, Chi, Dũng trong Báo cáo đề tài).
  - Thiếu công cụ phát hiện hiện tượng "nhân viên dồn ngay dưới mốc" (clustering/bunching ở mức 95%-99%) để gợi ý điều chỉnh độ dốc target.
- **Gợi ý mang tính áp đặt, chưa đạt chuẩn hỗ trợ ra quyết định**: Cần dùng ngôn ngữ "Đề xuất để cân nhắc" theo đúng nguyên tắc khách quan.

### Các màn hình còn thiếu hoàn toàn (P0 bắt buộc theo yêu cầu nghiệp vụ):
1. **Quy trình 8 bước trực quan (Lifecycle Stepper)**: Thể hiện rõ vòng đời kỳ thưởng đang ở bước nào (Set Target -> Define Scheme -> Collect Performance -> Calculate -> Validate & Approve -> Payment Output -> Analyze -> Improve).
2. **Màn hình Hiệu chỉnh Target (Target Calibration Workflow)**: Nơi hội đồng hiệu chỉnh xem xét hệ số độ khó (như trường hợp của Bình: 0.9 do thị trường co hẹp), xem bằng chứng, phê duyệt độc lập và lưu Audit Log.
3. **Màn hình Phê duyệt & Xuất chi trả (Batch Approval & Payroll Export)**: Kiểm soát trạng thái (Đã tính, Cần xem xét, Đã duyệt, Đã chi trả), duyệt theo lô, xuất file CSV cho kế toán kèm modal xác nhận chống sai sót.
4. **Bản giải trình của Nhân viên (Employee Incentive Explanation Slip)**: Giao diện thân thiện điện thoại, giải thích minh bạch từng con số, triệt tiêu cảm giác ấm ức, có kênh gửi khiếu nại kèm hạn giải quyết.
5. **Bộ chuyển đổi vai trò người dùng (Role Switcher)**: Cho phép chuyển đổi tức thì giữa C&B Specialist, Approver/Hội đồng, Line Manager, và Nhân viên để thuyết trình demo trực quan.
6. **Bảo vệ dữ liệu nhạy cảm**: Nút bật/tắt che số tiền (Privacy masking `•••••• ₫`).
7. **Bộ điều chỉnh mật độ hiển thị (Density Mode)**: Chế độ "Thoải mái" (Comfortable) và "Gọn" (Compact) cho chuyên viên tài chính thao tác nhanh.

---

## 4. CHI TIẾT ĐỐI CHIẾU CÔNG THỨC LÕI & DỮ LIỆU CHUẨN ĐỀ TÀI

Công thức lõi bắt buộc theo đề án:
- `Target hiệu chỉnh = Target × Hệ số độ khó` (Mặc định độ khó = 1.0)
- `Achievement Rate = Actual ÷ Target hiệu chỉnh`
- `Hệ số chi trả (Payout Factor)`:
  - Nếu `Rate < 70%`: `Payout Factor = 0`
  - Nếu `70% <= Rate <= 100%`: `Payout Factor = (Rate - 0.7) / (1.0 - 0.7) * 1.0`
  - Nếu `100% < Rate <= 120%`: `Payout Factor = 1.0 + (Rate - 1.0) / (1.2 - 1.0) * 0.5`
  - Nếu `Rate > 120%`: `Payout Factor = 1.5` (Trần cố định)
- `Incentive = Mức thưởng mục tiêu × Hệ số chi trả`

**Bộ kiểm thử 4 nhân vật neo (Kỳ Q3/2026, Target Thưởng 20 triệu VNĐ/người)**:
1. **An**: Target 800M, Actual 920M $\rightarrow$ Rate 115.0% $\rightarrow$ Hệ số 1.375 $\rightarrow$ Thưởng **27.500.000 ₫**.
2. **Bình**:
   - Tính thô: Target 1000M, Actual 850M $\rightarrow$ Rate 85.0% $\rightarrow$ Hệ số 0.500 $\rightarrow$ Thưởng **10.000.000 ₫**.
   - Sau hiệu chỉnh độ khó 0.9: Target hiệu chỉnh 900M $\rightarrow$ Rate 94.44% $\rightarrow$ Hệ số 0.8148... $\rightarrow$ Thưởng **16.296.296 ₫** (làm tròn báo cáo **16.300.000 ₫**).
3. **Chi**: Target 600M, Actual 600M $\rightarrow$ Rate 100.0% $\rightarrow$ Hệ số 1.000 $\rightarrow$ Thưởng **20.000.000 ₫**.
4. **Dũng**:
   - Tính thô: Target 900M, Actual ghi nhận 990M (bị trùng 1 HĐ 90M) $\rightarrow$ Rate 110.0% $\rightarrow$ Hệ số 1.250 $\rightarrow$ Thưởng **25.000.000 ₫**.
   - Sau kiểm tra gỡ trùng: Actual 900M $\rightarrow$ Rate 100.0% $\rightarrow$ Hệ số 1.000 $\rightarrow$ Thưởng **20.000.000 ₫**.
- **Tổng 4 người**:
   - Tính thô: **82.500.000 ₫**.
   - Sau xử lý kiểm tra & hiệu chỉnh: **83.800.000 ₫** (khớp chính xác ngân sách đề xuất 80 triệu vượt nhẹ 104.8%).

---

## 5. THỨ TỰ ƯU TIÊN SỬA ĐỔI (ROADMAP & PRIORITY)

### Ưu tiên P0 (Cốt lõi nghiệp vụ - Hoàn thiện toàn diện):
1. **Kiến trúc Engine & Unit Test (`engine.js`)**: Viết module hàm thuần túy tính toán công thức lõi, cấu hình ngưỡng động, sinh dữ liệu chuẩn 120 nhân viên Q3/2026 kèm 4 nhân vật neo, có unit test tự động chạy và pass 100%.
2. **Design Tokens & Theme Chuẩn Doanh Nghiệp (`tokens.css` / `styles.css`)**: 
   - Loại bỏ phong cách tím-xanh AI-slop; chuyển sang bảng màu doanh nghiệp tài chính/C&B trung tính cao cấp (Neutral Slate + Deep Teal/Forest Accent `#0E5A55` và `#0F766E`, đồng bộ font chữ `Be Vietnam Pro`).
   - Hỗ trợ Chế độ Mật độ: Thường (Comfortable) & Gọn (Compact).
   - Nút bảo vệ dữ liệu nhạy cảm (ẩn/hiện số tiền).
3. **Màn hình Tổng quan Kỳ thưởng (Lifecycle Overview)**: Thanh trạng thái 8 bước, danh mục công việc cần xử lý hôm nay (To-do queue), tiến độ ngân sách.
4. **Bảng Danh sách Incentive trung tâm & Drawer Chi tiết**: Lọc, tìm kiếm, sắp xếp, pagination/virtualization mượt mà. Bấm vào dòng mở Drawer bên phải truy vết từng bước của công thức và dòng lịch sử.
5. **Kiểm tra dữ liệu (Validation Queue)**: Giao diện xử lý từng bất thường (gỡ trùng cho Dũng, cập nhật số liệu trước và sau).
6. **Hiệu chỉnh Target (Calibration Board)**: Xem đề xuất của Bình, duyệt hệ số 0.9, lưu nhật ký kiểm toán.
7. **Phê duyệt & Xuất chi trả (Batch Approval & Payroll Export)**: Chuyển trạng thái lô, xuất file CSV cho phòng kế toán có bước xác nhận.
8. **Phân tích Scheme (Continuous Curve & Bunching Detection)**: Đường cong chi trả trực quan với các chấm nhân viên di chuyển trước/sau hiệu chỉnh, phân tích dồn ứ tại 95%-99%, khối "Đề xuất cân nhắc".
9. **Bản giải trình Nhân viên (Mobile-friendly Explanation Slip)**: Xem minh bạch bảng lương thưởng cá nhân, gửi yêu cầu rà soát/khiếu nại.
10. **Chuyển đổi Vai trò (Role Switcher)**: C&B, Hội đồng duyệt, Quản lý trực tiếp, Nhân viên.

### Ưu tiên P1:
- Công cụ mô phỏng What-if thay đổi cấu hình ngưỡng (70%, 100%, 120%, trần 1.5).
- Quick command palette (`Ctrl + K`) để tìm nhanh nhân viên hoặc chuyển màn hình.

---

## 6. DANH SÁCH ẢNH CHỤP HIỆN TRẠNG (BEFORE SCREENSHOTS)

Các ảnh đã được lưu vào thư mục `docs/screenshots/before/`:
1. `01_dashboard.png`: Giao diện Dashboard cũ với thẻ KPI tím, thiếu quy trình 8 bước.
2. `02_task1_calculation.png`: Bảng tính cũ không tương tác được, không có chi tiết dòng.
3. `03_task2_alerts.png`: Cảnh báo lỗi với các nút chết, không có thao tác xử lý.
4. `04_task3_analytics.png`: Biểu đồ cột cũ thiếu đường cong chi trả và phân tích dồn ứ.
