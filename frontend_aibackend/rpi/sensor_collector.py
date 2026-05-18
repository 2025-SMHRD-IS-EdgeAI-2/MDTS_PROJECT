"""
라즈베리파이 센서 데이터 수집 → 로컬 DB 저장
- DS18B20 온도센서 (1-Wire)
- MAX30102 심박/SpO2 센서 (I2C)

사용법:
  python3 sensor_collector.py

의존성:
  pip3 install mysql-connector-python max30102
  (1-Wire는 OS 수준에서 활성화 필요: sudo raspi-config → Interfacing → 1-Wire)
"""

import mysql.connector
import time
import glob
import os

# ─── 로컬 DB 설정 ───
LOCAL_DB = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'mdts',
    'charset': 'utf8mb4',
}

# 센서별 crew_id 매핑 (라즈베리파이 1대 = 선원 1명)
# 환경변수 또는 설정파일에서 읽어오도록 변경 가능
CREW_ID = int(os.environ.get('CREW_ID', '1'))

# 측정 간격 (초)
MEASURE_INTERVAL = 5


# ─── DS18B20 온도센서 (1-Wire) ───
def read_temperature():
    """DS18B20 1-Wire 온도센서에서 값을 읽음"""
    try:
        base_dir = '/sys/bus/w1/devices/'
        device_folders = glob.glob(base_dir + '28*')
        if not device_folders:
            return None

        device_file = device_folders[0] + '/w1_slave'
        with open(device_file, 'r') as f:
            lines = f.readlines()

        if lines[0].strip()[-3:] != 'YES':
            return None

        equals_pos = lines[1].find('t=')
        if equals_pos == -1:
            return None

        temp_string = lines[1][equals_pos + 2:]
        temp_c = float(temp_string) / 1000.0
        return round(temp_c, 2)
    except Exception as e:
        print(f"  [WARN] 온도센서 읽기 실패: {e}")
        return None


# ─── MAX30102 심박/SpO2 센서 ───
def read_max30102():
    """MAX30102에서 심박수와 SpO2 값을 읽음"""
    try:
        from max30102 import MAX30102
        sensor = MAX30102()
        red, ir = sensor.read_sequential()

        # 간이 SpO2 계산
        if red and ir:
            red_avg = sum(red) / len(red)
            ir_avg = sum(ir) / len(ir)
            ratio = red_avg / ir_avg if ir_avg > 0 else 0
            spo2 = max(0, min(100, int(110 - 25 * ratio)))
        else:
            spo2 = 0

        # 간이 심박수 계산 (피크 검출)
        heart_rate = 0
        if ir and len(ir) > 10:
            threshold = sum(ir) / len(ir)
            peaks = 0
            above = False
            for val in ir:
                if val > threshold and not above:
                    peaks += 1
                    above = True
                elif val <= threshold:
                    above = False
            # 측정 시간(약 1초) 기반 bpm 추정
            heart_rate = peaks * 60

        return heart_rate, spo2
    except ImportError:
        print("  [WARN] max30102 라이브러리 없음 — pip3 install max30102")
        return 0, 0
    except Exception as e:
        print(f"  [WARN] MAX30102 읽기 실패: {e}")
        return 0, 0


def save_to_db(crew_id, heart_rate, spo2, temperature):
    """측정 데이터를 로컬 DB에 저장"""
    conn = mysql.connector.connect(**LOCAL_DB)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO tb_vital (crew_id, heart_rate, spo2, respiration_rate, blood_pressure, temperature, synced)
        VALUES (%s, %s, %s, 0, '0', %s, 0)
    """, (crew_id, heart_rate, spo2, temperature or 0))
    conn.commit()
    cur.close()
    conn.close()


def main():
    print("=" * 50)
    print(f"  MDTS 센서 데이터 수집기")
    print(f"  대상 선원 crew_id: {CREW_ID}")
    print(f"  측정 간격: {MEASURE_INTERVAL}초")
    print("=" * 50)

    while True:
        temperature = read_temperature()
        heart_rate, spo2 = read_max30102()

        print(f"[측정] 온도={temperature}°C, 심박={heart_rate}bpm, SpO2={spo2}%")

        try:
            save_to_db(CREW_ID, heart_rate, spo2, temperature)
        except mysql.connector.Error as e:
            print(f"[ERROR] DB 저장 실패: {e}")

        time.sleep(MEASURE_INTERVAL)


if __name__ == '__main__':
    main()
