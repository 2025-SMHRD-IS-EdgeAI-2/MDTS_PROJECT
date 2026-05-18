import subprocess
import os

def run_script(name):
    print(f"\n--- Running {name} ---")
    try:
        # Use the same python interpreter
        result = subprocess.run(['python', name], capture_output=True, text=True, encoding='utf-8', errors='replace')
        print(result.stdout)
        if result.stderr:
            print("Errors/Warnings:")
            print(result.stderr)
    except Exception as e:
        print(f"Failed to run {name}: {e}")

if __name__ == "__main__":
    scripts = ['deploy_rpi.py', 'deploy_jetson_full.py']
    for s in scripts:
        if os.path.exists(s):
            run_script(s)
        else:
            print(f"Skipping {s} (not found)")
    print("\n✅ All deployments finished. Check MobaXterm for changes.")
