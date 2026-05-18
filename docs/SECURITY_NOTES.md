# MDTS Security Notes

## TL;DR

이 저장소는 공개 공유용이다. 실제 운영 접속정보, 장비 IP, DB 비밀번호, SSH 비밀번호, 임시 터널 URL은 모두 placeholder로 치환해야 한다.

## 공개 저장소에 넣지 않는 정보

- DB host, DB user, DB password
- SSH 계정과 비밀번호
- Raspberry Pi / Jetson Nano 실제 내부 IP
- Vercel project ID, team ID, token
- Cloudflare quick tunnel 실제 URL
- 환자/선원 개인정보 원본
- 의료기록 원본 데이터
- ChromaDB/SQLite 실데이터 파일

## 이 저장소의 처리 기준

| 항목 | 처리 방식 |
| --- | --- |
| DB host | `YOUR_REMOTE_DB_HOST` |
| Raspberry Pi IP | `YOUR_RPI_HOST` |
| Jetson Nano IP | `YOUR_JETSON_HOST` |
| DB password | `YOUR_DB_PASSWORD` |
| SSH password | `YOUR_RPI_PASSWORD`, `YOUR_JETSON_PASSWORD` |
| 임시 터널 | `https://YOUR_TUNNEL.trycloudflare.com` |

## 운영 전 권장 조치

1. `.env.example`을 `.env`로 복사한다.
2. 실제 접속값은 로컬 `.env` 또는 GitHub Actions Secrets에만 저장한다.
3. DB 계정 권한을 최소화한다.
4. 배포 환경에서 API 인증을 추가한다.
5. 의료정보/개인정보 로그 저장 범위를 제한한다.
6. 공개 저장소 업로드 전 `rg -i "password|secret|token|YOUR_|192\\.168|trycloudflare"`로 재검사한다.
