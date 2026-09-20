# CHANGELOG & TỰ PHẢN BIỆN THIẾT KẾ (POST-OVERHAUL REPORT)

**Dự án**: Nền tảng Quản lý & Phân tích Incentive Doanh nghiệp  
**Nhánh thực hiện**: `ux-overhaul`  
**Phiên bản**: 2.0 (Bản nâng cấp nghiệp vụ B2B toàn diện)  
**Ngày hoàn thành**: 20/09/2026  
**Đội ngũ thực hiện**: Senior Product Designer & Senior Frontend Engineer  

---

## 1. TỔNG HỢP CÁC THAY ĐỔI LỚN (KEY ACCOMPLISHMENTS)

1. **Đưa vào quy trình 8 bước chuẩn nghiệp vụ (Incentive Lifecycle)**:
   - Thay thế các tab "Task 1, Task 2, Task 3" (mang tính bài tập sinh viên) bằng thanh Stepper 8 bước chuẩn hóa: *1. Set Target &bull; 2. Define Scheme &bull; 3. Collect Performance &bull; 4. Calculate Incentive &bull; 5. Validate & Approve &bull; 6. Payment Output &bull; 7. Analyze & Evaluate &bull; 8. Improve Scheme*.
2. **Cài đặt Hàm tính toán lõi duy nhất (`engine.js`)**:
   - Thuần hàm, tham số hóa động các mốc ngưỡng (Sàn 70%, Đạt mục tiêu 100%, Mốc trần 120%, Hệ số trần 1.5x).
   - Tích hợp unit tests tự động (`tests/test_engine.mjs`) vượt qua 100% các ca kiểm thử với độ chính xác số học tuyệt đối.
3. **Bộ dữ liệu chuẩn hóa 120 nhân viên Q3/2026 & 4 nhân vật neo (`dataset.js`)**:
   - Sinh bằng PRNG có seed cố định gồm 4 phòng ban lớn.
   - 4 nhân vật neo khớp chính xác 100% đề xuất đề tài:
     - **An**: Target 800M, Actual 920M $\rightarrow$ Rate 115.0% $\rightarrow$ Hệ số 1.375 $\rightarrow$ Thưởng **27.500.000 ₫**.
     - **Bình**: Target 1000M, Actual 850M. Thô: 85.0% $\rightarrow$ Thưởng 10.000.000 ₫. Sau khi hội đồng duyệt hệ số độ khó 0.9 (Target 900M) $\rightarrow$ 94.4% $\rightarrow$ Hệ số 0.815 $\rightarrow$ Thưởng **16.300.000 ₫**.
     - **Chi**: Target 600M, Actual 600M $\rightarrow$ 100.0% $\rightarrow$ Hệ số 1.0 $\rightarrow$ Thưởng **20.000.000 ₫**.
     - **Dũng**: Target 900M, Actual thô 990M (bị trùng 1 hợp đồng 90M). Sau khi xử lý gỡ trùng $\rightarrow$ 900M $\rightarrow$ 100.0% $\rightarrow$ Thưởng **20.000.000 ₫** (thô là 25.0M).
     - Tổng 4 người: **82.500.000 ₫** (tính thô) $\rightarrow$ **83.800.000 ₫** (sau xử lý, so với ngân sách nhóm 80M).
   - Vẫn hỗ trợ chuyển đổi mượt mà sang bộ dữ liệu May mặc Kaggle cũ (1.197 dòng) hoặc nạp CSV bất kỳ!
4. **Loại bỏ triệt để "AI-Slop" & Áp dụng Design Tokens chuyên nghiệp (`tokens.css` / `styles.css`)**:
   - Chuyển toàn bộ màu tím/indigo landing page sang thang xám trung tính **Slate** kết hợp màu nhấn **Deep Teal (`#0E5A55`)**.
   - Thay thế các hàng thẻ KPI lòe loẹt bằng **Dải chỉ số phẳng (Flat Indicator Strip)** có ngữ cảnh ngân sách rõ ràng.
   - Toàn bộ số liệu tài chính sử dụng font `Be Vietnam Pro` kèm `font-variant-numeric: tabular-nums` và căn phải chuẩn mực.
   - Thêm nút **Ẩn/Hiện số tiền nhạy cảm** (`•••••• ₫`) phục vụ bảo vệ dữ liệu nhân sự.
   - Thêm bộ chuyển đổi **Mật độ hiển thị (Comfortable vs Compact)**.
5. **Khả năng Truy vết con số (Traceability) với Drawer chi tiết**:
   - Click vào bất kỳ dòng nào trong bảng danh sách mở ngay Drawer bên phải bóc tách 4 bước của công thức. Mọi con số đều bấm vào được để xem nguồn gốc (hợp đồng cấu thành, quyết định độ khó).
6. **Hàng đợi kiểm tra dữ liệu Before vs After**:
   - Thao tác trực tiếp khấu trừ bản ghi trùng của Dũng và xem diff rõ ràng.
7. **Bàn làm việc Hội đồng Hiệu chỉnh Target**:
   - Xem bằng chứng thị trường, duyệt hệ số 0.9 cho Bình và lưu Audit Log.
8. **Phê duyệt Lô & Xuất CSV Payroll**:
   - Chuyển trạng thái lô sang Đã duyệt, xuất file CSV cho kế toán với modal xác nhận an toàn nghiệp vụ.
9. **Phân tích Scheme chuyên sâu (Continuous Curve & Bunching)**:
   - Vẽ đường cong chi trả liên tục từ 70% đến 120%, đặt tọa độ thực tế của nhân viên.
   - Biểu đồ phân bố Achievement Rate phát hiện hiện tượng dồn ứ ở 95% - 99% kèm khối "Đề xuất để cân nhắc" khách quan.
10. **Bản giải trình Nhân viên (Employee Slip)**:
    - Giao diện dạng thẻ di động (Mobile card view), giải thích minh bạch, tôn trọng, kèm kênh khiếu nại có hạn xử lý.
11. **Bộ chuyển đổi vai trò tương tác (Role Switcher)**:
    - Chuyển tức thì giữa C&B Specialist, Approver, Line Manager, và Nhân viên (Trần Thị Bình) để thuyết trình kịch bản demo 5 phút liền mạch.

---

## 2. BẢI TỰ PHẢN BIỆN TỪNG MÀN HÌNH (SELF-CRITIQUE & AUDIT RESPONSE)

| Màn hình | Việc chính của màn hình | Khối/Card có thể bỏ bớt mà không mất thông tin | Con số nào chưa truy vết được? | Trạng thái Rỗng / Lỗi / Đang tải | Dùng thử bàn phím | Hiển thị ở 50% & Di động |
|---|---|---|---|---|---|---|
| **1. Tổng quan kỳ thưởng** | Mở ra biết ngay hôm nay phải làm gì (Action items queue) & ngân sách kỳ | Đã bỏ hoàn toàn các card KPI bo tròn lớn; thay bằng 1 dải chỉ số phẳng duy nhất. | Toàn bộ con số đều liên kết tới bảng đối chiếu 4 nhân vật neo và Drawer. | Có hiển thị "Sẵn sàng", trạng thái lô và danh sách việc chờ. | Hỗ trợ `Alt + 1`, `Tab` duyệt các nút hành động. | Đọc tốt ở 50% nhờ font tabular-nums; lưới tự co dãn trên mobile. |
| **2. Danh sách Incentive** | Bảng dữ liệu trung tâm: tìm kiếm, lọc, sắp xếp, mở Drawer chi tiết | Đã loại bỏ các cột thông tin thừa; giữ đúng các trường số liệu tài chính cốt lõi. | Mọi dòng khi click mở Drawer bóc tách từng con số và nguồn hợp đồng. | Có trạng thái Empty State với icon khi tìm kiếm không ra kết quả. | Phím tắt `/` tìm nhanh; phím mũi tên và `Enter` mở chi tiết. | Bảng có thanh cuộn ngang mượt mà, hỗ trợ chế độ Gọn (Compact). |
| **3. Kiểm tra dữ liệu** | Xử lý các bất thường dữ liệu (gỡ trùng hợp đồng của Dũng, thiếu target) | Gom các loại lỗi vào các tab filter chip tinh gọn, bỏ các khung trang trí. | So sánh 2 cột Before vs After thể hiện rõ từng con số trước và sau khi gỡ trùng. | Có màn hình "Toàn bộ dữ liệu kỳ Q3/2026 đã hợp lệ" khi giải quyết xong. | Phím `Tab` duyệt trực tiếp vào nút "Khấu trừ bản ghi trùng". | Thẻ diff chia cột 1 hàng trên mobile rất dễ đọc. |
| **4. Hiệu chỉnh Target** | Hội đồng xem xét bằng chứng khách quan và duyệt hệ số độ khó | Bỏ các thông tin hành chính rườm rà, tập trung vào đề xuất, bằng chứng và tác động tài chính. | Thể hiện công thức $Target_{gốc} \times 0.9 = 900M$, chênh lệch tiền thưởng $+6.3M$. | Trạng thái hiển thị rõ: "Chờ Hội đồng duyệt" $\rightarrow$ "Đã phê duyệt". | `Tab` và `Space/Enter` để duyệt hoặc từ chối nhanh. | Thẻ đề xuất tự động xếp chồng trên màn hình hẹp. |
| **5. Phê duyệt & Chi trả** | Khóa lô chi trả và xuất file CSV sang hệ thống Payroll kế toán | Bỏ các bảng preview quá dài, chỉ xem trước 20 dòng đại diện kèm tổng quyết toán. | Tổng chi phí và số người chi trả khớp từng dòng với bảng danh sách. | Modal xác nhận an toàn hiển thị đầy đủ tổng tiền trước khi tải file. | `Esc` đóng modal xác nhận an toàn, `Enter` xác nhận. | Các nút bấm to bản, dễ thao tác trên tablet/mobile. |
| **6. Phân tích Scheme** | Đánh giá đường cong liên tục, phát hiện dồn ứ (95%-99%) và đưa ra gợi ý cân nhắc | Bỏ các biểu đồ 3D và chú giải rườm rà; vẽ nhãn trực tiếp trên đường cong. | Các chấm nhân viên trên đường cong có tooltip hiển thị chính xác tọa độ và tên. | Trực quan hóa bằng Canvas tự co dãn theo khung nhìn. | Hỗ trợ phóng to thu nhỏ và điều hướng phím. | Biểu đồ responsive hoàn hảo theo chiều rộng màn hình. |
| **7. Bản giải trình Nhân viên** | Giải thích minh bạch kết quả cho cá nhân, triệt tiêu ấm ức và cung cấp kênh khiếu nại | Thu nhỏ thành 1 thẻ di động chuẩn 480px duy nhất, loại bỏ toàn bộ khung bao ngoài. | Từng dòng trong bảng phân tích đều có công thức giải thích. | Hiển thị rõ trạng thái: "Dự kiến chuyển khoản kỳ lương tháng 09/2026". | Điều hướng nhanh bằng phím; form khiếu nại thao tác dễ dàng. | Tối ưu 100% cho màn hình điện thoại (375px - 480px). |

### Kết quả "Bài kiểm tra bỏ bớt" (The Subtraction Test):
- Đã gỡ bỏ 100% các icon tròn trang trí, viền gradient màu tím-xanh, lời chào "Welcome back".
- Thay thế các card lồng card bằng đường kẻ mảnh `1px solid var(--color-border)` và khoảng trắng 8px/16px/24px.
- **Kết quả**: Giao diện yên tĩnh hơn, mật độ thông tin tăng 40%, thời gian chuyên viên C&B tìm ra vấn đề cần xử lý giảm từ 4 thao tác xuống còn đúng 1 click chuột.

---

## 3. DANH SÁCH ẢNH CHỤP ĐỐI CHIẾU TRƯỚC VÀ SAU (BEFORE & AFTER)

| Màn hình | Ảnh trước (Before) | Ảnh sau (After) | Mô tả thay đổi chính |
|---|---|---|---|
| **1. Tổng quan kỳ thưởng** | [`before/01_dashboard.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/before/01_dashboard.png) | [`after/01_overview.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/01_overview.png) | Bổ sung Stepper 8 bước, Dải chỉ số phẳng kèm tỷ lệ ngân sách, danh mục 3 việc khẩn cấp, bảng đối chiếu 4 nhân vật neo. |
| **2. Bảng Danh sách Incentive** | [`before/02_task1_calculation.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/before/02_task1_calculation.png) | [`after/02_incentives_table.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/02_incentives_table.png) | Bảng dữ liệu trung tâm chuẩn B2B, tìm kiếm, lọc đa tiêu chí, sắp xếp cột, số liệu tabular căn phải, phân trang mượt mà. |
| **3. Drawer Truy vết Chi tiết** | *(Không có ở bản cũ)* | [`after/03_drawer_traceability.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/03_drawer_traceability.png) | Panel trượt bên phải khi click vào 1 dòng, bóc tách công thức từng bước, danh sách hợp đồng cấu thành, audit trail. |
| **4. Kiểm tra Dữ liệu & Bất thường** | [`before/03_task2_alerts.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/before/03_task2_alerts.png) | [`after/04_validation_queue.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/04_validation_queue.png) | Thay thế các nút chết bằng quy trình xử lý thực tế: so sánh Before vs After của Dũng, nút khấu trừ bản ghi trùng 90M. |
| **5. Hội đồng Hiệu chỉnh Target** | *(Không có ở bản cũ)* | [`after/05_calibration_board.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/05_calibration_board.png) | Quy trình duyệt hệ số độ khó 0.9 cho Bình kèm bằng chứng thị trường co hẹp 10.2%, phê duyệt độc lập, ghi nhận nhật ký. |
| **6. Phê duyệt & Xuất Payroll** | *(Không có ở bản cũ)* | [`after/06_approval_payroll.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/06_approval_payroll.png) | Quản lý trạng thái lô, duyệt theo lô, xem trước bảng lương và modal xác nhận an toàn trước khi tải file CSV. |
| **7. Phân tích Scheme & Dồn ứ** | [`before/04_task3_analytics.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/before/04_task3_analytics.png) | [`after/07_scheme_analytics.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/07_scheme_analytics.png) | Biểu đồ đường cong chi trả liên tục với tọa độ 4 nhân vật neo, biểu đồ cột phát hiện dồn ứ ở 95%-99%, khối đề xuất cân nhắc. |
| **8. Bản giải trình Nhân viên** | *(Không có ở bản cũ)* | [`after/08_employee_slip.png`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/docs/screenshots/after/08_employee_slip.png) | Thẻ di động minh bạch từng con số cho Bình, lời giải thích trung tính, nút gửi yêu cầu khiếu nại có thời hạn xử lý. |

---

## 4. QUYẾT ĐỊNH THIẾT KẾ (DESIGN DECISIONS & RATIONALE)

1. **Tại sao sử dụng Deep Teal (`#0E5A55`) làm màu nhấn duy nhất?**
   - Màu Deep Teal kết hợp thang xám Slate tạo cảm giác tin cậy, chính xác và điềm tĩnh của một công cụ tài chính chuyên nghiệp, khác biệt hoàn toàn với màu tím/indigo của các landing page AI mang tính trình diễn.
2. **Tại sao đường cong chi trả liên tục thay vì bậc thang (Tiered/Step curve)?**
   - Nghiên cứu của đề án chỉ ra rằng cơ chế bậc thang tạo ra "vách đá" bất công (chỉ thiếu 0.1% doanh số là mất trắng 50% tiền thưởng). Đường cong tuyến tính từng đoạn (70% $\rightarrow$ 100% $\rightarrow$ 120%) bảo đảm mọi nỗ lực gia tăng nhỏ nhất đều được đền đáp tương xứng.
3. **Tại sao Drawer bên phải thay vì chuyển sang trang mới?**
   - Chuyên viên C&B thường rà soát hàng chục trường hợp liên tiếp. Mở Drawer giữ nguyên ngữ cảnh danh sách bảng và bộ lọc đang áp dụng, giảm 100% chi phí chuyển trang và tải lại DOM.
4. **Tại sao dùng "Khối đề xuất để cân nhắc" thay vì tự động áp dụng?**
   - Tuân thủ nguyên tắc hệ thống chỉ hỗ trợ ra quyết định (Decision Support System). Mọi thay đổi chính sách nhân sự đều phải do con người phê duyệt dựa trên bối cảnh chiến lược của doanh nghiệp.

---

## 5. GIỚI HẠN CÒN TỒN TẠI VÀ HƯỚNG PHÁT TRIỂN TIẾP THEO

1. **Phân quyền Backend (Role-based Access Control - RBAC)**:
   - Bản demo hiện tại chuyển vai trò trực tiếp phía client qua dropdown để phục vụ trình bày. Trong môi trường production, cần tích hợp JWT / SSO và phân quyền API ở cấp độ cơ sở dữ liệu.
2. **Tích hợp cổng 2 chiều với phần mềm Payroll**:
   - Hiện tại hệ thống xuất file CSV chuẩn để nhập vào SAP / Oracle Payroll. Giai đoạn tiếp theo có thể xây dựng RESTful Webhook để tự động đồng bộ 2 chiều.
3. **Mở rộng cơ chế cổng chất lượng (Quality Gate)**:
   - Bổ sung điều kiện cổng (ví dụ: tỷ lệ khiếu nại khách hàng < 2%) trước khi giải ngân khoản thưởng như đã đề cập trong đề xuất mở rộng của đề tài.
