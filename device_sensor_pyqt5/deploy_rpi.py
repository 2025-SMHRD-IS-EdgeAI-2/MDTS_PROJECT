import paramiko, io, os, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

# 파일 목록 및 경로 설정
files_to_transfer = [
    'sensor_server_rpi.py',
    'diag_sensor.py'
]

remote_base_path = '/home/pi/'
local_base_path = os.path.dirname(os.path.abspath(__file__))

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to RPi (YOUR_RPI_HOST)...")
    c.connect('YOUR_RPI_HOST', username='pi', password='YOUR_RPI_PASSWORD', timeout=8)
    sftp = c.open_sftp()

    for filename in files_to_transfer:
        local_path = os.path.join(local_base_path, filename)
        remote_path = remote_base_path + filename
        print(f"Transferring {filename} -> {remote_path}...")
        with open(local_path, 'rb') as f:
            data = f.read()
            sftp.putfo(io.BytesIO(data), remote_path)
    
    sftp.close()
    print("Transfer complete.")

    print("Restarting sensor server...")
    # 기존 프로세스 종료
    c.exec_command('pkill -9 -f sensor_server_rpi')
    time.sleep(2)
    # 백그라운드 실행
    cmd = 'nohup python3 -u /home/pi/sensor_server_rpi.py > /home/pi/sensor.log 2>&1 &'
    c.exec_command(cmd)
    print("Sensor server started in background.")

    # 로그 출력 확인 (잠시 대기)
    time.sleep(2)
    _, out, _ = c.exec_command('tail -n 10 /home/pi/sensor.log')
    print("\n--- Recent Logs ---")
    print(out.read().decode('utf-8', errors='replace'))

except Exception as e:
    print(f"ERROR: {e}")
finally:
    c.close()
