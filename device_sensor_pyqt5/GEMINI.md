# MDTS Project Rules

- **Auto-Deployment :** After any change to `main.py` or `sensor_server_rpi.py`, ALWAYS run `python deploy_all.py` to ensure the hardware (RPi and Jetson Nano) is in sync.
- **Hardware Credentials (CONFIDENTIAL - DO NOT ASK) :**
  - RPi : YOUR_RPI_HOST (pi / YOUR_RPI_PASSWORD)
  - Jetson Nano : YOUR_JETSON_HOST (jetson / YOUR_JETSON_PASSWORD)
- **Path Consistency :** `deploy_jetson_full.py` updates multiple paths to avoid confusion in MobaXterm.
