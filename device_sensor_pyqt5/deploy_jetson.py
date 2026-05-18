import paramiko, io, os, sys, time

# 젯슨 나노 정보
JETSON_IP = 'YOUR_JETSON_HOST'
JETSON_ID = 'jetson'
JETSON_PW = 'YOUR_JETSON_PASSWORD'

local_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'main.py')
remote_path = '/home/jetson/main.py'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to Jetson Nano ({JETSON_IP})...")
    c.connect(JETSON_IP, username=JETSON_ID, password=JETSON_PW, timeout=8)
    
    sftp = c.open_sftp()
    print(f"Transferring main.py -> {remote_path}...")
    with open(local_path, 'rb') as f:
        data = f.read()
        sftp.putfo(io.BytesIO(data), remote_path)
    sftp.close()
    
    print("Transfer complete.")
    # 기존 GUI 프로세스 종료 (실행 중인 경우)
    c.exec_command('pkill -f main.py')
    print("Old GUI process terminated.")
    print("\n[IMPORTANT] Please restart the GUI on Jetson Nano using: python3 ~/main.py")

except Exception as e:
    print(f"ERROR: {e}")
finally:
    c.close()
