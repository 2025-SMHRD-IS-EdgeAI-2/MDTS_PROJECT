import json
import os
import glob
import base64
from datetime import datetime

def get_base64_image(image_path):
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except:
        return ""

def generate_visual_dashboard(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 이미지 경로 처리 (Base64로 변환하여 HTML에 내장)
    img_path = data.get('image', '')
    img_base64 = get_base64_image(img_path)
    
    conf = data.get('confidence', 0) * 100
    risk = data.get('risk', 'UNKNOWN')
    
    # 위험도 등급에 따른 테마 색상
    theme_color = "#ff4d4f" if risk == "CRITICAL" else "#fa8c16" if risk == "HIGH" else "#52c41a"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>M-MEDIC AI 진단 대시보드</title>
        <style>
            :root {{ --primary-color: {theme_color}; }}
            body {{ font-family: 'Pretendard', sans-serif; background: #f0f2f5; margin: 0; padding: 20px; color: #333; }}
            .dashboard {{ max-width: 900px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }}
            .header {{ background: var(--primary-color); color: white; padding: 20px; text-align: center; }}
            .content {{ display: flex; flex-wrap: wrap; padding: 30px; gap: 30px; }}
            .image-section {{ flex: 1; min-width: 300px; }}
            .image-section img {{ width: 100%; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }}
            .info-section {{ flex: 1.2; min-width: 300px; }}
            .status-card {{ background: #fafafa; border-radius: 10px; padding: 20px; margin-bottom: 20px; border-left: 5px solid var(--primary-color); }}
            .prediction {{ font-size: 28px; font-weight: bold; color: var(--primary-color); margin: 10px 0; }}
            .gauge-container {{ background: #eee; height: 12px; border-radius: 6px; margin: 15px 0; overflow: hidden; }}
            .gauge-fill {{ background: var(--primary-color); height: 100%; width: {conf}%; transition: width 1s ease-in-out; }}
            .action-list {{ list-style: none; padding: 0; }}
            .action-list li {{ padding: 8px 0; border-bottom: 1px solid #eee; display: flex; align-items: flex-start; }}
            .action-list li:before {{ content: '•'; color: var(--primary-color); font-weight: bold; margin-right: 10px; }}
            .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; background: var(--primary-color); color: white; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="dashboard">
            <div class="header">
                <h1>🚢 M-MEDIC AI Diagnostic Dashboard</h1>
                <p>표준 의료 진단 분석 보고서 (v2.0)</p>
            </div>
            <div class="content">
                <div class="image-section">
                    <h3>분석 이미지 (Source)</h3>
                    <img src="data:image/jpeg;base64,{img_base64}" alt="Wound Image">
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">ID: {os.path.basename(img_path)}</p>
                </div>
                <div class="info-section">
                    <div class="status-card">
                        <span class="badge">AI 판독 결과</span>
                        <div class="prediction">{data.get('name')}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>신뢰도(Confidence)</span>
                            <span style="font-weight: bold;">{conf:.1f}%</span>
                        </div>
                        <div class="gauge-container"><div class="gauge-fill"></div></div>
                        <p style="font-size: 14px;">위험 등급: <strong>{risk}</strong></p>
                    </div>
                    
                    <h3>💡 응급 처치 지침</h3>
                    <ul class="action-list">
                        {"".join([f"<li>{line.strip()}</li>" for line in data.get('action', '').split('.') if line.strip()])}
                    </ul>
                    
                    <h3 style="margin-top: 30px;">⚖️ 법적 근거</h3>
                    <p style="background: #e6f7ff; padding: 15px; border-radius: 8px; font-size: 14px; color: #0050b3; border: 1px solid #91d5ff;">
                        {data.get('law_ref')}
                    </p>
                </div>
            </div>
            <div class="footer">
                진단 일시: {data.get('timestamp')} | 본 결과는 AI 보조 도구이며 전문의의 최종 판단이 우선합니다.
            </div>
        </div>
    </body>
    </html>
    """
    
    output_path = json_path.replace('.json', '_VISUAL.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    return output_path

if __name__ == "__main__":
    report_files = glob.glob(os.path.join(os.path.dirname(__file__), "report_*.json"))
    if report_files:
        latest_report = max(report_files, key=os.path.getctime)
        html_path = generate_visual_dashboard(latest_report)
        print(f"✅ 시각화 대시보드가 생성되었습니다: {os.path.basename(html_path)}")
        print(f"브라우저에서 열어보세요: {html_path}")
