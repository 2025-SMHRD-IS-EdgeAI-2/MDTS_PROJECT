# MDTS 원클릭 복구

## 목적

재부팅, Wi-Fi 변경, Cloudflare quick tunnel 만료, Jetson/Pi 서비스 종료 후 MDTS 전체 연동을 한 번에 복구한다.

## 실행 파일

더블클릭:

```bat
D:\mdts-separated-workspace\MDTS_ONECLICK_RECOVERY.bat
```

또는 프로젝트 폴더에서 직접 실행:

```bat
D:\mdts-separated-workspace\04_frontend_aibackend\MDTS_ONECLICK_RECOVERY.bat
```

## 복구되는 항목

- Raspberry Pi `mdts-sensor.service` 재시작
- Raspberry Pi MariaDB `3306` 확인
- Jetson Nano Ollama 서비스 시작
- Jetson Nano PyQt5 `/home/jetson/mdts/start_pyqt5.sh` 실행
- Windows Node API `4000` 재시작
- Windows FastAPI AI 백엔드 `8000` 재시작
- Windows Vite 개발 서버 `5173` 확인
- Windows `127.0.0.1:11434` -> Jetson Ollama SSH 터널 재시작
- Cloudflare HTTPS quick tunnel 2개 재생성
- Vercel production 재배포
- Vercel 빌드 시 새 터널 주소를 `--build-env`로 직접 주입

## 현재 기준 장비 정보

```text
Raspberry Pi: YOUR_RPI_HOST
Jetson Nano: YOUR_JETSON_HOST
```

## 생성되는 런타임 상태 파일

실행이 끝나면 현재 터널 URL이 아래 파일에 저장된다.

```text
D:\mdts-separated-workspace\MDTS_RUNTIME_STATUS.json
```

## Vercel 재배포 없이 로컬/터널만 복구

배포까지 하지 않고 장비와 로컬 서비스만 복구하려면:

```bat
cd /d D:\mdts-separated-workspace\04_frontend_aibackend
python tools\mdts_oneclick_recover.py --skip-vercel
```

## 장비 재시작 없이 Windows/Vercel만 복구

Pi/Jetson은 이미 정상이고 Cloudflare/Vercel만 복구하려면:

```bat
cd /d D:\mdts-separated-workspace\04_frontend_aibackend
python tools\mdts_oneclick_recover.py --skip-remote
```

## 주의

Cloudflare quick tunnel은 고정 주소가 아니다. 재부팅이나 네트워크 변경 후 URL이 바뀌면 Vercel 빌드에 새 URL이 반영되어야 한다.

이 스크립트는 Vercel 저장 환경변수를 삭제/추가하지 않고, 새 터널 주소를 `vercel --build-env`로 이번 배포에 직접 주입한다.
