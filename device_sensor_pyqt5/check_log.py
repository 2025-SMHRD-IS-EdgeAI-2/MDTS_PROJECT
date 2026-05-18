import paramiko, sys

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    c.connect('YOUR_RPI_HOST', username='pi', password='YOUR_RPI_PASSWORD', timeout=8)
    _, out, err = c.exec_command('tail -n 30 /home/pi/sensor.log')
    print(out.read().decode('utf-8', errors='replace'))
    print(err.read().decode('utf-8', errors='replace'))
except Exception as e:
    print(f"ERROR: {e}")
finally:
    c.close()
