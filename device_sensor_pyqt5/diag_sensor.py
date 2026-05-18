import paramiko, sys, time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('YOUR_RPI_HOST', username='pi', password='YOUR_RPI_PASSWORD', timeout=8)

script = """import smbus2, time
bus = smbus2.SMBus(1)
try:
    bus.write_byte_data(0x57, 0x06, 0x40)
    time.sleep(0.1)
    bus.write_byte_data(0x57, 0x06, 0x03)
    bus.write_byte_data(0x57, 0x07, 0x17)
    bus.write_byte_data(0x57, 0x09, 0xFF)
    time.sleep(0.5)
    print("MAX30100 INIT OK")
    for i in range(10):
        raw = bus.read_i2c_block_data(0x57, 0x05, 4)
        ir = (raw[0] << 8) | raw[1]
        red = (raw[2] << 8) | raw[3]
        print(f"[{i:02d}] IR:{ir:5d}  RED:{red:5d}")
        time.sleep(0.2)
except Exception as e:
    print(f"ERROR: {e}")
bus.close()
"""

_, out, err = c.exec_command("python3 << 'PYEOF'\n" + script + "\nPYEOF")
o = out.read().decode('utf-8', errors='replace')
e = err.read().decode('utf-8', errors='replace')
sys.stdout.buffer.write((o + e).encode('utf-8'))
c.close()
