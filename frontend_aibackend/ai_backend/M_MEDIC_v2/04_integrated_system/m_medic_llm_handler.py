import requests
import json
import os

class MaritimeMedicLLM:
    """
    Maritime-Medic 오프라인 AI 연동 핸들러
    윈도우 PC에서 라즈베리파이 게이트웨이를 통해 젯슨 나노의 Ollama를 원격 호출합니다.
    """
    def __init__(self, host="YOUR_JETSON_HOST", port=11434):
        # 라즈베리파이의 외부 IP와 전달된 Ollama 포트 설정
        self.host = host
        self.port = port
        self.url = f"http://{self.host}:{self.port}/v1/chat/completions"

    def generate_medical_advice(self, diagnosis_name, risk_level, current_action):
        """
        진단 결과에 따라 로컬 LLM에게 심화 조치 사항을 요청합니다.
        """
        prompt = f"""당신은 선박 의료 지원 AI 시스템 'M-MEDIC'의 전문 어드바이저입니다.
현재 선내에 의사가 없는 긴급 상황입니다. 아래 진단 결과를 바탕으로 선원이 즉시 수행해야 할 조치 사항을 전문가 수준에서, 하지만 이해하기 쉽게 설명해주세요.

[진단 정보]
- 진단명: {diagnosis_name}
- 위험 등급: {risk_level}
- 기본 조치: {current_action}

[요청 사항]
1. 위 기본 조치를 구체화한 단계별 처치법 (Step-by-Step)
2. 절대 하지 말아야 할 행동 (금기 사항)
3. 상태가 악화될 경우의 판단 기준 (회항 결정 포인트)

답변은 한국어로, 선원들에게 신뢰감을 줄 수 있는 침착한 어조로 작성해주세요."""

        data = {
            "model": "llama3.2:1b",
            "messages": [
                {"role": "system", "content": "당신은 선박 내 긴급 의료 상황을 돕는 유능하고  침착한 AI 의사입니다. 모든 답변은 선원법과 국제 의료 지침을 준수하며 실질적인 도움을 주어야 합니다."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3, # 의료 정보이므로 보수적으로 설정
            "max_tokens": 1000
        }

        try:
            print(f"[*] 로컬 LLM({self.host}:{self.port})에 심화 지침 요청 중...")
            response = requests.post(self.url, json=data, timeout=45)
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                err_msg = f"[LLM 연결 오류] 서버 응답 코드: {response.status_code}. 사유: {response.text}"
                print(f"[LLM Error] {err_msg}")
                return err_msg
        except Exception as e:
            print(f"[LLM Exception] {e}")
            return f"[LLM 예외] {str(e)}. 로컬 AI 서버가 활성화되지 않았습니다."

if __name__ == "__main__":
    # 독립 테스트용
    handler = MaritimeMedicLLM()
    print(handler.generate_medical_advice("열상(Laceration)", "HIGH", "지혈 및 세척 후 붕대 처치"))
