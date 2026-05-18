# MDTS Frontend + AI Backend 결합 가이드 (04_frontend_aibackend)

## 개요
- 원본 보존: `01_frontend_web_dashboard`, `02_ai_backend` 원본 파일은 수정하지 않고 읽기만 사용
- 결합본 위치: `D:\mdts-separated-workspace\04_frontend_aibackend`
- 역할
  - 프론트엔드: Vite React 앱 + 기존 Node 대시보드 API(`server/index.js`)
  - AI 백엔드: FastAPI(`ai_backend/m_medic_server.py`) + 의존 모듈(`ai_backend/M_MEDIC_v2/04_integrated_system`)

## 포함 파일
- `server/index.js` : 기존 웹 대시보드 API (port 4000)
- `ai_backend/m_medic_server.py` : AI 서버 진입점 (port 8000)
- `ai_backend/m_medic_knowledge_engine.py`
- `ai_backend/m_medic_knowledge_engine.py`
- `ai_backend/maritime_medical_knowledge.txt`
- `ai_backend/medical_vector_db/*`
- `ai_backend/M_MEDIC_v2/04_integrated_system/{m_medic_v2.py,m_medic_llm_handler.py,generate_team_report.py,visualize_diagnosis.py}`
- `start_full_stack.mjs` : 세팅 실행 스크립트

## 실행 방법
1) 프런트+웹백엔드+AI백엔드를 모두 동시에 기동
   - `npm install`
   - `npm run dev:all`
2) 개별 실행(필요 시)
   - 프런트: `npm run dev:frontend`
   - Node API: `npm run dev:api`
   - AI API: `npm run dev:ai`

## AI 연동 핵심 동작
- `GET /vitals/live?crew_id=<ID>`: 요청 시 MariaDB(`tb_vital`)에서 실시간 바이탈 조회
- `POST /analyze/chat`: 요청 바디의 `patient_data`/`vitals`와 MariaDB 조회 결과(`tb_crew`,`tb_vital`,`tb_patient_history`) + Chroma(RAG)를 결합해 답변 생성
- `POST /rag/reload`: Obsidian/Markdown 동기화 트리거
  - 수동 동기화: `curl -X POST http://localhost:8000/rag/reload -F "source_dir=<ABS_PATH>"`
  - 자동 동기화: `MDTS_OBSIDIAN_AUTO_SYNC=1`, `MDTS_OBSIDIAN_DIR=<ABS_PATH>`, `MDTS_OBSIDIAN_SYNC_SEC=<초>`
- Node 대시보드 API 추가: `GET /api/db/status`로 원격/로컬 MariaDB 연결 상태 확인 가능

## 포트
- Frontend: `5174` (필요 시 `MDTS_FRONTEND_PORT` 환경변수로 변경 가능)
- Dashboard API: `4000`
- AI API: `8000`

## 환경 변수
- AI 백엔드 실행 시 `PYTHONPATH`를 자동 구성 (`start_full_stack.mjs`)
- 필요 시 `MDTS_AI_PYTHON`, `MDTS_FRONTEND_PORT` 사용 가능
- RAG 동기화: `MDTS_OBSIDIAN_AUTO_SYNC=1`, `MDTS_OBSIDIAN_DIR`, `MDTS_OBSIDIAN_SYNC_SEC`
- Ollama: `MDTS_OLLAMA_HOST`, `MDTS_OLLAMA_PORT`
