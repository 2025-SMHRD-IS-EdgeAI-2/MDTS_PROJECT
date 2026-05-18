#!/bin/bash
# ============================================
#  MDTS Jetson Nano 설치 스크립트
#  실행: bash jetson_setup.sh
# ============================================

echo "=== MDTS Jetson Nano Setup ==="

# 1. 시스템 패키지 업데이트
sudo apt-get update

# 2. PyQt5 설치
echo "[1/4] PyQt5 설치..."
sudo apt-get install -y python3-pyqt5

# 3. Pretendard 폰트 설치
echo "[2/4] Pretendard 폰트 설치..."
mkdir -p ~/.local/share/fonts
cd /tmp
if [ ! -f "PretendardVariable.ttf" ]; then
    wget -q https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip -O pretendard.zip
    unzip -o pretendard.zip -d pretendard_tmp
    find pretendard_tmp -name "*.ttf" -exec cp {} ~/.local/share/fonts/ \;
    rm -rf pretendard.zip pretendard_tmp
fi
fc-cache -fv

# 4. 작업 디렉토리 생성 + main.py 복사
echo "[3/5] MDTS 앱 배포..."
mkdir -p ~/mdts
cp ~/main.py ~/mdts/main.py 2>/dev/null || echo "main.py를 ~/mdts/에 수동으로 복사하세요"

# 5. VNC 설치 (MobaXterm 원격 확인용)
echo "[4/5] x11vnc 설치..."
sudo apt-get update
sudo apt-get install -y x11vnc

# 6. 자동 시작 등록 (선택)
echo "[5/5] 자동 시작 설정..."
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/mdts.desktop << 'DESKTOP'
[Desktop Entry]
Type=Application
Name=MDTS Monitor
Exec=bash -c "sleep 5 && python3 /home/$USER/mdts/main.py"
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
DESKTOP

echo ""
echo "=== 설치 완료 ==="
echo "실행: python3 ~/mdts/main.py"
echo "자동 시작: 재부팅 시 자동 실행됨"
echo ""
echo "※ RPi와 LAN 연결 시 자동으로 YOUR_RPI_HOST:5000 감지"
