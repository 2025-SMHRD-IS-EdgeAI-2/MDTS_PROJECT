import paramiko, io, os, sys

# -- Deployment Configuration --
JETSON_IP = 'YOUR_JETSON_HOST'
JETSON_ID = 'jetson'
JETSON_PW = 'YOUR_JETSON_PASSWORD'
REMOTE_ROOT = '/home/jetson'

FILES_TO_DEPLOY = ['main.py', 'logo.png']
DIRS_TO_DEPLOY = ['CPR']

def deploy():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f"Connecting to Jetson Nano ({JETSON_IP})...")
        c.connect(JETSON_IP, username=JETSON_ID, password=JETSON_PW, timeout=10)
        
        # 0. Kill existing process
        print("Stopping existing GUI process...")
        c.exec_command('pkill -9 -f main.py')
        
        sftp = c.open_sftp()
        
        # 1. Deploy to known paths only (NOT find, which overwrites library files)
        remote_paths = [f"{REMOTE_ROOT}/main.py", f"{REMOTE_ROOT}/mdts/main.py"]
        print(f"Deploy paths: {remote_paths}")

        # 2. Deploy main.py to all found paths
        local_main = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'main.py')
        for r_path in remote_paths:
            print(f"Transferring -> {r_path} ...", end="", flush=True)
            sftp.put(local_main, r_path)
            print(" Done")

        # 3. Deploy assets
        for fname in ['logo.png']:
            l_p = os.path.join(os.path.dirname(os.path.abspath(__file__)), fname)
            if os.path.exists(l_p):
                sftp.put(l_p, f"{REMOTE_ROOT}/{fname}")

        for dname in DIRS_TO_DEPLOY:
            l_d = os.path.join(os.path.dirname(os.path.abspath(__file__)), dname)
            r_d = f"{REMOTE_ROOT}/{dname}"
            try: sftp.mkdir(r_d)
            except: pass
            for f in os.listdir(l_d):
                sftp.put(os.path.join(l_d, f), f"{r_d}/{f}")

        sftp.close()
        
        # 4. Final Cleanup
        c.exec_command('rm -rf ~/__pycache__')
        print("\nDeployment and sync complete!")
        print("Please refresh MobaXterm and run the script again.")

    except Exception as e:
        print(f"\nError: {e}")
    finally:
        c.close()

if __name__ == "__main__":
    deploy()
