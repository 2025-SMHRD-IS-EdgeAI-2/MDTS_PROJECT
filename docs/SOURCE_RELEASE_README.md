# MDTS Maritime Medic Integrated Demo

## TL;DR

이 저장소는 선박용 엣지 AI 의료 지원 시스템 MDTS(Maritime Digital Triage System)의 통합 시연본이다. 웹 대시보드, AI 백엔드, Raspberry Pi 센서 서버, Jetson Nano PyQt5 장비 UI를 한 저장소에 정리했다.

## 포함 모듈

- `frontend_aibackend`: React 웹 대시보드, Node API, FastAPI AI 백엔드, Ollama/RAG 연동
- `device_sensor_pyqt5`: Raspberry Pi 센서 서버, Jetson Nano PyQt5 GUI, 외상 촬영, 집중 관리 상태 동기화
- `MDTS_DB_info.md`: DB와 Vector DB 인프라 메모

## 주요 문서

- `frontend_aibackend/README.md`
- `frontend_aibackend/README.pdf`
- `device_sensor_pyqt5/README.md`
- `device_sensor_pyqt5/README.pdf`

## 핵심 흐름

```text
PyQt5 sensor and camera
  → Raspberry Pi Sensor API
  → Node Dashboard API
  → React Web Dashboard
  → FastAPI AI Backend
  → MariaDB + ChromaDB + Obsidian Markdown RAG
```

## 운영 기준

이 저장소는 실제 장비와 DB 접속 구조를 포함하는 시연용 private repository다. 공개 저장소로 전환하기 전에는 접속정보, 개인정보, 의료정보, 장비 IP를 환경 변수와 secret store로 분리해야 한다.

## 문서 기준일

- 2026-05-13
