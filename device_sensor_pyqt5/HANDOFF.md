# MDTS 프로젝트 핸드오프 프롬프트

## 프로젝트 개요
**MDTS (Maritime Digital Triage System)** — 선박 응급 의료 모니터링 시스템
- PyQt5 기반 실시간 바이탈 사인 모니터 GUI
- Raspberry Pi에서 센서 데이터 수집 → Flask API → Jetson Nano에서 GUI 표시
- 웹 버전 레포: https://github.com/eelishalee/-maritime-medic.git

## 시스템 구성

| 디바이스 | IP | ID/PW | 역할 |
|---|---|---|---|
| Raspberry Pi | YOUR_RPI_HOST | pi / YOUR_RPI_PASSWORD | 센서 서버 (Flask :5000) |
| Jetson Nano | YOUR_JETSON_HOST | jetson / YOUR_JETSON_PASSWORD | GUI 실행 (PyQt5, MobaXterm X11) |
| Windows PC | 로컬 | - | 개발 환경 |

## 파일 구조

```
ship-emergency-hardware/
├── main.py              # PyQt5 GUI (젯슨 나노에서 실행)
├── sensor_server_rpi.py # Flask 센서 서버 (RPi에서 실행)
├── sensor_handler.py    # 센서 관리 클래스 (미사용, 참고용)
├── transfer.py          # paramiko SFTP 전송 스크립트 (유틸)
└── diag_sensor.py       # MAX30100 센서 진단 스크립트 (유틸)
```

## 최신 작업 내역 (2025-05-11)

### 1. 하드코딩 바이탈 제거 → 실제 센서 연동
- **이전**: 박기관 환자의 바이탈 값 `[102, 94, "158/95", 20, 37.8]` 하드코딩 (데모 1회성)
- **변경**: `sensor_fetcher.get()`으로 RPi `/vitals` 엔드포인트에서 실시간 데이터 수신
- **동작**: 선원관리에서 선원 선택 전까지 바이탈 `--` 상태, 선택 후 실시간 센서값 갱신 시작
- **위치**: `main.py` MonitorScreen.up() 메서드

### 2. 선원관리 화면 — 웹 동일 구조로 재구현 (16명)
- **이전**: 4명 선원, 단순 카드 리스트
- **변경**: 웹(`CrewManagement.jsx`)과 동일한 16명 선원 데이터 + 테이블 UI

**선원 데이터 필드:**
```python
{"id", "name", "age", "role", "dept", "blood", "chronic", "allergies",
 "contact", "emergencyName", "emergency", "height", "weight",
 "boardingDate", "location", "dob", "gender", "lastMed", "note",
 "pastHistory", "isEmergency"}
```

**UI 구조:**
- 탭 필터: 전체 선원 / 응급 환자 / 항해부 / 기관부 / 조리/지원
- 검색: 이름, ID, 직책으로 필터링
- 테이블 5컬럼:
  - 이름/ID (150px 고정, 2줄 표시)
  - 소속/직책 (Stretch)
  - 나이/혈액형 (100px 고정, `52세/O+` 형태)
  - 기저질환/알레르기 (Stretch, 있는것만 `/`로 구분)
  - 환자관리 (110px 고정, "환자전환" 버튼)
- 행 높이: 66px
- 터치 드래그 스크롤: 화면 어디든 드래그로 상하 스크롤 가능
- 긴 텍스트: 셀 클릭 시 좌측으로 흐르는 애니메이션 (다시 클릭하면 정지)
- 폰트: 셀 내용 26px, 나이/혈액형 20px, 헤더 18px

### 3. 모니터링 화면 변경
- 우측 버튼: "센서 제어판" → "센서 ON/OFF"
- 헤더: 센서 연결 상태 색상 표시 (녹색=연결, 주황=대기)
- 환자 미선택 시 파형/숫자 비활성

### 4. 박기관 자동 선택 제거
- 앱 시작 시 "환자 정보: 선택된 환자 없음" 상태
- 선원관리에서 직접 선택해야 모니터링 시작

## 배포 방법 (중요!!!)

**main.py 수정 시 반드시 두 경로 모두 배포 + 기존 프로세스 kill 필수:**
```python
import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('YOUR_JETSON_HOST', username='jetson', password='YOUR_JETSON_PASSWORD')
ssh.exec_command('pkill -9 -f "python3 main.py"')
time.sleep(1)
sftp = ssh.open_sftp()
sftp.put('C:/Users/smhrd1/Desktop/ship-emergency-hardware/main.py', '/home/jetson/main.py')
sftp.put('C:/Users/smhrd1/Desktop/ship-emergency-hardware/main.py', '/home/jetson/mdts/main.py')
sftp.close()
ssh.exec_command('cd /home/jetson && DISPLAY=:0 python3 main.py &')
ssh.close()
```

**주의**: MobaXterm에서 사용자가 직접 실행하는 경로는 `/home/jetson/main.py`이고, 프로젝트 디렉토리는 `/home/jetson/mdts/main.py`임. 둘 다 동기화해야 함.

## 센서 데이터 흐름

```
RPi (YOUR_RPI_HOST:5000/vitals)
  ├─ MAX30100 (HR, SpO2)
  ├─ MLX90614 (체온)
  └─ ADS1115 (혈압, 호흡)
       │
       │ HTTP polling 1초 간격 (SensorDataFetcher)
       ▼
Jetson GUI (main.py)
  └─ MonitorScreen.up() → 바이탈 카드 + 파형 갱신
```

## main.py GUI 핵심 동작

- `SensorDataFetcher`: 1초마다 RPi의 `http://YOUR_RPI_HOST:5000/vitals` 폴링
- 센서 미연결 시 fallback 랜덤값 생성 (데모용)
- `MonitorScreen.set_patient(crew)` 호출 후부터 바이탈 표시 시작
- `CrewScreen` → 환자전환 버튼 → `on_patient_select(crew)` → 모니터링 화면 전환

## 센서 하드웨어

| 센서 | I2C 주소 | 기능 | 상태 |
|---|---|---|---|
| MAX30100 | 0x57 | 심박수 / 산소포화도 | 불안정 (stdev 감지 이슈) |
| MLX90614 | 0x5A | 비접촉 체온 | 정상 작동 |
| ADS1115 | 0x48 | 아날로그 혈압 센서 | 정상 작동 |

### MAX30100 센서 이슈
- IR 값이 손가락 유무와 관계없이 ~16500~17000 범위
- 손가락 올리면 IR ~29000~37000, 맥박 stdev 80 미만인 경우 많음
- 현재 FINGER_ON_THRESHOLD=80, FINGER_OFF_THRESHOLD=40
- 시도할 것: threshold 60으로 낮추기, stdev 윈도우 늘리기, LED 전류 높이기

## 실행 방법

### RPi 센서 서버
```bash
ssh pi@YOUR_RPI_HOST  # pw: YOUR_RPI_PASSWORD
pkill -f sensor_server_rpi
nohup python3 -u ~/sensor_server_rpi.py > ~/sensor.log 2>&1 &
```

### Jetson Nano GUI (MobaXterm)
```bash
ssh -X jetson@YOUR_JETSON_HOST  # pw: YOUR_JETSON_PASSWORD
python3 ~/main.py
```

## 남은 작업 / 미구현
- 선원 추가/수정/삭제 기능 (웹에는 있으나 PyQt5 GUI에는 미구현)
- 응급 환자 등록 시 확인 다이얼로그
- 센서 실제 연결 안정화 테스트

## 주의사항
- `/home/pi/2ndpjt/main5.py`가 실행 중이면 I2C 버스 충돌 → `pkill -9 -f main5.py` 필요
- I2C 버스 오류 시: `sudo rmmod i2c_bcm2835 && sudo modprobe i2c_bcm2835 && sudo modprobe i2c-dev`
- MobaXterm에서 실행 시 반드시 `/home/jetson/main.py` 경로 확인
