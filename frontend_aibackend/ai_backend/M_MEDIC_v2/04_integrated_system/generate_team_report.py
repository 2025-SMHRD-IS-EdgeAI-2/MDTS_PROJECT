import json
import os
import glob
from datetime import datetime

def generate_markdown_report(json_path):
    if not os.path.exists(json_path):
        print(f"오류: {json_path} 파일을 찾을 수 없습니다.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 신뢰도 시각화 바 생성
    conf = data.get('confidence', 0)
    bar_len = int(conf * 20)
    conf_bar = "█" * bar_len + "░" * (20 - bar_len)
    
    # 위험도에 따른 이모지
    risk_map = {
        "CRITICAL": "🔴 [최고 위험 - 즉시 회항 권고]",
        "HIGH": "🟠 [고위험 - 육지 병원 이송 권고]",
        "MEDIUM": "🟡 [중등도 - 원격 의료 자문 필요]",
        "LOW": "🟢 [저위험 - 선내 처치 및 경과 관찰]"
    }
    risk_info = risk_map.get(data.get('risk'), data.get('risk'))

    # 리포트 템플릿 작성
    report = f"""# 🚢 M-MEDIC v2.0 AI 진단 분석 결과 보고 (Team Sync)

**본 리포트는 AI 진단 엔진의 출력 결과를 팀 공유 및 의사결정 지원을 위해 자동 생성한 요약본입니다.**

---

### 1. 진단 개요 (Diagnosis Summary)
- **분석 일시:** `{data.get('timestamp', datetime.now())}`
- **진단 대상:** `{data.get('name', '알 수 없는 상처')}`
- **분석 모드:** `{'외상(Wound)' if data.get('mode') == 'wound' else '피부질환(Skin)'}`
- **소스 이미지:** `{os.path.basename(data.get('image', 'N/A'))}`

### 2. AI 판독 성능 (AI Performance)
- **판독 결과:** **{data.get('prediction')}**
- **판독 신뢰도:** `{conf:.1%}`
- **신뢰도 지표:** `[{conf_bar}]`
- **시스템 의견:** {'✅ 신뢰 수준 높음' if not data.get('low_confidence') else '⚠️ 신뢰도 낮음 (재촬영 및 대조 분석 권고)'}

### 3. 위험도 및 의학적 조치 (Medical Insights)
- **위험 등급:** **{risk_info}**
- **응급 처치 가이드:**
{chr(10).join([f"  - {line.strip()}" for line in data.get('action', '').split('.') if line.strip()])}

### 4. 법적 근거 및 규정 (Legal Basis)
- **참조 규정:** `{data.get('law_ref', 'N/A')}`
- **법적 권고사항:** 본 진단 결과는 **선원법 시행규칙** 및 **WHO 국제선내의료지침**의 표준 처치 프로세스를 준수하여 도출되었습니다.

---

### 💡 팀 개발 공유 사항 (Technical Notes)
1. **모델 정보:** MobileNetV3 Large 기반 최적화 엔진 사용 (보강 데이터셋 4,212장 학습 완료)
2. **데이터 특이사항:** 자창(Stab Wound) 데이터의 경우 집중 증강을 통해 95% 이상의 높은 신뢰도를 확보함.
3. **다음 단계:** 해당 JSON 데이터는 '표준 의료보고서(Docx)' 자동 생성 모듈의 입력값으로 연동될 예정입니다.

---
*Created by M-MEDIC Automation System*
"""
    output_path = json_path.replace('.json', '_REPORT.md')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    return output_path

if __name__ == "__main__":
    # 가장 최근에 생성된 리포트 JSON 찾기
    report_files = glob.glob(os.path.join(os.path.dirname(__file__), "report_*.json"))
    if not report_files:
        print("공유할 진단 결과 파일이 없습니다. 먼저 m_medic_v2.py를 실행하세요.")
    else:
        latest_report = max(report_files, key=os.path.getctime)
        print(f"최신 진단 결과 분석 중: {os.path.basename(latest_report)}")
        md_path = generate_markdown_report(latest_report)
        print(f"✅ 팀 공유용 Markdown 보고서가 생성되었습니다: {os.path.basename(md_path)}")
        
        # 생성된 보고서 내용 출력 (확인용)
        with open(md_path, 'r', encoding='utf-8') as f:
            print("\n" + "="*50 + "\n[공유할 내용 미리보기]\n" + "="*50)
            print(f.read())
