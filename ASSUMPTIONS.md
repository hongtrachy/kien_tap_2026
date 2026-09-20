# TÀI LIỆU CÁC GIẢ ĐỊNH VÀ QUYẾT ĐỊNH THIẾT KẾ (ASSUMPTIONS.md)
## Hệ thống Quản lý và Đề xuất Thưởng Thông minh (Incentive Management & Analytics)

Tài liệu này ghi nhận toàn bộ các giả định kỹ thuật, nghiệp vụ và phương pháp luận được thiết lập nhằm xây dựng một bản web demo hoàn chỉnh, phục vụ cho đề tài kiến tập và báo cáo khoa học.

---

### 1. Giả định về Mô hình Dữ liệu và Phân rã Đầu việc
- **Số lượng gói việc**: Mỗi nhân viên được thiết lập từ 4 đến 6 đầu việc/gói hợp đồng kinh doanh. Việc phân rã này phản ánh thực tế doanh nghiệp hiện đại: nhân viên không chỉ làm một chỉ tiêu đơn lẻ mà phụ trách nhiều dự án với độ lớn và độ phức tạp khác nhau.
- **Bảo toàn 4 nhân vật neo**: Các đầu việc của An, Bình, Chi, Dũng được phân bổ tỉ mỉ sao cho tổng chỉ tiêu, tổng thực đạt và tỷ lệ đạt có trọng số $R_{\text{thực\_đạt\_w}}$ tương ứng chính xác với tỷ lệ trong đề cương ban đầu (An đạt 115%, Bình đạt thô 85% và 94,44% sau hiệu chỉnh, Chi đạt 100%, Dũng đạt 110% thô và 100% sau gỡ trùng).
- **Phân loại lợi ích kỳ vọng**: Mỗi gói việc gắn với một loại giá trị mục tiêu (`doanh_thu`, `tiet_kiem_chi_phi`, hoặc `hop_dong_moi`) và tỷ lệ đóng góp của nhân viên để đánh giá công bằng dựa trên giá trị thặng dư thực tế mang lại cho tổ chức.

### 2. Giả định về Phân bổ Dữ liệu Theo Ngày và Tiến độ Thời gian
- **Chu kỳ chốt thưởng**: Chu kỳ chính của hệ thống là **Kỳ (Tháng hoặc Quý)**.
- **Dữ liệu phân bổ theo ngày**: Vì doanh nghiệp thực tế theo dõi số liệu ghi nhận theo ngày làm việc (22 ngày/tháng), hệ thống sinh dữ liệu tích lũy theo ngày thông qua thuật toán PRNG (Pseudo-Random Number Generator) với seed cố định.
- **Bảo toàn số học**: Tổng doanh số và tiến độ của 22 ngày công luôn cộng dồn khớp đúng 100% với số liệu chốt tháng. Khi người dùng lọc "Tính đến ngày X", hệ thống trích xuất đúng tổng lũy kế từ ngày 1 đến ngày X để tính tốc độ hoàn thành ($V$) và dự phóng cuối kỳ.

### 3. Giả định về Nguồn Dữ liệu Lịch sử và Học máy (Machine Learning)
- **Thiếu hụt nhãn thực tế công khai**: Khảo sát các tập dữ liệu nhân sự quốc tế công khai (như IBM HR Analytics) cho thấy không có bộ dữ liệu nào chứa nhãn "tỷ lệ thưởng thực tế được chi trả" phù hợp với đặc thù quản trị thưởng tại doanh nghiệp Việt Nam.
- **Mô phỏng có tài liệu hóa**: 4 kỳ lịch sử (Q3/2025, Q4/2025, Q1/2026, Q2/2026) được sinh bằng mô phỏng toán học dựa trên quy tắc chuẩn cộng thêm độ biến động thực tế và thói quen đánh giá của từng quản lý bộ phận.
- **Minh bạch hóa**: Hệ thống và tài liệu khẳng định rõ ràng: "Dữ liệu lịch sử và nhãn thưởng là dữ liệu mô phỏng có căn cứ khoa học, không phải dữ liệu rò rỉ từ doanh nghiệp cụ thể nào".
- **Kiến trúc ML**: Huấn luyện mô hình Gradient Boosting Regressor (Scikit-learn) offline bằng Python; sinh các giá trị dự đoán $R_{\text{học\_máy}}$, khoảng phân vị $[P_{10}, P_{90}]$, giá trị đóng góp đặc trưng (SHAP/Feature Importance) và lưu vào `DEMO/data/ml_predictions.json`. Frontend đọc file JSON tĩnh này, bảo đảm hoạt động 100% không phụ thuộc internet và không tốn chi phí hạ tầng.

### 4. Giả định về Đánh giá của Quản lý và Chuẩn hóa Điểm số
- **Thói quen chấm điểm (Manager Bias)**: Mỗi quản lý có xu hướng chấm điểm khác nhau (người chấm rộng rãi, người chấm khắt khe).
- **Chuẩn hóa z-score**: Điểm đánh giá của quản lý được chuẩn hóa theo kỳ vọng và độ lệch chuẩn của chính quản lý đó trong quá khứ để loại bỏ thiên kiến cá nhân, trước khi quy đổi sang mức điều chỉnh $\Delta_{\text{quản\_lý}} \in [-15\%, +15\%]$.

### 5. Giả định về Khung Hỏi & Đáp (Explainability & Q&A)
- **Phương pháp Template-based**: Toàn bộ các câu trả lời giải thích "Vì sao đề xuất mức này?", "Nếu hạ xuống X% thì sao?" được dựng sẵn bằng các mẫu câu tiếng Việt quy chuẩn nghiệp vụ, tự động điền các tham số động tính từ dữ liệu thực tế của nhân viên.
- **Độ tin cậy tuyệt đối**: Không sử dụng mô hình ngôn ngữ lớn (LLM) bên ngoài để sinh số nhằm ngăn chặn triệt để hiện tượng ảo giác (hallucination), sai lệch số liệu tài chính hoặc yêu cầu API key tốn kém.

### 6. Giả định về Phân quyền và Bảo mật Demo
- **Cơ chế xác thực mô phỏng**: Hệ thống cung cấp màn hình đăng nhập với 3 tài khoản đại diện (`admin`, `manager`, `employee`). Trạng thái đăng nhập được lưu trong `sessionStorage` của trình duyệt.
- **Kiểm soát quyền truy cập**: Mỗi route/tab và hàm xử lý đều kiểm tra vai trò người dùng (`checkPermission`). Nhân viên bị chặn hoàn toàn không được xem màn hình của quản trị viên hay dữ liệu của đồng nghiệp khác, kể cả khi gõ URL hash trực tiếp.
- **Mục đích trình diễn**: Giao diện có thanh chuyển vai trò nhanh (Demo Mode) để người thuyết trình chuyển đổi mượt mà giữa các góc nhìn trong 5 phút mà không cần đăng xuất/đăng nhập lại nhiều lần.
