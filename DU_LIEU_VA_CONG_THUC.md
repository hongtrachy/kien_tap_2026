# TÀI LIỆU CẤU TRÚC DỮ LIỆU VÀ CÔNG THỨC TÍNH TOÁN
## Hệ thống Quản lý và Đề xuất Thưởng Thông minh (Incentive Management & Analytics)

Tài liệu này mô tả chi tiết toàn bộ mô hình dữ liệu, ý nghĩa các trường thông tin, các công thức toán học - nghiệp vụ và các chỉ số tài chính được áp dụng trong hệ thống.

---

## 1. Mô hình Dữ liệu (Data Schema)

Hệ thống quản lý dữ liệu xoay quanh 4 thực thể chính: **Nhân viên (Employee)**, **Đầu việc / Gói việc (Task/Package)**, **Đánh giá Quản lý (Manager Evaluation)**, và **Dữ liệu Lịch sử & Theo ngày (Historical & Daily Records)**.

### 1.1. Thực thể Nhân viên (Employee)
Bảng thông tin hồ sơ và tổng hợp kết quả của nhân viên trong kỳ đánh giá:

| Tên trường | Kiểu dữ liệu | Đơn vị | Phân loại | Ý nghĩa & Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Chuỗi (String) | Mã định danh | Đầu vào | Mã nhân viên duy nhất (VD: `EMP-001`) |
| `code` | Chuỗi (String) | Mã nội bộ | Đầu vào | Mã số nhân viên theo phòng ban (VD: `MB-014`) |
| `name` | Chuỗi (String) | Họ và tên | Đầu vào | Họ và tên đầy đủ của nhân viên |
| `department` | Chuỗi (String) | Tên phòng | Đầu vào | Bộ phận trực thuộc (Kinh doanh Miền Bắc, Miền Nam, B2B, Vận hành Bán lẻ) |
| `position` | Chuỗi (String) | Chức danh | Đầu vào | Vị trí công tác (VD: Chuyên viên Kinh doanh, Quản lý Khách hàng) |
| `level` | Số nguyên | Cấp bậc (1-7) | Đầu vào | Cấp bậc chuyên môn, dùng xác định nhóm đồng cấp và dải chuẩn |
| `seniority` | Số thực | Năm | Đầu vào | Thâm niên công tác tại công ty |
| `baseSalary` | Số nguyên | VNĐ/tháng | Đầu vào | Mức lương cơ bản thỏa thuận trong hợp đồng |
| `baseIncentive` | Số nguyên | VNĐ/kỳ | Đầu vào | Mức thưởng mục tiêu cơ sở theo vị trí (chuẩn: 20.000.000 ₫) |
| `targetIncentive` | Số nguyên | VNĐ/kỳ | Kết quả | Mức thưởng mục tiêu cá nhân hóa sau khi nhân hệ số quy mô ($S_w$) |
| `scaleFactor` | Số thực | Hệ số | Kết quả | Hệ số quy mô ($S_w$), nằm trong khoảng $[0,85; 1,20]$ |
| `status` | Chuỗi (Enum) | Trạng thái | Đầu vào/Quy trình | Trạng thái hồ sơ: `CHO_XU_LY`, `DA_TINH`, `CAN_XEM_XET`, `DA_DUYET`, `DA_CHI_TRA` |
| `validationStatus`| Chuỗi (Enum) | Kiểm tra | Kết quả | Trạng thái toàn vẹn dữ liệu: `HOP_LE`, `TRUNG_LAP`, `THIEU_CHI_TIEU`, `CHUA_GAN_CO_CHE`, `BAT_THUONG` |

### 1.2. Thực thể Đầu việc / Gói việc (Task / Work Package)
Mỗi nhân viên trong kỳ có từ 4 đến 6 đầu việc/gói hợp đồng cụ thể:

| Tên trường | Kiểu dữ liệu | Đơn vị | Phân loại | Ý nghĩa & Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Chuỗi | Mã gói | Đầu vào | Mã định danh đầu việc (VD: `TASK-001-01`) |
| `name` | Chuỗi | Tên đầu việc | Đầu vào | Tên gói công việc hoặc hợp đồng kinh doanh |
| `target` | Số thực | Triệu VNĐ | Đầu vào | Doanh số hoặc giá trị chỉ tiêu giao kết ban đầu |
| `actual` | Số thực | Triệu VNĐ | Đầu vào | Doanh số hoặc giá trị nghiệm thu thực tế |
| `packageValue` | Số thực | Triệu VNĐ | Đầu vào | Quy mô tổng thể của gói thầu / dự án |
| `complexityFactor`| Số thực | Hệ số ($\ge 0,5$) | Đầu vào | Hệ số độ phức tạp kỹ thuật/nghiệp vụ của gói việc (mặc định: 1,0) |
| `difficultyFactor`| Số thực | Hệ số | Đầu vào/Duyệt | Hệ số độ khó thị trường/khách quan (mặc định 1,0; cần Hội đồng duyệt nếu $\ne 1,0$) |
| `benefitType` | Chuỗi (Enum) | Phân loại | Đầu vào | Mục tiêu lợi ích kỳ vọng: `doanh_thu`, `tiet_kiem_chi_phi`, `hop_dong_moi` |
| `contribution` | Số thực | Tỷ lệ ($0-1$) | Đầu vào | Tỷ lệ phần trăm đóng góp của nhân viên vào gói việc đó |
| `weight` | Số thực | Điểm trọng số | Kết quả | Trọng số $w_i = \text{packageValue}_i \times \text{complexityFactor}_i$ |
| `achievementRate`| Số thực | Tỷ lệ | Kết quả | Tỷ lệ đạt của đầu việc: $\min\left(1,5, \frac{\text{actual}_i}{\text{target}_i \times \text{difficultyFactor}_i}\right)$ |

### 1.3. Thực thể Đánh giá của Quản lý (Manager Evaluation)
Quản lý trực tiếp chấm điểm định kỳ theo 4 tiêu chí cốt lõi:

| Tiêu chí | Thang điểm | Trọng số nội bộ | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `quality` (Chất lượng công việc) | $1,0 - 5,0$ | 30% | Độ chuẩn xác, không lỗi, sự hài lòng của khách hàng/đối tác |
| `collaboration` (Tinh thần hợp tác) | $1,0 - 5,0$ | 25% | Hỗ trợ đồng đội, phối hợp liên phòng ban |
| `initiative` (Chủ động & Đóng góp vượt trội) | $1,0 - 5,0$ | 25% | Đề xuất giải pháp, nhận việc khó ngoài phạm vi mô tả công việc |
| `objectiveDifficulty` (Khó khăn khách quan) | $1,0 - 5,0$ | 20% | Đánh giá mức độ biến động tiêu cực của thị trường/đối tác ngoài tầm kiểm soát |

- **Nhận xét của Quản lý (`comment`)**: Diễn giải ngắn gọn lý do đánh giá.
- **Mức điều chỉnh của Quản lý ($\Delta_{\text{quản\_lý}}$)**: Được tính sau khi chuẩn hóa z-score theo thói quen chấm của quản lý đó, kẹp trong khoảng $[-15\%, +15\%]$ (tức $-0,15$ đến $+0,15$).

### 1.4. Dữ liệu Theo Ngày (Daily Data - Mô phỏng)
- **Chu kỳ chính**: Dữ liệu tính thưởng cốt lõi được chốt theo **Kỳ (Tháng hoặc Quý)**.
- **Dữ liệu theo ngày**: Để phục vụ tính năng "Tính đến ngày" (ví dụ: xem đến ngày 20 của tháng), hệ thống sinh dữ liệu phân bổ theo ngày làm việc (22 ngày công/tháng) bằng hàm giả ngẫu nhiên có seed cố định (PRNG).
- **Ràng buộc bảo toàn**: Tổng lũy kế thực đạt và chỉ tiêu phân bổ của các ngày công từ ngày 1 đến ngày cuối tháng **khớp chính xác 100%** với tổng số liệu tháng của nhân viên.
- **Ghi chú minh bạch**: Hệ thống hiển thị rõ ràng thông báo "Dữ liệu chi tiết theo ngày là dữ liệu phân bổ mô phỏng có kiểm soát để phục vụ dự phóng tiến độ".

---

## 2. Các Công thức Nghiệp vụ Cốt lõi

### 2.1. Tỷ lệ Đạt Chỉ tiêu Có Trọng số ($R_{\text{thực\_đạt\_w}}$)
Thay vì chia tổng thực đạt cho tổng chỉ tiêu một cách cào bằng, hệ thống tính tỷ lệ đạt từng gói việc và nhân trọng số theo quy mô - độ phức tạp:

$$w_i = \text{packageValue}_i \times \text{complexityFactor}_i$$

$$\text{Rate}_i = \min\left(1,5, \frac{\text{actual}_i}{\text{target}_i \times \text{difficultyFactor}_i}\right)$$

$$R_{\text{thực\_đạt\_w}} = \frac{\sum_{i=1}^n (w_i \times \text{Rate}_i)}{\sum_{i=1}^n w_i}$$

### 2.2. Đường cong Chi trả Thưởng theo Quy tắc ($R_{\text{quy\_tắc}}$)
Tỷ lệ đạt có trọng số $R_{\text{thực\_đạt\_w}}$ được đưa qua hàm đường cong chi trả chuẩn liên tục:

$$R_{\text{quy\_tắc}} = \begin{cases} 
0 & \text{nếu } R_{\text{thực\_đạt\_w}} < 0,70 \\
\frac{R_{\text{thực\_đạt\_w}} - 0,70}{1,00 - 0,70} \times 1,0 = \frac{R_{\text{thực\_đạt\_w}} - 0,70}{0,30} & \text{nếu } 0,70 \le R_{\text{thực\_đạt\_w}} \le 1,00 \\
1,0 + \frac{R_{\text{thực\_đạt\_w}} - 1,00}{1,20 - 1,00} \times 0,5 = 1,0 + \frac{R_{\text{thực\_đạt\_w}} - 1,00}{0,40} & \text{nếu } 1,00 < R_{\text{thực\_đạt\_w}} \le 1,20 \\
1,5 & \text{nếu } R_{\text{thực\_đạt\_w}} > 1,20 
\end{cases}$$

### 2.3. Hệ số Quy mô Cá nhân hóa Mức thưởng Mục tiêu ($S_w$)
Để phản ánh khối lượng công việc thực tế giữa những người cùng vị trí:

$$S_w = \text{kẹp}\left( \sqrt{\frac{\sum w_{\text{nhân\_viên}}}{\text{Trung vị}(\sum w_{\text{nhóm\_cùng\_vị\_trí}})}}, 0,85, 1,20 \right)$$

$$\text{TargetIncentive}_{\text{cá\_nhân}} = \text{BaseIncentive} \times S_w$$

### 2.4. Công thức Đề xuất Mức thưởng Thông minh (Kết hợp 3 nguồn)
Hệ thống tổng hợp 3 thành phần độc lập:

1. **$R_{\text{quy\_tắc}}$**: Tỷ lệ thưởng theo quy chế định lượng công việc hiện tại.
2. **$R_{\text{học\_máy}}$**: Tỷ lệ thưởng dự đoán từ mô hình học máy (dựa trên 4 kỳ lịch sử, xu hướng, thâm niên, cấp bậc, tính ổn định; không chứa thuộc tính nhạy cảm). Kèm khoảng tin cậy $[P_{10}, P_{90}]$.
3. **$\Delta_{\text{quản\_lý}}$**: Độ lệch điều chỉnh từ quản lý trực tiếp (sau chuẩn hóa, trong khoảng $[-15\%, +15\%]$).

**Bước 1: Tính tỷ lệ nền ($R_{\text{nền}}$)**:
$$R_{\text{nền}} = 0,7 \times R_{\text{quy\_tắc}} + 0,3 \times R_{\text{học\_máy}}$$

**Bước 2: Tính tỷ lệ đề xuất ($R_{\text{đề\_xuất}}$)**:
$$R_{\text{tạm}} = R_{\text{nền}} + \Delta_{\text{quản\_lý}}$$

Áp dụng ràng buộc dải linh động $\text{FlexBand} = \pm 20\%$ so với $R_{\text{quy\_tắc}}$ và trần tối đa $150\%$:
$$R_{\text{đề\_xuất}} = \max\left(0, \min\left(1,5, \text{kẹp}(R_{\text{tạm}}, R_{\text{quy\_tắc}} - 0,20, R_{\text{quy\_tắc}} + 0,20)\right)\right)$$

**Bước 3: Quyết định của Quản lý ($R_{\text{cuối}}$) và Duyệt cấp hai**:
- Quản lý có quyền chốt $R_{\text{cuối}} = R_{\text{đề\_xuất}}$ hoặc điều chỉnh sang mức mong muốn kèm lý do.
- **Quy tắc kiểm soát**: Nếu $|R_{\text{cuối}} - R_{\text{đề\_xuất}}| > 10\%$ (0,10), hệ thống bắt buộc nhập lý do văn bản và tự động chuyển lên **Duyệt cấp hai (Admin / Nhân sự & Tài chính)**.

**Bước 4: Tiền thưởng đề xuất thực nhận**:
$$\text{Tiền\_thưởng} = \text{TargetIncentive}_{\text{cá\_nhân}} \times R_{\text{cuối}}$$

---

## 3. Các Chỉ số Doanh nghiệp Bổ sung

Để đáp ứng đầy đủ yêu cầu quản trị C&B thực tế, hệ thống tính toán và hiển thị các chỉ số sau:

| Chỉ số | Ký hiệu / Công thức | Ý nghĩa quản trị |
| :--- | :--- | :--- |
| **Tiến độ thời gian đã qua** | $P_{\text{time}} = \frac{\text{Số ngày làm việc đã qua}}{\text{Tổng số ngày làm việc trong kỳ}} \times 100\%$ | Cho biết đã trôi qua bao nhiêu phần trăm thời gian của kỳ |
| **Tốc độ hoàn thành (Velocity)** | $V = \frac{R_{\text{thực\_đạt\_w đến ngày}}}{P_{\text{time}}}$ | Nếu $V > 1,0$: đang vượt tiến độ thời gian; nếu $V < 1,0$: đang chậm tiến độ |
| **Dự phóng hoàn thành cuối kỳ** | $R_{\text{dự\_phóng}} = R_{\text{thực\_đạt\_w đến ngày}} + (1 - P_{\text{time}}) \times V \times R_{\text{lịch\_sử\_trung\_bình}}$ | Ước tính tỷ lệ hoàn thành khi kết thúc kỳ nếu duy trì tốc độ hiện tại |
| **Thưởng tạm tính đến ngày** | $\text{Incentive}_{\text{tạm\_tính}} = \text{TargetIncentive} \times \text{Curve}(R_{\text{thực\_đạt\_w đến ngày}})$ | Ước tính số tiền thưởng nhân viên đã tích lũy được đến thời điểm xem |
| **Tổng chi phí thưởng so với Quỹ** | $\text{Tỷ lệ sử dụng quỹ} = \frac{\sum \text{Tiền thưởng thực tế}}{\text{Ngân sách quỹ thưởng}} \times 100\%$ | Cảnh báo đỏ nếu vượt 100%; hỗ trợ tính hệ số co giãn đều khi vượt quỹ |
| **Tỷ lệ Thưởng trên Doanh thu** | $\text{Incentive-to-Revenue} = \frac{\sum \text{Tiền thưởng}}{\sum \text{Doanh số thực tế}} \times 100\%$ | Đo lường hiệu quả chi phí: mỗi đồng doanh thu mang về tốn bao nhiêu đồng thưởng |
| **Số người sát mốc thưởng (Bunching)**| Số NV có $R \in [95\%, 99,9\%]$ và $[65\%, 69,9\%]$ | Phát hiện nhân viên nản lòng hoặc cố tình dồn số sát ngưỡng để tối ưu cơ chế |

---

## 4. Bảng Tra cứu và Bảo toàn 4 Nhân vật Neo (Ground Truth Benchmark)

Hệ thống bảo đảm tính chính xác toán học tuyệt đối của 4 nhân vật neo (mức thưởng mục tiêu cơ sở: 20.000.000 ₫):

| Nhân vật | Chỉ tiêu tổng | Thực đạt ghi nhận | Trạng thái xử lý nghiệp vụ | Tỷ lệ đạt ($R_{\text{thực\_đạt\_w}}$) | Hệ số chi trả ($R_{\text{quy\_tắc}}$) | Tiền thưởng quy tắc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **An (EMP-001)** | 800M | 920M | Chuẩn, không vướng cảnh báo | 115,0% | 1,375 | **27.500.000 ₫** |
| **Bình (EMP-002)** | 1.000M | 850M | **Tính thô** (Hệ số độ khó = 1,0) | 85,0% | 0,500 | **10.000.000 ₫** |
| | 1.000M | 850M | **Sau duyệt độ khó 0,9** (Target hiệu chỉnh 900M) | 94,44% | 0,8148 | **16.296.300 ₫** (làm tròn báo cáo: **16,3M**) |
| **Chi (EMP-003)** | 600M | 600M | Chuẩn đạt mốc 100% | 100,0% | 1,000 | **20.000.000 ₫** |
| **Dũng (EMP-004)**| 900M | 990M | **Tính thô** (Có hợp đồng trùng 90M) | 110,0% | 1,250 | **25.000.000 ₫** |
| | 900M | 900M | **Sau gỡ trùng hợp đồng 90M** | 100,0% | 1,000 | **20.000.000 ₫** |

- **Tổng quỹ kế hoạch 4 người**: 80.000.000 ₫ (4 người $\times$ 20.000.000 ₫).
- **Tổng chi thưởng thô ban đầu**: 82.500.000 ₫.
- **Tổng chi thưởng sau gỡ trùng và duyệt hiệu chỉnh**: 83.800.000 ₫ (vượt nhẹ 104,8% quỹ, hoàn toàn trong dải dự phòng tài chính).
