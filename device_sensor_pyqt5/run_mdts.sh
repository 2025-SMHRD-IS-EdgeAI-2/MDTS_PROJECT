#!/bin/bash
# MDTS 실행 스크립트 (Jetson Nano)
# 실행: bash run_mdts.sh

export DISPLAY=:0
export QT_QPA_PLATFORM=xcb

echo "[MDTS] Starting monitor..."
python3 ~/mdts/main.py
