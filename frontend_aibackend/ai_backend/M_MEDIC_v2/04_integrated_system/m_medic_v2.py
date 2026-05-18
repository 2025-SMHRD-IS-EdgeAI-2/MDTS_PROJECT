"""
[M-Medic v2] AI 통합 진단 시스템 - 최종 버전
----------------------------------------------
개선 사항 (v1 대비):
  ① 외상 분류가 시뮬레이션 → 실제 MobileNetV3 모델로 교체
  ② EfficientNet-B3 멀티모달 모델 탑재 (메타데이터 융합)
  ③ ML 사고 위험 예측과 DL 진단 결과를 연계
  ④ 신뢰도(Confidence) 기반 경고: 70% 미만 시 "재촬영 권고" 출력
  ⑤ 선원법 지침 + 표준의료보고서 자동 초안 생성

사용법:
  python m_medic_v2.py --image <이미지경로> [--mode skin|wound] [--age 45] [--gender male]
  python m_medic_v2.py --demo   ← 모델 없이 시스템 흐름 시연
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np

# ─── 로컬 LLM 핸들러 ────────────────────────────────────────────────────────
try:
    from m_medic_llm_handler import MaritimeMedicLLM
except ImportError:
    # 핸들러가 없을 경우를 대비한 더미 클래스
    class MaritimeMedicLLM:
        def generate_medical_advice(self, *args): return "LLM 핸들러를 찾을 수 없습니다."

# ─── 경로 ─────────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent
SKIN_MODEL   = BASE_DIR / ".." / "03_deep_learning" / "skin_disease" / "results" / "best_skin_efficientnet.pth"
WOUND_MODEL  = BASE_DIR / ".." / "03_deep_learning" / "wound_detection" / "results" / "mobilenet_v3_wound_best.pth"
EXPERT_MODEL = BASE_DIR / ".." / "03_deep_learning" / "wound_detection" / "results" / "efficientnet_v2_s_wound_expert.pth"

# ─── 지식 베이스 (선원법 + WHO 국제선내의료지침) ────────────────────────────
SKIN_KNOWLEDGE = {
    "mel":   {"name": "흑색종(악성피부암)", "risk": "CRITICAL",
              "action": "즉시 회항 권고. 전이 위험이 매우 높음. 24시간 내 전문의 진료 필수.",
              "law_ref": "선원법 시행규칙 [별표 5의5] 3항 - 즉시 하선 후 입원 치료"},
    "bcc":   {"name": "기저세포암(피부암)", "risk": "HIGH",
              "action": "차항지 도착 즉시 피부과 진료 권고. 자외선 차단 필수.",
              "law_ref": "선원법 시행규칙 [별표 5의5] 4항 - 육지 병원 전원 권고"},
    "akiec": {"name": "광선각화증(암전단계)", "risk": "MEDIUM",
              "action": "자외선 차단크림 도포 + 경과 관찰. 1개월 내 피부과 방문.",
              "law_ref": "WHO 선내의료지침 Ch.4 - 피부 질환 관리"},
    "bkl":   {"name": "양성각화증", "risk": "LOW",
              "action": "양성 병변. 모양/크기 변화 시 재검진. 특별 처치 불필요.",
              "law_ref": "WHO 선내의료지침 Ch.4 - 양성 피부 병변"},
    "df":    {"name": "피부섬유종", "risk": "LOW",
              "action": "양성 섬유성 병변. 통증 없으면 경과 관찰.",
              "law_ref": "WHO 선내의료지침 Ch.4"},
    "nv":    {"name": "멜라닌세포모반(점)", "risk": "LOW",
              "action": "일반적인 점. 비대칭/색변화 시 재진단. 특별 처치 불필요.",
              "law_ref": "WHO 선내의료지침 Ch.4"},
    "vasc":  {"name": "혈관병변", "risk": "LOW",
              "action": "혈관성 병변. 출혈 시 압박 지혈. 경과 관찰.",
              "law_ref": "WHO 선내의료지침 Ch.4"},
}

WOUND_KNOWLEDGE = {
    "Abrasions":       {"name": "찰과상(Abrasions)", "risk": "LOW",
                        "action": "이물질 제거 후 생리식염수 세척. 소독 연고 도포 후 거즈 보호.",
                        "law_ref": "WHO 선내의료지침 Ch.7"},
    "Bruises":         {"name": "타박상(Bruises)", "risk": "LOW",
                        "action": "초기 48시간 냉찜질. 부종 심할 경우 골절 여부 확인.",
                        "law_ref": "선원법 시행규칙 [별표 5의5]"},
    "Burns":           {"name": "화상(Burns)", "risk": "HIGH",
                        "action": "20분 이상 냉각. 수포 파열 금지. 2도 이상 시 회항 권고.",
                        "law_ref": "선원법 시행규칙 [별표 5의5] 화상처치"},
    "Cut":             {"name": "절상(Cut)", "risk": "MEDIUM",
                        "action": "압박 지혈. 세척 후 소독. 깊은 경우 봉합 필요.",
                        "law_ref": "WHO 선내의료지침 Ch.7"},
    "Laceration":      {"name": "열상(Laceration)", "risk": "HIGH",
                        "action": "지혈 및 세척. 깊이 1cm 이상 시 봉합 필수. 감염 주의.",
                        "law_ref": "선원법 시행규칙 [별표 5의5]"},
    "Stab_wound":      {"name": "자창(Stab Wound)", "risk": "CRITICAL",
                        "action": "박힌 물체 제거 금지. 즉시 병원 이송. 내부 손상 확인 필수.",
                        "law_ref": "선원법 시행규칙 [별표 5의5]"},
}

RISK_COLORS = {
    "CRITICAL": "[!!!CRITICAL]",
    "HIGH":     "[HIGH]",
    "MEDIUM":   "[MEDIUM]",
    "LOW":      "[LOW]",
    "NONE":     "[NONE]",
    "UNKNOWN":  "[UNKNOWN]",
}

# ─── 이미지 전처리 ────────────────────────────────────────────────────────────
TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

SKIN_CLASSES  = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
WOUND_CLASSES = ['Abrasions', 'Bruises', 'Burns', 'Cut', 'Laceration', 'Stab_wound']


# ─── 모델 로더 ────────────────────────────────────────────────────────────────
def load_skin_model(device):
    """EfficientNet-B3 기반 멀티모달 피부 분류 모델 로드"""
    try:
        from torchvision.models import efficientnet_b3, EfficientNet_B3_Weights
        backbone = efficientnet_b3(weights=None)
        in_feat  = backbone.classifier[1].in_features
        backbone.classifier = nn.Identity()
    except Exception:
        backbone = models.resnet50(weights=None)
        in_feat  = backbone.fc.in_features
        backbone.fc = nn.Identity()

    class MultiModalNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.backbone = backbone
            self.img_head = nn.Sequential(
                nn.Linear(in_feat, 512), nn.BatchNorm1d(512), nn.ReLU(), nn.Dropout(0.4)
            )
            self.meta_head = nn.Sequential(
                nn.Linear(4, 32), nn.ReLU(), nn.Linear(32, 32), nn.ReLU()
            )
            self.classifier = nn.Sequential(
                nn.Linear(544, 256), nn.ReLU(), nn.Dropout(0.2), nn.Linear(256, 7)
            )
        def forward(self, x, meta):
            return self.classifier(
                torch.cat([self.img_head(self.backbone(x)), self.meta_head(meta)], 1)
            )

    model = MultiModalNet().to(device)
    if SKIN_MODEL.exists():
        model.load_state_dict(torch.load(str(SKIN_MODEL), map_location=device))
        model.eval()
        return model, True
    return model, False   # 모델 미로드 (데모 모드용)


def load_wound_class_mapping():
    """학습 시 저장된 클래스 매핑 JSON을 로드 (없으면 기본값 사용)"""
    mapping_path = BASE_DIR / ".." / "03_deep_learning" / "wound_detection" / "results" / "wound_class_mapping.json"
    if mapping_path.exists():
        with open(str(mapping_path), "r", encoding="utf-8") as f:
            mapping = json.load(f)
        # {str(idx): class_name} → 인덱스 순으로 정렬된 리스트 반환
        return [mapping[str(i)] for i in range(len(mapping))]
    return WOUND_CLASSES   # 기본값 폴백


def load_wound_model(device, num_classes=None, use_expert=False):
    """외상 분류 모델 로드 (일반/전문가 모드 선택)"""
    wound_classes = ['Abrasions', 'Bruises', 'Burns', 'Cut', 'Laceration', 'Stab_wound']
    if num_classes is None:
        num_classes = len(wound_classes)
        
    model_path = EXPERT_MODEL if use_expert else WOUND_MODEL
    
    try:
        if use_expert:
            from torchvision.models import efficientnet_v2_s
            model = efficientnet_v2_s(weights=None)
            in_feat = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(in_feat, num_classes)
            model_name = "EfficientNet-V2-S (Expert)"
        else:
            from torchvision.models import mobilenet_v3_large
            model = mobilenet_v3_large(weights=None)
            in_feat = model.classifier[3].in_features
            model.classifier[3] = nn.Linear(in_feat, num_classes)
            model_name = "MobileNetV3 (Standard)"
    except Exception:
        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        model_name = "ResNet18 (Fallback)"

    model = model.to(device)
    if model_path.exists():
        model.load_state_dict(torch.load(str(model_path), map_location=device))
        model.eval()
        print(f"[*] {model_name} 로딩 완료.")
        return model, True, wound_classes
    return model, False, wound_classes


# ─── 핵심 진단 함수 ────────────────────────────────────────────────────────────
def diagnose_skin(img_path: str, age: float = 45.0, gender: str = "unknown",
                  model=None, device=None):
    """피부 병변 진단"""
    if device is None:
        device = torch.device("cpu")

    try:
        img = Image.open(img_path).convert("RGB")
    except Exception as e:
        return {"error": f"이미지 로드 실패: {e}"}

    img_t    = TRANSFORM(img).unsqueeze(0).to(device)
    age_norm = min(age / 90.0, 1.0)
    gender_v = 1.0 if gender.lower() == "male" else 0.0
    meta     = torch.tensor([[age_norm, gender_v, 0.5, 0.0]]).to(device)

    with torch.no_grad():
        logits = model(img_t, meta)
        probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

    pred_idx    = int(np.argmax(probs))
    confidence  = float(probs[pred_idx])
    pred_class  = SKIN_CLASSES[pred_idx]
    knowledge   = SKIN_KNOWLEDGE.get(pred_class, {
        "name": "알 수 없는 병변", "risk": "UNKNOWN",
        "action": "전문 의료진 자문 필요.", "law_ref": "-"
    })

    top3 = sorted(enumerate(probs), key=lambda x: -x[1])[:3]
    top3_classes = [
        {"class": SKIN_CLASSES[i], "name": SKIN_KNOWLEDGE.get(SKIN_CLASSES[i], {}).get("name", ""),
         "prob": float(p)} for i, p in top3
    ]

    return {
        "mode": "skin",
        "prediction": pred_class,
        "confidence": confidence,
        "low_confidence": confidence < 0.70,
        "top3": top3_classes,
        **knowledge
    }


def diagnose_wound(img_path: str, model=None, device=None, wound_classes=None):
    """외상 분류 진단"""
    if device is None:
        device = torch.device("cpu")
    
    # 클래스 리스트 강제 지정 (학습 결과와 동기화)
    fixed_classes = ['Abrasions', 'Bruises', 'Burns', 'Cut', 'Laceration', 'Stab_wound']
    if wound_classes is None or len(wound_classes) != 6:
        wound_classes = fixed_classes

    try:
        img = Image.open(img_path).convert("RGB")
    except Exception as e:
        return {"error": f"이미지 로드 실패: {e}"}

    img_t = TRANSFORM(img).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(img_t)
        probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

    # 디버깅: 모델 출력값 확인
    print(f"DEBUG - Probs: {probs}")
    
    if probs.ndim == 0:
        probs = np.array([probs])

    pred_idx   = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    
    if pred_idx >= len(wound_classes):
        pred_class = "Unknown"
    else:
        pred_class = wound_classes[pred_idx]
    
    print(f"DEBUG - Predicted Index: {pred_idx}, Class: {pred_class}")
    
    knowledge = None
    for k, v in WOUND_KNOWLEDGE.items():
        if k.lower().strip() == pred_class.lower().strip():
            knowledge = v
            break
    
    if not knowledge:
        knowledge = {
            "name": f"미분류({pred_class})", "risk": "MEDIUM",
            "action": "전문 의료진 자문 필요.", "law_ref": "-"
        }

    return {
        "mode": "wound",
        "prediction": pred_class,
        "confidence": confidence,
        "low_confidence": confidence < 0.70,
        **knowledge
    }


# ─── 의료 보고서 출력 ─────────────────────────────────────────────────────────
def print_report(result: dict, img_path: str = "", age: float = 0, gender: str = ""):
    risk  = result.get("risk", "UNKNOWN")
    icon  = RISK_COLORS.get(risk, "⚪")
    now   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print()
    print("=" * 62)
    print("         M-Medic v2.0 통합 의료 진단 보고서")
    print("=" * 62)
    print(f"  진단 시각 : {now}")
    print(f"  이미지    : {img_path}")
    if age:    print(f"  환자 나이 : {age}세")
    if gender: print(f"  환자 성별 : {gender}")
    print("-" * 62)
    print(f"  판독 결과 : {result.get('name', '-')}")
    print(f"  위험 등급 : {icon} {risk}")
    print(f"  신뢰도    : {result.get('confidence', 0):.1%}")

    if result.get("low_confidence"):
        print("  ⚠ 신뢰도 70% 미만: 재촬영 또는 전문가 판독 권고")

    if result.get("mode") == "skin" and result.get("top3"):
        print("\n  [상위 3개 후보 진단]")
        for i, t in enumerate(result["top3"], 1):
            print(f"    {i}. {t['name']:<20} ({t['prob']:.1%})")

    print()
    print(f"  [긴급 조치 지침]")
    for line in result.get("action", "-").split(". "):
        if line:
            print(f"    - {line}.")

    print()
    print(f"  [법적 근거]")
    print(f"    {result.get('law_ref', '-')}")
    
    # AI 심화 가이드 출력 (LLM 연동 시)
    if result.get("ai_advice"):
        print("-" * 62)
        print("  [M-MEDIC AI 심화 처치 가이드]")
        print(result["ai_advice"])
        
    print("=" * 62)

    if risk in ("CRITICAL", "HIGH"):
        print()
        if risk == "CRITICAL":
            print("  !! 즉시 회항 및 연안 병원 이송을 강력 권고합니다 !!")
        else:
            print("  !! 가능한 빨리 육지 의료기관 방문을 권고합니다 !!")
        print()

    # 이미지 Base64 인코딩 추가
    import base64
    try:
        with open(img_path, "rb") as f:
            img_base64 = base64.b64encode(f.read()).decode('utf-8')
    except:
        img_base64 = ""

    # JSON 형식 보고서도 저장
    report_path = str(BASE_DIR / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({**result, "timestamp": now, "image": img_path, "image_data": img_base64,
                   "patient_age": age, "patient_gender": gender}, f,
                  ensure_ascii=False, indent=2)
    print(f"  보고서 저장: {report_path}")


# ─── 데모 모드 (모델 없이 시스템 흐름 시연) ──────────────────────────────────
def run_demo():
    demo_cases = [
        {"mode": "skin",  "img": "sample_melanoma.jpg", "age": 52, "gender": "male",
         "result": SKIN_KNOWLEDGE["mel"]},
        {"mode": "wound", "img": "sample_burn.jpg",     "age": 35, "gender": "male",
         "result": WOUND_KNOWLEDGE["Burns"]},
        {"mode": "skin",  "img": "sample_nv.jpg",       "age": 28, "gender": "female",
         "result": SKIN_KNOWLEDGE["nv"]},
    ]

    print("\n[데모 모드] 실제 이미지 없이 시스템 흐름을 시연합니다.\n")
    for case in demo_cases:
        r = {**case["result"],
             "mode": case["mode"],
             "prediction": "demo",
             "confidence": 0.91,
             "low_confidence": False,
             "top3": []}
        print_report(r, case["img"], case["age"], case["gender"])


# ─── CLI 진입점 ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="M-Medic v2 통합 진단 시스템")
    parser.add_argument("--image",  type=str, help="진단할 이미지 경로")
    parser.add_argument("--mode",   type=str, choices=["skin", "wound"], default="skin")
    parser.add_argument("--expert", action="store_true", help="베테랑 분석가용 고성능 모델 사용")
    parser.add_argument("--age",    type=float, default=45.0)
    parser.add_argument("--gender", type=str,  default="unknown")
    parser.add_argument("--demo",   action="store_true")
    parser.add_argument("--llm",    action="store_true", help="로컬 LLM을 통한 심화 지침 생성 활성화")
    args = parser.parse_args()

    if args.demo:
        run_demo()
        return

    if not args.image:
        print("사용법: python m_medic_v2.py --image <경로> [--mode skin|wound] [--expert] [--llm]")
        print("       python m_medic_v2.py --demo")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if args.mode == "skin":
        model, loaded = load_skin_model(device)
        if not loaded:
            print("[경고] 학습된 피부 분류 모델이 없습니다.")
            sys.exit(1)
        result = diagnose_skin(args.image, args.age, args.gender, model, device)
    else:
        model, loaded, wound_classes = load_wound_model(device, use_expert=args.expert)
        if not loaded:
            print(f"[경고] {'Expert' if args.expert else 'Standard'} 모델 파일이 없습니다.")
            sys.exit(1)
        result = diagnose_wound(args.image, model, device, wound_classes)

    # 로컬 LLM 심화 지침 생성
    if args.llm and "error" not in result:
        llm = MaritimeMedicLLM()
        advice = llm.generate_medical_advice(
            result.get("name", "알 수 없는 질환"),
            result.get("risk", "UNKNOWN"),
            result.get("action", "기본 처치 필요")
        )
        result["ai_advice"] = advice

    # 강제 결과 출력
    if "error" in result:
        print(f"진단 오류: {result['error']}")
    else:
        print_report(result, args.image, args.age, args.gender)


if __name__ == "__main__":
    main()
