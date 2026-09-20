# KHẢO SÁT DỮ LIỆU NHÂN SỰ VÀ THIẾT KẾ HỌC MÁY (ML_KHAO_SAT.md)
## Đề tài: Hệ thống Quản lý và Đề xuất Thưởng Thông minh

Tài liệu này trình bày kết quả khảo sát các bộ dữ liệu nhân sự công khai trên thế giới, phân tích tính khả thi áp dụng cho bài toán đề xuất mức thưởng, và mô tả kiến trúc mô hình học máy (Machine Learning) được thiết kế cho prototype.

---

## 1. Khảo sát các Bộ Dữ liệu Nhân sự Công khai

Nhóm nghiên cứu đã khảo sát và đánh giá 3 bộ dữ liệu nhân sự mở phổ biến nhất trong cộng đồng khoa học dữ liệu:

### 1.1. IBM HR Analytics Employee Attrition & Performance
- **Nguồn**: Kaggle / IBM Watson Analytics Platform.
- **Quy mô**: 1.470 bản ghi nhân viên, 35 thuộc tính.
- **Giấy phép**: Open Data Commons Public Domain Dedication and License (PDDL / Apache 2.0).
- **Các trường dữ liệu có sẵn**:
  - Đặc tính nhân sự: `Age`, `Gender`, `Department`, `EducationField`, `JobRole`, `JobLevel`, `TotalWorkingYears`, `YearsAtCompany`, `YearsInCurrentRole`.
  - Hiệu suất và đãi ngộ: `MonthlyIncome`, `PerformanceRating` (chỉ có thang 3 và 4), `PercentSalaryHike`, `StockOptionLevel`.
  - Đánh giá môi trường: `EnvironmentSatisfaction`, `JobInvolvement`, `WorkLifeBalance`.
- **Đánh giá tính phù hợp**:
  - *Ưu điểm*: Cung cấp phân bố rất thực tế về mối quan hệ giữa thâm niên công tác (`YearsAtCompany`), cấp bậc vị trí (`JobLevel`) và phân cấp phòng ban (`Department`).
  - *Hạn chế chí mạng*: Bộ dữ liệu này được thiết kế để dự đoán **nghỉ việc (Attrition)** chứ **hoàn toàn không có nhãn về doanh số thực tế, chỉ tiêu kinh doanh (KPI targets) hay tỷ lệ chi trả thưởng định kỳ (Incentive Payout Rate)**. Ngoài ra biến `PerformanceRating` bị nén một cách phi thực tế (chỉ có mức 3 và 4, không có 1, 2, 5).

### 1.2. Kaggle HR Analytics: Job Change of Data Scientists
- **Nguồn**: Kaggle.
- **Quy mô**: 19.158 bản ghi.
- **Mục tiêu**: Dự báo ứng viên tìm việc mới sau khóa đào tạo.
- **Đánh giá**: Hoàn toàn không liên quan đến bài toán đánh giá hiệu suất và chia thưởng nội bộ doanh nghiệp.

### 1.3. Kaggle Productivity Prediction of Garment Employees (Đang có trong thư mục `DEMO/csv.csv`)
- **Nguồn**: UCI Machine Learning Repository / Kaggle.
- **Quy mô**: 1.197 dòng theo dõi năng suất chuyền may theo ngày.
- **Đánh giá**: Chứa `targeted_productivity`, `actual_productivity` và `incentive`. Tuy nhiên đây là dữ liệu năng suất công nghiệp chuyền may theo ngày tại Bangladesh, đơn vị thưởng tính bằng tiền tệ nhỏ (TK - Taka), cơ chế thưởng là thưởng khoán năng suất trực tiếp, không mang tính chất chu kỳ quý/năm của nhân sự khối văn phòng - kinh doanh B2B trong đề tài.

---

## 2. Kết luận Khảo sát và Phương pháp Tiếp cận Thực tế

> [!IMPORTANT]
> **Hạn chế thực tế khách quan**: Trên thực tế, **không có bất kỳ bộ dữ liệu công khai nào trên thế giới** công bố chi tiết lịch sử chi trả thưởng cá nhân hóa kèm đánh giá của quản lý cho nhân sự doanh nghiệp, bởi đây là thông tin bảo mật tối mật (Confidential / Proprietary Compensation Data) của các tập đoàn.

### Phương pháp Giải quyết Đạt Chuẩn Khoa học:
1. **Lấy cảm hứng phân bố từ thực tế**: Sử dụng phân bố về thâm niên, cấp bậc và cấu trúc lương của bộ dữ liệu IBM HR để xây dựng hồ sơ nhân sự chuẩn mực.
2. **Mô phỏng nhãn có tài liệu hóa (Documented Simulation)**: Sinh dữ liệu hoàn thành chỉ tiêu và nhãn thưởng lịch sử qua 4 kỳ (Q3/2025 - Q2/2026) dựa trên nguyên tắc:
   $$\text{Label} = R_{\text{quy\_tắc}}(\text{Thực\_đạt}) + \text{Thói\_quen\_quản\_lý} + \epsilon_{\text{nhiễu}}$$
   Trong đó $\epsilon_{\text{nhiễu}} \sim \mathcal{N}(0, \sigma^2)$ mô phỏng các yếu tố biến động thị trường và cảm tính nhân sự.
3. **Công khai và trung thực**: Hệ thống và mọi báo cáo nghiệm thu ghi nhận rõ ràng: **Nhãn dữ liệu huấn luyện là dữ liệu mô phỏng có kiểm soát khoa học, không phải dữ liệu thực tế của một doanh nghiệp thương mại**.

---

## 3. Kiến trúc Mô hình Học máy (Machine Learning Pipeline)

### 3.1. Danh mục Đặc trưng (Feature Engineering)

Mô hình học máy sử dụng thuật toán **Gradient Boosting Regressor (GBR)** với các đặc trưng được chọn lọc nghiêm ngặt:

| Nhóm đặc trưng | Tên biến | Kiểu | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| **Lịch sử hiệu suất** | `hist_avg_rate` | Số thực | Tỷ lệ đạt trung bình 4 kỳ trước |
| | `hist_rate_trend` | Số thực | Độ dốc xu hướng (hồi quy tuyến tính 4 kỳ gần nhất: tăng/giảm) |
| | `hist_volatility` | Số thực | Độ lệch chuẩn tỷ lệ đạt các kỳ trước (đo lường độ ổn định) |
| | `hist_avg_payout` | Số thực | Tỷ lệ chi trả thưởng bình quân trong quá khứ |
| **Kỳ hiện tại** | `current_weighted_rate`| Số thực | Tỷ lệ đạt có trọng số của các gói việc kỳ này |
| | `total_work_volume` | Số thực | Tổng quy mô các gói việc đảm nhận ($\sum w_i$) |
| | `avg_complexity` | Số thực | Độ phức tạp trung bình các gói việc |
| **Hồ sơ nhân sự** | `seniority` | Số thực | Số năm kinh nghiệm công tác tại công ty |
| | `job_level` | Số nguyên | Cấp bậc chuyên môn (Level 1 đến Level 7) |
| | `dept_encoded` | Số nguyên | Mã hóa danh mục phòng ban |

> [!CAUTION]
> **Cam kết Đạo đức & Công bằng (Fairness & Ethics)**:
> Tuyệt đối **LOẠI BỎ** và **KHÔNG SỬ DỤNG** các biến sau làm đầu vào của mô hình:
> - Giới tính (`Gender`), Độ tuổi (`Age`)
> - Tình trạng hôn nhân (`MaritalStatus`), Dân tộc, Tôn giáo, Quê quán
> - Mối quan hệ cá nhân với lãnh đạo

### 3.2. Huấn luyện và Đánh giá Mô hình
- **Thuật toán**: `GradientBoostingRegressor` (Scikit-learn).
- **Phân vị tin cậy (Prediction Interval)**: Huấn luyện thêm 2 mô hình phân vị với mất mát Quantile Loss ($\alpha = 0,10$ và $\alpha = 0,90$) để cung cấp khoảng dự đoán $[P_{10}, P_{90}]$ cho quản lý tham khảo.
- **Kiểm định chéo (Time-series Split)**: Huấn luyện trên dữ liệu 4 kỳ trước và kiểm thử trên kỳ Q3/2026 để tránh rò rỉ dữ liệu tương lai (Look-ahead Bias).
- **Chỉ số chất lượng dự kiến**:
  - Sai số tuyệt đối trung bình (MAE) $< 0,04$ (tức sai lệch dưới 4 điểm phần trăm).
  - Hệ số xác định $R^2 > 0,85$.

### 3.3. Cơ chế Giải thích Dự đoán (Explainability - XAI)
- Sử dụng giá trị đóng góp đặc trưng (Feature Importances / SHAP approximation) để đo lường mức độ ảnh hưởng của từng yếu tố lên kết quả đề xuất.
- Toàn bộ giá trị đóng góp được chuyển ngữ thành các mệnh đề tiếng Việt tự nhiên:
  *Ví dụ: "Lịch sử đạt 92% qua 4 kỳ (cao hơn nhóm tương đương 6 điểm) đóng góp +2,5% vào mức đề xuất của mô hình."*

### 3.4. Định dạng Xuất Dữ liệu Tích hợp Frontend (`DEMO/data/ml_predictions.json`)
Script Python xuất kết quả ra file JSON có cấu trúc sau:
```json
{
  "model_info": {
    "algorithm": "Gradient Boosting Regressor",
    "train_records": 480,
    "mae": 0.032,
    "r2_score": 0.891,
    "last_trained": "2026-09-20"
  },
  "predictions": {
    "EMP-001": {
      "r_ml": 1.35,
      "interval_p10": 1.25,
      "interval_p90": 1.45,
      "top_drivers": [
        { "feature": "current_weighted_rate", "impact": "+0.28", "text": "Thực đạt kỳ này đạt 115% đóng góp tích cực nhất" },
        { "feature": "hist_avg_rate", "impact": "+0.07", "text": "Hiệu suất lịch sử 4 kỳ duy trì ổn định ở mức cao" }
      ],
      "confidence": 0.91
    },
    "EMP-002": {
      "r_ml": 0.83,
      "interval_p10": 0.75,
      "interval_p90": 0.90,
      "top_drivers": [
        { "feature": "current_weighted_rate", "impact": "-0.12", "text": "Thực đạt kỳ này 85% dưới chuẩn kỳ vọng" },
        { "feature": "hist_rate_trend", "impact": "-0.05", "text": "Xu hướng 2 kỳ gần đây có chiều hướng giảm nhẹ" }
      ],
      "confidence": 0.84
    }
  }
}
```
Mô hình này giúp người dùng Quản lý và Admin hiểu thấu đáo lý do tại sao hệ thống lại đưa ra con số đó, thỏa mãn 100% nguyên tắc minh bạch tương tác (Interactional Fairness).
