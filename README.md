## 선박용 엣지 AI 의료 지원 시스템
# 팀명 : MDTS

<img src="./frontend_aibackend/src/assets/logo.png" width="180" alt="MDTS Logo"/>

## 서비스 소개
* 서비스명 : MDTS(Maritime Digital Triage System)
* 서비스 설명
  - 러기드 태블릿 기반 선박용 엣지 AI 의료 지원 시스템
  - 선박 내 응급 상황에서 선원 정보, 바이탈 데이터, 외상 이미지, AI 분석 결과를 통합 관리
  - 온라인/오프라인 듀얼 모드를 고려하여 웹 대시보드, AI 백엔드, 센서 디바이스를 분리 운영
  - 웹 대시보드, Node API, FastAPI AI 서버, Raspberry Pi 센서 서버, Jetson Nano PyQt5 장비 UI를 통합한 프로젝트

## 배포 링크
| 구분 | 링크 |
| --- | --- |
| 통합 웹 대시보드 | [https://frontendaibackend.vercel.app](https://frontendaibackend.vercel.app) |
| 웹 대시보드 이전 배포본 | [https://maritime-medic-five.vercel.app](https://maritime-medic-five.vercel.app) |

## 원본 GitHub
| 구분 | GitHub |
| --- | --- |
| 통합 데모 원본 | [Capernaum-user/mdts-maritime-medic-integrated-demo](https://github.com/Capernaum-user/mdts-maritime-medic-integrated-demo) |
| 웹 대시보드 원본 | [eelishalee/-maritime-medic](https://github.com/eelishalee/-maritime-medic) |

> 참고: 통합 데모 원본 저장소는 Private 저장소다. 이 저장소는 팀 공유용 공개 저장소이며, 실제 DB/장비 접속정보는 placeholder로 치환했다.

## 프로젝트 기간
* 2026.05 기준 공유 버전

## 주요기능
* 선원 정보 및 환자 상태 웹 대시보드
* 실시간 바이탈 데이터 조회 및 응급 환자 상태 관리
* 외상 촬영 이미지 기반 AI 분석 연동
* FastAPI 기반 의료 AI 백엔드 연동
* RAG/Vector DB 기반 의료 지식 검색
* Raspberry Pi 센서 서버 연동
* Jetson Nano PyQt5 카메라 및 응급처치 UI 연동
* MySQL/MariaDB 기반 선원·바이탈 데이터 관리
* Vercel 기반 프론트엔드 배포

## 저장소 구성
```text
MDTS_PROJECT/
├── README.md
├── .env.example
├── docs/
│   ├── DATABASE_STRUCTURE.md
│   ├── SECURITY_NOTES.md
│   ├── SOURCE_RELEASE_README.md
│   ├── frontend_aibackend_README.pdf
│   └── device_sensor_pyqt5_README.pdf
├── frontend_aibackend/
│   ├── src/
│   ├── server/
│   ├── ai_backend/
│   ├── rpi/
│   ├── tools/
│   ├── public/
│   ├── README.md
│   └── package.json
└── device_sensor_pyqt5/
    ├── main.py
    ├── sensor_server_rpi.py
    ├── sensor_handler.py
    ├── README.md
    └── requirements.txt
```

## 기술스택
<table>
    <tr>
        <th>구분</th>
        <th>내용</th>
    </tr>
    <tr>
        <td>사용언어</td>
        <td>
            <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=Python&logoColor=white"/>
            <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=JavaScript&logoColor=black"/>
            <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=HTML5&logoColor=white"/>
            <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=CSS3&logoColor=white"/>
        </td>
    </tr>
    <tr>
        <td>Front-End</td>
        <td>
            <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=React&logoColor=black"/>
            <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white"/>
            <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=Vercel&logoColor=white"/>
        </td>
    </tr>
    <tr>
        <td>Back-End</td>
        <td>
            <img src="https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=node.js&logoColor=white"/>
            <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=Express&logoColor=white"/>
            <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white"/>
        </td>
    </tr>
    <tr>
        <td>AI / Data</td>
        <td>
            <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=Ollama&logoColor=white"/>
            <img src="https://img.shields.io/badge/ChromaDB-5B21B6?style=for-the-badge"/>
            <img src="https://img.shields.io/badge/RAG-0F172A?style=for-the-badge"/>
        </td>
    </tr>
    <tr>
        <td>데이터베이스</td>
        <td>
            <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=MySQL&logoColor=white"/>
            <img src="https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=MariaDB&logoColor=white"/>
        </td>
    </tr>
    <tr>
        <td>Edge / Device</td>
        <td>
            <img src="https://img.shields.io/badge/Raspberry%20Pi-A22846?style=for-the-badge&logo=RaspberryPi&logoColor=white"/>
            <img src="https://img.shields.io/badge/NVIDIA%20Jetson-76B900?style=for-the-badge&logo=NVIDIA&logoColor=white"/>
            <img src="https://img.shields.io/badge/PyQt5-41CD52?style=for-the-badge"/>
        </td>
    </tr>
    <tr>
        <td>협업도구</td>
        <td>
            <img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=Git&logoColor=white"/>
            <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=GitHub&logoColor=white"/>
        </td>
    </tr>
</table>

* 주요 활용 언어 : Python(Back-End / AI / Device), JavaScript(Front-End)
* Front-End 세부 스택 : React, Vite, Vercel
* Back-End 세부 스택 : Node.js, Express, FastAPI
* AI 세부 스택 : Ollama, RAG, ChromaDB
* Device 세부 스택 : Raspberry Pi, Jetson Nano, PyQt5
* DataBase : MySQL, MariaDB
* 형상 관리 도구 : GitHub

## 시스템 아키텍처
```text
[React Web Dashboard]
        |
        | HTTP API
        v
[Node.js Dashboard API]
        |-- MySQL/MariaDB : crew, vital, analysis, first-aid data
        |-- Raspberry Pi Sensor API
        |-- Jetson Nano PyQt5 Control API
        v
[FastAPI AI Backend]
        |-- Ollama LLM
        |-- ChromaDB Vector DB
        |-- Markdown medical knowledge source
        v
[Raspberry Pi Sensor Server / Jetson Nano PyQt5]
```

## 유스 케이스
* 선원 목록 및 환자 기본 정보 확인
* 응급 상황 발생 시 환자 상태 대시보드 확인
* 바이탈 측정값 기반 상태 판단
* 외상 이미지 촬영 후 AI 분석 요청
* 응급처치 가이드 및 환자 기록 확인
* PyQt5 장비 UI와 웹 대시보드의 집중 관리 상태 동기화

## 서비스 흐름도
```text
선원 선택
  -> 바이탈/환자 정보 확인
  -> 외상 촬영 또는 증상 입력
  -> AI 백엔드 분석 요청
  -> 응급처치 가이드 확인
  -> 환자 상태 기록 및 공유
```

## ER 다이어그램
* 주요 테이블
  - `tb_crew` : 선원 기본 정보
  - `tb_vital` : 바이탈 측정값
  - `tb_analysis` : AI 분석 결과
  - `tb_firstaid` : 응급처치 기록
  - `tb_patient_history` : 환자 지난 기록

자세한 내용은 [docs/DATABASE_STRUCTURE.md](./docs/DATABASE_STRUCTURE.md)를 참고한다.

## 화면구성
* 로그인 및 메인 대시보드
* 선원 관리 화면
* 환자 차트 화면
* 응급처치 화면
* AI 분석 화면
* 설정 화면
* PyQt5 센서/카메라 장비 화면

## 실행 방법
### Front-End + Node API
```bash
cd frontend_aibackend
npm install
npm run dev:all
```

### AI Back-End
```bash
cd frontend_aibackend
npm run dev:ai
```

### Device / Sensor
```bash
cd device_sensor_pyqt5
pip install -r requirements.txt
python main.py
```

## 환경변수
실제 DB, 장비, 터널 주소는 코드에 직접 넣지 않는다. `.env.example`을 복사해 환경에 맞게 설정한다.

```bash
cp .env.example .env
```

## 팀원 역할
| 역할 | 담당 |
| --- | --- |
| Project Management | MDTS 팀 |
| Front-End | 웹 대시보드 구현 |
| Back-End | Node/Express API, FastAPI AI 서버 구현 |
| AI / Data | RAG, Vector DB, 의료 응답 흐름 구현 |
| Edge Device | Raspberry Pi, Jetson Nano, PyQt5 센서 시스템 구현 |
| Deployment | Vercel 배포 및 GitHub 공유 |

## Trouble Shooting
* Vercel 배포 환경과 로컬 엣지 장치 연동
  - 로컬 장치 API는 외부에서 직접 접근할 수 없어 터널 또는 중계 API 구성이 필요
* Private 저장소 공유 제한
  - 통합 원본 저장소는 내부 접속정보가 포함될 수 있어 권한 있는 사용자만 열람 가능
  - 이 공개 저장소에는 민감정보를 placeholder로 치환한 공유본을 배치
* Edge Device 네트워크 변동
  - Raspberry Pi, Jetson Nano, Windows Gateway의 IP 변경 시 환경변수 갱신 필요
* 의료 응답 안전성
  - AI 결과는 의료진 판단을 대체하지 않으며 응급처치 보조 정보로 제한

## 보안 안내
이 저장소는 공개 공유용이다. 실제 운영 전 반드시 [docs/SECURITY_NOTES.md](./docs/SECURITY_NOTES.md)를 확인한다.
