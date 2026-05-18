import paramiko, io, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

path = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'ship-emergency-hardware', 'main.py')
with open(path, 'rb') as f:
    data = f.read()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('YOUR_RPI_HOST', username='pi', password='YOUR_RPI_PASSWORD', timeout=8)

sftp = c.open_sftp()
sftp.putfo(io.BytesIO(data), '/home/pi/main.py')
sftp.close()

_, out, err = c.exec_command('ls -lh ~/main.py && python3 -m py_compile ~/main.py && echo SYNTAX_OK')
o = out.read().decode('utf-8', errors='replace')
e = err.read().decode('utf-8', errors='replace')
sys.stdout.buffer.write(('OUT: ' + o + '\n').encode('utf-8'))
if e:
    sys.stdout.buffer.write(('ERR: ' + e + '\n').encode('utf-8'))
c.close()
sys.stdout.buffer.write(b'Transfer complete!\n')
