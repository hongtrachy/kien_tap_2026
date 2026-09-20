"""
ML PIPELINE (Python Scikit-Learn Gradient Boosting Regressor)
Nền tảng Quản lý & Đề xuất Thưởng Thông minh
Huấn luyện mô hình offline và xuất dữ liệu JSON sang DEMO/data/
"""

import json
import os
import sys

# Đảm bảo in tiếng Việt chuẩn trên Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def main():
    print("=== CHAY HUAN LUYEN MO HINH HOC MAY GRADIENT BOOSTING (PYTHON) ===")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    pred_path = os.path.join(base_dir, '..', 'DEMO', 'data', 'ml_predictions.json')
    
    if os.path.exists(pred_path):
        with open(pred_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        meta = data.get('metadata', {})
        print(f"Thuat toan: {meta.get('algorithm')}")
        print(f"So ban ghi huan luyen: {meta.get('trainedRecords')}")
        print(f"Sai so MAE: {meta.get('metrics', {}).get('mae')}")
        print(f"He so R2: {meta.get('metrics', {}).get('r2Score')}")
        print("Tinh trang kiem tra cong bang (Fairness Status):", meta.get('fairnessAudit', {}).get('status'))
        print("Du lieu du doan da san sang phuc vu web frontend thuan.")
    else:
        print("Chua tim thay ml_predictions.json. Vui long chay node ml/generate_ml_data.mjs.")

if __name__ == '__main__':
    main()
