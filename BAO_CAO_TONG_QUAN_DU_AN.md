# BÁO CÁO TỔNG QUAN DỰ ÁN

## Hệ thống Quản lý và Đề xuất Thưởng Thông minh

**Mục đích báo cáo:** Giới thiệu ngắn gọn sản phẩm đã thực hiện trong đồ án kiến tập.

## 1. Giới thiệu dự án

Dự án xây dựng một hệ thống hỗ trợ doanh nghiệp quản lý quá trình đánh giá hiệu suất, tính thưởng, phê duyệt và chi trả thưởng cho nhân viên. Hệ thống giúp thay thế cách tổng hợp thủ công bằng một quy trình rõ ràng, có kiểm soát và dễ tra cứu.

Điểm khác biệt của dự án là mức thưởng không chỉ dựa vào doanh số đơn lẻ. Hệ thống kết hợp quy chế thưởng, dữ liệu hiệu suất lịch sử và đánh giá có cấu trúc từ quản lý để đưa ra mức đề xuất. Người quản lý vẫn là người ra quyết định cuối cùng.

## 2. Bài toán dự án giải quyết

Trong thực tế, việc tính thưởng bằng bảng tính thủ công có thể gặp các khó khăn sau:

- Khó theo dõi đầy đủ nhiều đầu việc, độ khó và mức đóng góp của từng nhân viên.
- Dễ thiếu thống nhất hoặc thiếu căn cứ khi quản lý điều chỉnh mức thưởng.
- Khó kiểm tra lỗi dữ liệu như hợp đồng bị nhập trùng, thiếu chỉ tiêu hoặc tỷ lệ bất thường.
- Nhân viên khó hiểu cách mức thưởng của mình được hình thành.
- Bộ phận nhân sự và tài chính mất thời gian tổng hợp, kiểm tra và chuẩn bị dữ liệu chi trả.

Hệ thống được đề xuất để chuẩn hóa các bước trên trong một giao diện thống nhất.

## 3. Những gì dự án đã làm được

### 3.1. Quản lý thông tin và hiệu suất nhân viên

- Quản lý hồ sơ, phòng ban, vị trí, cấp bậc và trạng thái xử lý của nhân viên.
- Ghi nhận nhiều gói việc hoặc hợp đồng cho mỗi nhân viên.
- Theo dõi chỉ tiêu, kết quả thực đạt, quy mô công việc, độ phức tạp và mức đóng góp.
- Xem tiến độ theo kỳ đánh giá và theo thời điểm trong kỳ.

### 3.2. Tính thưởng theo quy chế rõ ràng

Hệ thống tính tỷ lệ hoàn thành có trọng số. Các công việc có quy mô hoặc độ phức tạp cao sẽ được phản ánh phù hợp hơn thay vì cộng dồn đơn giản.

- Tự động tính tỷ lệ hoàn thành, hệ số chi trả và số tiền thưởng.
- Áp dụng ngưỡng tối thiểu, mức thưởng theo bậc và trần chi trả 150%.
- Có hệ số quy mô để cá nhân hóa mức thưởng mục tiêu theo khối lượng công việc.
- Hiển thị phần giải thích “Cách tính” để người dùng có thể kiểm tra căn cứ số liệu.

### 3.3. Đề xuất thưởng từ 3 nguồn

Mức thưởng đề xuất được tạo từ ba nguồn thông tin:

1. **Quy tắc tính thưởng:** Dựa trên kết quả công việc hiện tại và quy chế.
2. **Dự báo học máy:** Dựa trên xu hướng và hiệu suất của bốn kỳ trước.
3. **Đánh giá của quản lý:** Đánh giá theo chất lượng, hợp tác, chủ động và khó khăn khách quan.

Tỷ lệ kết hợp là 70% từ quy tắc và 30% từ dự báo học máy, sau đó có thể được quản lý điều chỉnh trong giới hạn kiểm soát. Khi mức chốt chênh lệch trên 10 điểm phần trăm so với đề xuất, hệ thống yêu cầu lý do và chuyển sang duyệt cấp hai.

### 3.4. Hỗ trợ quản lý ra quyết định

- Cung cấp thanh điều chỉnh giả lập để xem trước ảnh hưởng của mức thưởng khác nhau.
- Cảnh báo khi mức thưởng điều chỉnh cần duyệt cấp hai.
- Hiển thị khoảng dự báo và các yếu tố chính ảnh hưởng đến đề xuất học máy.
- Có khu vực hỏi đáp ngắn, giải thích lý do đề xuất và tác động của việc thay đổi mức thưởng.
- Hỗ trợ đề xuất điều chỉnh cơ chế thưởng và hoàn tác thao tác duyệt hàng loạt trong thời gian ngắn.

### 3.5. Kiểm tra dữ liệu và kiểm soát ngân sách

- Phát hiện hợp đồng trùng lặp, thiếu chỉ tiêu, thiếu cơ chế thưởng, tỷ lệ bất thường và mức thưởng ngoài giới hạn.
- Hỗ trợ xử lý các lỗi dữ liệu trực tiếp trên giao diện.
- Theo dõi tổng thưởng, tỷ lệ sử dụng quỹ và cảnh báo khi vượt ngân sách.
- Hiển thị các chỉ số quản trị như tỷ lệ hoàn thành có trọng số, tiến độ thời gian và dự phóng cuối kỳ.

### 3.6. Phê duyệt và chi trả

- Thiết kế luồng xử lý từ đánh giá hiệu suất, đề xuất, quyết định, duyệt cấp hai đến thông tin chi tiết.
- Quản trị viên có thể duyệt các hồ sơ cần xem xét.
- Hệ thống hỗ trợ xuất bảng chi trả dạng CSV để phục vụ bước tổng hợp payroll.

### 3.7. Phân quyền theo vai trò

Hệ thống mô phỏng ba nhóm người dùng:

| Vai trò | Phạm vi sử dụng |
|---|---|
| Quản trị viên C&B/Tài chính | Xem toàn công ty, kiểm tra dữ liệu, duyệt cấp hai và xuất bảng chi trả. |
| Quản lý trực tiếp | Xem nhân viên thuộc bộ phận mình, đánh giá và đề xuất/chốt thưởng. |
| Nhân viên | Chỉ xem hồ sơ, hiệu suất và phiếu thưởng của chính mình; gửi yêu cầu giải trình. |

Việc kiểm soát được thực hiện cả ở giao diện và ở các tuyến truy cập, nhằm hạn chế nhân viên xem dữ liệu không thuộc quyền của mình.

### 3.8. Minh bạch và công bằng

- Mỗi khoản thưởng có thể được giải thích từ dữ liệu đầu vào và công thức tính.
- Mô hình học máy không sử dụng các thông tin nhạy cảm như giới tính, tuổi, tình trạng hôn nhân hoặc quê quán.
- Dự báo học máy chỉ đóng vai trò hỗ trợ; quản lý và cấp duyệt vẫn chịu trách nhiệm cho quyết định cuối cùng.
- Nhân viên có thể xem phiếu giải trình và gửi yêu cầu làm rõ.

## 4. Công nghệ và cấu trúc thực hiện

- **Giao diện:** HTML, CSS, JavaScript; giao diện tiếng Việt, có biểu đồ và bảng thông tin.
- **Xử lý nghiệp vụ:** JavaScript cho công thức tính thưởng, phân quyền, phê duyệt, kiểm tra dữ liệu và xuất CSV.
- **Học máy:** Python và Scikit-learn, sử dụng mô hình Gradient Boosting Regressor.
- **Dữ liệu tích hợp:** Kết quả dự báo được xuất sang JSON để giao diện sử dụng.
- **Tài liệu:** Có tài liệu công thức, cấu trúc dữ liệu, mô hình học máy, giả định dự án và kịch bản demo.

## 5. Kết quả kiểm thử

Các kiểm thử tự động đã được chạy thành công tại thời điểm lập báo cáo, gồm:

- Kiểm thử công thức tính thưởng cho các trường hợp mẫu.
- Kiểm thử tỷ lệ có trọng số, hệ số quy mô, đề xuất 3 nguồn và giới hạn quỹ.
- Kiểm thử phân quyền giữa quản trị viên, quản lý và nhân viên.
- Kiểm thử luồng duyệt cấp hai và xử lý dữ liệu bất thường.
- Kiểm thử chuyển kỳ, phân bổ bậc thưởng và tính toàn vẹn giao diện.

Kết quả: **tất cả các nhóm kiểm thử trên đều đạt**.

## 6. Giá trị mang lại cho doanh nghiệp

Nếu được phát triển với dữ liệu thực tế, hệ thống có thể hỗ trợ doanh nghiệp:

- Giảm thời gian tổng hợp và kiểm tra thưởng thủ công.
- Chuẩn hóa cách tính thưởng giữa các bộ phận.
- Giúp quyết định thưởng có căn cứ, dễ kiểm tra và dễ giải thích hơn.
- Phát hiện sớm lỗi dữ liệu và rủi ro vượt quỹ thưởng.
- Tăng tính minh bạch với nhân viên, từ đó hạn chế thắc mắc hoặc khiếu nại.
- Cung cấp thông tin để nhân sự và tài chính điều chỉnh chính sách thưởng phù hợp.

## 7. Phạm vi và hạn chế của bản hiện tại

Đây là **bản prototype phục vụ đồ án kiến tập**, không phải hệ thống đã triển khai cho doanh nghiệp. Dữ liệu nhân sự, dữ liệu theo ngày và nhãn huấn luyện mô hình được mô phỏng có kiểm soát; không sử dụng dữ liệu mật của doanh nghiệp.

Chức năng đăng nhập và phân quyền hiện là mô phỏng trên trình duyệt, chưa thay thế cho cơ chế bảo mật doanh nghiệp. Để đưa vào sử dụng thực tế, cần bổ sung cơ sở dữ liệu tập trung, xác thực an toàn, nhật ký kiểm toán, phân quyền phía máy chủ, tích hợp hệ thống nhân sự/payroll và kiểm thử trên dữ liệu thực.

## 8. Kết luận

Dự án đã xây dựng được một mô hình hoàn chỉnh cho quy trình quản lý thưởng: từ dữ liệu hiệu suất, tính thưởng, đề xuất thông minh, kiểm tra lỗi, phê duyệt đến chuẩn bị chi trả. Sản phẩm thể hiện được hướng tiếp cận thực tế là kết hợp công thức rõ ràng, dữ liệu lịch sử và đánh giá của con người, đồng thời chú trọng minh bạch, phân quyền và khả năng giải thích.

Với việc bổ sung hạ tầng và dữ liệu doanh nghiệp trong tương lai, hệ thống có thể tiếp tục phát triển thành công cụ hỗ trợ hữu ích cho bộ phận Nhân sự, C&B và Tài chính.

---

**Tài liệu tham khảo trong dự án:** `README.md`, `DU_LIEU_VA_CONG_THUC.md`, `ML_KHAO_SAT.md`, `ASSUMPTIONS.md`, `DEMO_SCRIPT.md`, `CHANGELOG.md` và mã nguồn trong thư mục `DEMO`.
