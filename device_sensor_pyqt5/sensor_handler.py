import time

try:
    import smbus2
    HAS_SMBUS = True
except ImportError:
    HAS_SMBUS = False

class SensorManager:
    """
    MDTS 센서 관리 클래스:
    - 실제 센서 데이터만 취급 (시뮬레이션 기능 제거)
    """
    def __init__(self, bus_id=1):
        self.bus_id = bus_id
        self.bus = None
        self.ADDR_MAX30102 = 0x57
        self.ADDR_MLX90614 = 0x5A
        
        if HAS_SMBUS:
            try:
                self.bus = smbus2.SMBus(self.bus_id)
            except Exception as e:
                print(f"[Sensor] I2C Init Error: {e}")

    def read_temperature(self):
        if not self.bus: return 0.0
        try:
            data = self.bus.read_i2c_block_data(self.ADDR_MLX90614, 0x07, 2)
            temp_raw = (data[1] << 8) | data[0]
            temp_c = (temp_raw * 0.02) - 273.15
            return round(temp_c, 1) if 30 < temp_c < 45 else 0.0
        except:
            return 0.0

    def read_vitals(self):
        # 실제 센서 라이브러리 연동 필요 (현재는 서버에서 처리중)
        return {"HR": 0, "SpO2": 0, "RR": 0}

    def get_all_data(self):
        vitals = self.read_vitals()
        vitals["TEMP"] = self.read_temperature()
        return vitals
