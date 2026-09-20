# CHANGELOG & TỰ PHẢN BIỆN THIẾT KẾ (POST-OVERHAUL REPORT)

**Dự án**: Nền tảng Quản lý và Đề xuất Thưởng Thông minh (Incentive Management & Analytics)  
**Nhánh thực hiện**: `feature/de-xuat-thuong-thong-minh` (Tạo từ `ux-overhaul`)  
**Phiên bản**: 3.0 (Bản nâng cấp Đề xuất Thưởng Thông minh 3 Nguồn & Menu Ngang)  
**Ngày cập nhật**: 20/09/2026  

---

## 1. TỔNG HỢP CÁC THAY ĐỔI MỚI THEO GÓP Ý CỦA GIẢNG VIÊN HƯỚNG DẪN (ĐỢT 2)

### 1.1. Đề xuất Mức thưởng Thông minh Kết hợp 3 Nguồn (Tính năng Lõi)
1. **Thành phần 1 - Thưởng theo Quy tắc ($R_{\text{quy\_tắc}}$)**:
   - Phân rã mỗi nhân viên thành 4-6 gói việc cụ thể có giá trị gói, hệ số phức tạp, hệ số độ khó, phân loại lợi ích kỳ vọng (`doanh_thu`, `tiet_kiem_chi_phi`, `hop_dong_moi`) và tỷ lệ đóng góp.
   - Tính tỷ lệ đạt có trọng số $R_{\text{thực\_đạt\_w}} = \sum(w_i \times \text{Rate}_i) / \sum w_i$, đưa qua đường cong quy chế chuẩn.
   - Cá nhân hóa mức thưởng mục tiêu bằng hệ số quy mô $S_w = \sqrt{\sum w_i / \text{Median}(w_{\text{nhóm}})}$, kẹp $[0,85; 1,20]$.
2. **Thành phần 2 - Học máy Dự báo ($R_{\text{học\_máy}}$)**:
   - Pipeline học máy Scikit-Learn Gradient Boosting Regressor huấn luyện offline trên 4 kỳ lịch sử (Q3/2025 - Q2/2026), dự báo $R_{\text{học\_máy}}$ kèm khoảng tin cậy $[P_{10}, P_{90}]$.
   - **Đạo đức dữ liệu**: Tuyệt đối loại bỏ giới tính, tuổi, tình trạng hôn nhân, quê quán khỏi tập đặc trưng.
   - Xuất dữ liệu tĩnh sang `DEMO/data/ml_predictions.json` và `DEMO/data/model_card.json`.
3. **Thành phần 3 - Đánh giá của Quản lý ($\Delta_{\text{quản\_lý}}$)**:
   - Đánh giá có cấu trúc theo 4 tiêu chí (chất lượng, hợp tác, chủ động, khó khăn khách quan).
   - Chuẩn hóa z-score theo thói quen chấm điểm của quản lý, quy ra $\Delta_{\text{quản\_lý}} \in [-15\%, +15\%]$.
4. **Công thức kết hợp có kiểm soát**:
   - $R_{\text{nền}} = 0,7 \times R_{\text{quy\_tắc}} + 0,3 \times R_{\text{học\_máy}}$
   - $R_{\text{đề\_xuất}} = R_{\text{nền}} + \Delta_{\text{quản\_lý}}$, kẹp dải linh động $\pm 20\%$ quanh $R_{\text{quy\_tắc}}$, trần $150\%$.
   - Quản lý chốt mức thưởng cuối. Nếu lệch quá 10 điểm phần trăm so với đề xuất, bắt buộc có lý do chi tiết và chuyển sang Hội đồng Admin duyệt cấp hai.
5. **Thanh kéo What-If & Khung Hỏi & Đáp (Template-based Q&A)**:
   - Thanh kéo mô phỏng mức thưởng từ 0% đến 150%, tự động tính toán chi phí, độ lệch và bật cảnh báo duyệt cấp hai.
   - Khung hỏi đáp cho quản lý giải thích lý do đề xuất, so sánh đồng nghiệp cùng vị trí, và tự động kiểm tra điều kiện đề xuất thăng tiến.

### 1.2. Menu Ngang Theo Luồng Nghiệp vụ & Xác thực Mô phỏng
- **Chuyển đổi Menu**: Bỏ sidebar bên trái, chuyển lên menu ngang phía trên theo luồng chuẩn:
  - *Admin & Quản lý*: Tổng quan $\rightarrow$ Danh mục nhân viên $\rightarrow$ Thông tin nhân viên $\rightarrow$ Hiệu suất làm việc $\rightarrow$ Đề xuất mức thưởng $\rightarrow$ Kiểm tra dữ liệu $\rightarrow$ Tính thưởng và chi trả.
  - *Nhân viên*: Tổng quan của tôi $\rightarrow$ Hồ sơ của tôi $\rightarrow$ Hiệu suất của tôi $\rightarrow$ Thưởng của tôi.
  - *Thanh bước mảnh (Thin Stepper)* trong Đề xuất: `Hiệu suất` $\rightarrow$ `Đề xuất` $\rightarrow$ `Quyết định` $\rightarrow$ `Duyệt cấp hai` $\rightarrow$ `Thông tin chi tiết`.
- **Phân quyền chặt chẽ**: Mỗi route/tab và hàm xử lý đều kiểm tra thẩm quyền vai trò (`AppAuth.checkRoutePermission`). Nhân viên bị chặn truy cập dữ liệu của người khác kể cả khi gõ trực tiếp URL hash.
- **Nút chuyển nhanh vai trò**: Hỗ trợ người thuyết trình chuyển đổi nhanh giữa Admin, Quản lý và Nhân viên mà không cần đăng nhập lại.

### 1.3. Tổng quan Nâng cấp & Khối Tối ưu Cơ chế Thưởng
- **Bộ lọc thời gian**: Chọn Kỳ (Q3/2026, Q2/2026...) và chọn "Tính đến ngày" (Ví dụ: Ngày 15 / Tuần 3), kết hợp bộ lọc bộ phận.
- **Dải chỉ số phẳng**: Tỷ lệ đạt có trọng số, Thưởng tạm tính, Chi phí so với quỹ, Tiến độ thời gian. Mỗi chỉ số có nút "Cách tính" mở modal giải thích công thức với số liệu thật.
- **Khối Tối ưu Cơ chế Thưởng**: Chuyển từ Task 3 lên Tổng quan, đưa ra 3 đề xuất cụ thể (Hiệu chỉnh độ khó Đông Nam Bộ, Cân bằng bậc vùng dồn ứ, Gán trọng số gói việc B2B). Nút "Duyệt tất cả đề xuất" mở modal xác nhận an toàn, có tính năng hoàn tác trong 5 phút.
- **Khối chỉ xem Automation**: Hiển thị lần xử lý tự động gần nhất cho Quản lý và Admin; ẩn với Nhân viên.

### 1.4. Dọn dẹp & Việt hóa 100%
- Loại bỏ hoàn toàn chức năng nạp file CSV (cả UI lẫn code).
- Bỏ nút "Chạy Automation".
- Quét sạch toàn bộ các từ tiếng Anh trên giao diện (chỉ giữ tên riêng và ký hiệu như CSV).
- Toàn bộ ngày tháng định dạng dd/mm/yyyy, tiền tệ 1.000.000 ₫.

---

## 2. BẢI TỰ PHẢN BIỆN THIẾT KẾ CẬP NHẬT

| Màn hình | Mục đích chính | Yếu tố đã loại bỏ / Tinh giản | Khả năng truy vết số liệu | Trạng thái an toàn & Phân quyền |
|---|---|---|---|---|
| **Tổng quan** | Theo dõi tiến độ kỳ và điều hành tối ưu chính sách | Đã bỏ hoàn toàn các card AI trang trí và nút chạy automation | Mọi số đều có nút "Cách tính" bóc tách công thức toán học và số thật | Có cơ chế đếm ngược hoàn tác 5 phút khi duyệt hàng loạt đề xuất |
| **Đề xuất mức thưởng** | Hỗ trợ Quản lý ra quyết định thưởng cá nhân hóa và công bằng | Loại bỏ các yếu tố black-box, giải thích minh bạch 3 nguồn | Hiển thị rõ số điểm đóng góp của Quy tắc, Học máy và Quản lý | Kiểm soát lệch >10% bắt buộc chuyển cấp hai duyệt |
| **Bản giải trình Nhân viên** | Tra cứu kết quả minh bạch, tôn trọng, giảm khiếu nại | Bỏ mọi biểu đồ xếp hạng cạnh tranh hay ngôn ngữ phán xét | Trình bày công thức tuyến tính và lý do điều chỉnh độ khó | Kênh gửi giải trình có cam kết thời hạn 15 ngày làm việc |
| **Kiểm tra dữ liệu** | Gỡ trùng lặp và rà soát tính hợp lệ của dữ liệu | Đã loại bỏ các nút bấm không có chức năng thực tế | So sánh đối chiếu Before vs After khi khấu trừ hợp đồng của Dũng | Ghi nhật ký kiểm toán không thể xóa |

---

## 3. TÀI LIỆU BÀN GIAO MỚI KÈM THEO
1. [`DU_LIEU_VA_CONG_THUC.md`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/DU_LIEU_VA_CONG_THUC.md): Bản mô tả chi tiết từng bảng, cột, đơn vị, công thức tỷ lệ đạt có trọng số, hệ số quy mô, và các chỉ số kinh doanh.
2. [`ML_KHAO_SAT.md`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/ML_KHAO_SAT.md): Báo cáo khảo sát các tập dữ liệu nhân sự công khai trên thế giới, kiến trúc mô hình học máy Gradient Boosting, và thẻ mô hình.
3. [`ASSUMPTIONS.md`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/ASSUMPTIONS.md): Bảng tổng hợp các giả định khoa học, thiết kế đầu việc và phương pháp luận mô phỏng.
4. [`DEMO_SCRIPT.md`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/DEMO_SCRIPT.md): Kịch bản thuyết trình demo 5 phút chi tiết với các con số thật do hệ thống sinh ra.
5. [`LY_DO_DE_XUAT_HE_THONG.md`](file:///d:/YEAR3_HK1/KIENTAP_%20-%20Copy/LY_DO_DE_XUAT_HE_THONG.md): Bài luận văn xuôi trang trọng phục vụ viết báo cáo kiến tập.
