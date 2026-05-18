#!/usr/bin/env python3
"""
MDTS Sensor Server - Raspberry Pi
DFRobot MAX30102 (HR/SpO2), MLX90614 (Temp), ADS1115 (BP)
"""
import sys, os, time, threading, math, logging, csv, json
from datetime import datetime
from flask import Flask, jsonify, request, Response
import urllib.error
import urllib.request
import smbus2
import pymysql

# DFRobot 라이브러리 경로 추가
sys.path.append('/home/pi/mdts')
from DFRobot_BloodOxygen_S import DFRobot_BloodOxygen_S_i2c

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger("MDTS")

app = Flask(__name__)
bus = smbus2.SMBus(1)

ADDR_MAX30102 = 0x57
ADDR_MLX90614 = 0x5A
ADDR_ADS1115  = 0x48

latest = {"HR": 0, "SpO2": 0, "TEMP": 0.0, "SBP": 0, "DBP": 0, "RESP": 0}
manual = {}  # 수기 입력값 (BP, TEMP 등) — 양쪽에서 입력 가능
active_crew_id = 0  # 현재 선택된 환자 crew_id. 0이면 환자 미선택 상태
recording_enabled = False  # PyQt5 센서 ON/OFF 상태에 따른 DB 저장 게이트
sensor_state = {"vital": False, "temp": False}  # PyQt5 개별 센서 START/STOP 상태
last_valid_input_ts = 0.0  # 마지막 유효 센서/수기 입력 시각
RECORDING_IDLE_TIMEOUT_SEC = 20
JETSON_CONTROL_BASES = [
    os.environ.get("JETSON_CONTROL_BASE", "http://YOUR_JETSON_HOST:5055").rstrip("/"),
    "http://YOUR_JETSON_HOST:5055",
]
JETSON_CONTROL_BASES = list(dict.fromkeys([base for base in JETSON_CONTROL_BASES if base]))
JETSON_CONTROL_BASE = JETSON_CONTROL_BASES[0] if JETSON_CONTROL_BASES else ""
FOCUSED_CREW_STATE_PATH = "/home/pi/mdts_focused_crew_state.json"
focused_crew_ids = set()
focused_crew_updated_at = ""
focused_crew_source = ""
lock   = threading.Lock()

# == MySQL DB 저장 + USB 백업 ==========================================
DB_CFG = {"host": "localhost", "user": "mdts", "password": "YOUR_DB_PASSWORD", "database": "MDTS", "charset": "utf8mb4"}
REMOTE_DB_CFG = {"host": "YOUR_REMOTE_DB_HOST", "port": 3307, "user": "MDTS", "password": "YOUR_DB_PASSWORD", "database": "MDTS", "charset": "utf8mb4"}
USB_PATH = "/media/pi/5391-20791/mdts_backup"

def load_focused_crew_state():
    """웹/PyQt5 공통 집중 관리 선원 상태를 로컬 JSON에서 읽는다."""
    global focused_crew_ids, focused_crew_updated_at, focused_crew_source
    try:
        if not os.path.isfile(FOCUSED_CREW_STATE_PATH):
            return
        with open(FOCUSED_CREW_STATE_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
        ids = payload.get("focused_crew_ids", [])
        focused_crew_ids = {int(x) for x in ids if int(x) > 0}
        focused_crew_updated_at = str(payload.get("updated_at") or "")
        focused_crew_source = str(payload.get("source") or "")
    except Exception as e:
        log.error("[CREW-FOCUS] load failed: %s", e)

def save_focused_crew_state(source="unknown"):
    """집중 관리 선원 상태를 Raspberry Pi에 보존한다."""
    global focused_crew_updated_at, focused_crew_source
    focused_crew_updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    focused_crew_source = str(source or "unknown")
    payload = {
        "focused_crew_ids": sorted(focused_crew_ids),
        "updated_at": focused_crew_updated_at,
        "source": focused_crew_source,
    }
    tmp_path = f"{FOCUSED_CREW_STATE_PATH}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, FOCUSED_CREW_STATE_PATH)

load_focused_crew_state()

def db_save(data, is_manual=0):
    """로컬 MySQL에 저장"""
    try:
        conn = pymysql.connect(**DB_CFG)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO vital_logs (hr, spo2, temp, sbp, dbp, resp, is_manual) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (data["HR"], data["SpO2"], data["TEMP"], data["SBP"], data["DBP"], data["RESP"], is_manual)
        )
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        log.error("[DB-local] %s", e)

def remote_db_save(data, crew_id=0):
    """원격 MySQL 서버 tb_vital에 저장 (네트워크 가능 시)"""
    try:
        target_crew_id = int(crew_id or 0)
        if target_crew_id <= 0:
            log.info("[DB-remote] skip: active crew is not selected")
            return
        conn = pymysql.connect(**REMOTE_DB_CFG, connect_timeout=3)
        cur = conn.cursor()
        bp = f"{data['SBP']}/{data['DBP']}" if data["SBP"] else "0"
        cur.execute(
            "INSERT INTO tb_vital (crew_id, heart_rate, spo2, respiration_rate, blood_pressure, temperature) VALUES (%s,%s,%s,%s,%s,%s)",
            (target_crew_id, data["HR"], data["SpO2"], data["RESP"], bp, data["TEMP"])
        )
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        log.error("[DB-remote] %s", e)

def usb_save(data, is_manual=0):
    """USB 메모리에 CSV 백업 저장 (일자별 파일)"""
    try:
        if not os.path.isdir(USB_PATH):
            return
        today = datetime.now().strftime("%Y-%m-%d")
        csv_path = os.path.join(USB_PATH, f"vitals_{today}.csv")
        file_exists = os.path.isfile(csv_path)
        with open(csv_path, "a", newline="") as f:
            w = csv.writer(f)
            if not file_exists:
                w.writerow(["timestamp", "hr", "spo2", "temp", "sbp", "dbp", "resp", "is_manual"])
            w.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        data["HR"], data["SpO2"], data["TEMP"], data["SBP"], data["DBP"], data["RESP"], is_manual])
    except Exception as e:
        log.error("[USB] %s", e)

def jetson_control_request(path, method="GET", payload=None, expect_json=True, timeout=3):
    """Pi에서 Jetson PyQt5 제어 API로 요청을 프록시한다."""
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    last_error = None
    for base in JETSON_CONTROL_BASES:
        url = f"{base}{path}"
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                content_type = resp.headers.get("Content-Type", "")
                if expect_json:
                    return json.loads(data.decode("utf-8")) if data else {}
                return data, content_type
        except urllib.error.HTTPError as e:
            last_error = e
            if 500 <= e.code < 600:
                log.warning("[JETSON] %s failed via %s: HTTP %s", path, base, e.code)
                continue
            raise
        except urllib.error.URLError as e:
            last_error = e
            log.warning("[JETSON] %s unavailable via %s: %s", path, base, e)
            continue

    if last_error is not None:
        raise last_error
    raise urllib.error.URLError("no_jetson_control_base_configured")

def has_meaningful_input(data, manual_data):
    """DB 저장 대상이 되는 실제 입력 여부를 판단한다.

    PyQt5에서 센서를 꺼둔 상태의 이전 manual 값만으로 무한 저장되는 것을 막기 위해
    recording gate와 idle timeout을 함께 사용한다.
    """
    return any([
        data.get("HR", 0) > 0,
        data.get("SpO2", 0) > 0,
        data.get("RESP", 0) > 0,
        data.get("TEMP", 0.0) >= 35.0,
        bool(manual_data),
    ])

def mark_valid_input_if_needed(data, manual_data):
    global last_valid_input_ts
    if has_meaningful_input(data, manual_data):
        last_valid_input_ts = time.time()

def is_recording_allowed(data, manual_data):
    if not recording_enabled:
        return False
    if not has_meaningful_input(data, manual_data):
        return False
    if time.time() - last_valid_input_ts > RECORDING_IDLE_TIMEOUT_SEC:
        return False
    return True

def db_loop():
    """5초마다 현재 바이탈을 MySQL + USB에 저장한다.

    저장 조건:
    1. PyQt5가 /recording enabled=true를 보낸 상태
    2. 유효 센서값 또는 새 수기 입력이 존재
    3. 마지막 유효 입력 후 idle timeout 이내
    """
    while True:
        time.sleep(5)
        with lock:
            d = dict(latest)
            m = dict(manual)
            enabled = recording_enabled
            crew_id = active_crew_id
        if "SBP" in m: d["SBP"] = m["SBP"]
        if "DBP" in m: d["DBP"] = m["DBP"]
        if "TEMP" in m: d["TEMP"] = m["TEMP"]
        is_manual = 1 if m else 0
        if enabled and is_recording_allowed(d, m):
            db_save(d, is_manual)
            usb_save(d, is_manual)
            remote_db_save(d, crew_id)

# == MLX90614 ==========================================================
def read_temperature():
    try:
        data = bus.read_i2c_block_data(ADDR_MLX90614, 0x07, 3)
        raw  = (data[1] << 8) | data[0]
        temp = round(raw * 0.02 - 273.15, 1)
        return temp if 32.0 < temp < 45.0 else 0.0
    except: return 0.0

# == ADS1115 ===========================================================
def ads1115_read(channel=0):
    try:
        mux = [0x4000, 0x5000, 0x6000, 0x7000][channel]
        config = 0x8000 | mux | 0x0200 | 0x0100 | 0x0080 | 0x0003
        bus.write_i2c_block_data(ADDR_ADS1115, 0x01, [(config >> 8) & 0xFF, config & 0xFF])
        time.sleep(0.01)
        d = bus.read_i2c_block_data(ADDR_ADS1115, 0x00, 2)
        raw = (d[0] << 8) | d[1]
        if raw > 32767: raw -= 65536
        return raw * 4.096 / 32767
    except: return 0.0

def read_bp():
    v = ads1115_read(0)
    if v < 0.8: return 0, 0
    pressure = max(0, (v - 0.5) / 4.0 * 300)
    sbp = int(min(180, max(80, pressure * 0.42 + 100)))
    dbp = int(min(120, max(50, sbp * 0.65)))
    return sbp, dbp

def read_respiration():
    try:
        v = ads1115_read(1)
        if v < 0.2: return 0
        resp_rate = int(12 + (v * 5)) 
        return max(10, min(30, resp_rate))
    except: return 0

# == DFRobot MAX30102 (HR/SpO2) ========================================
resp_history = []

def calc_respiration(hr):
    """HR 기반 호흡수 추정 (hr_sensor.py 방식)"""
    if hr <= 0 or hr < 40 or hr > 180:
        return 0
    resp = int(hr / 5.2)
    return max(10, min(24, resp))

# == 백그라운드 센서 루프 ==============================================
def sensor_loop():
    global resp_history
    # DFRobot 센서 초기화
    hr_sensor = DFRobot_BloodOxygen_S_i2c(1, 0x57)
    log.info("[DFRobot] Initializing MAX30102...")
    while not hr_sensor.begin():
        log.warning("[DFRobot] Sensor not found, retrying...")
        time.sleep(1)
    hr_sensor.sensor_start_collect()
    time.sleep(2)
    log.info("[DFRobot] MAX30102 ready")

    hr_valid_count = 0
    spo2_valid_count = 0
    last_hr = 0
    last_spo2 = 0
    STABLE_COUNT = 3
    tick = 0

    while True:
        try:
            # DFRobot 센서에서 HR/SpO2 읽기
            hr_sensor.get_heartbeat_SPO2()
            hr_raw = hr_sensor.heartbeat
            spo2_raw = hr_sensor.SPO2

            # IR 값 (디버깅용)
            ir, red = hr_sensor.read_raw_ir()

            # 손가락 미감지: DFRobot 라이브러리가 hr=-1, spo2=-1 반환
            # 또는 IR < 5000 (hr_sensor.py 방식)
            no_finger = (ir < 5000 or hr_raw == -1 or spo2_raw == -1 or hr_raw < 40 or hr_raw > 180)

            if no_finger:
                hr_valid_count = 0
                spo2_valid_count = 0
                resp_history.clear()
                last_hr = 0
                last_spo2 = 0
                hr, spo2, resp = 0, 0, 0
            else:
                # 유효값 카운트
                if hr_raw != -1:
                    hr_valid_count += 1
                    last_hr = hr_raw
                if spo2_raw != -1:
                    spo2_valid_count += 1
                    last_spo2 = spo2_raw

                # 안정적 측정 후에만 값 노출
                if hr_valid_count >= STABLE_COUNT and spo2_valid_count >= STABLE_COUNT:
                    hr = last_hr
                    spo2 = last_spo2
                else:
                    hr, spo2 = 0, 0

                # 호흡수 추정
                resp_raw = calc_respiration(last_hr)
                if 8 <= resp_raw <= 30:
                    resp_history.append(resp_raw)
                if len(resp_history) > 5:
                    resp_history.pop(0)
                resp = int(sum(resp_history) / len(resp_history)) if resp_history else 0

            with lock:
                state = dict(sensor_state)

            if not state.get("vital", False):
                hr, spo2, resp = 0, 0, 0

            # 체온은 PyQt5 체온 START 상태에서만 측정
            temp = read_temperature() if state.get("temp", False) else 0.0

            # 혈압 (ADS1115) - 항상 독립 측정
            sbp, dbp = read_bp()

            with lock:
                latest.update({"HR": hr, "SpO2": spo2, "TEMP": temp, "SBP": sbp, "DBP": dbp, "RESP": resp})
                mark_valid_input_if_needed(latest, {})

            if tick % 50 == 0:
                log.info("STAT >> IR:%d hr_raw:%d spo2_raw:%d | OUT HR:%d SpO2:%d Temp:%.1f SBP:%d RESP:%d",
                         ir, hr_raw, spo2_raw, hr, spo2, temp, sbp, resp)

        except Exception as e:
            log.error("[Loop] %s", e)

        tick += 1
        time.sleep(0.1)

@app.route("/vitals")
def get_vitals():
    with lock:
        result = dict(latest)
        state = dict(sensor_state)
        # 수기 입력값이 있으면 센서값 대신 사용
        if "SBP" in manual:
            result["SBP"] = manual["SBP"]
        if "DBP" in manual:
            result["DBP"] = manual["DBP"]
        if not state.get("temp", False):
            result["TEMP"] = 0.0
        elif "TEMP" in manual:
            result["TEMP"] = manual["TEMP"]
        result["manual"] = dict(manual)  # 수기 입력 상태도 함께 전송
        result["crew_id"] = active_crew_id
        result["recording_enabled"] = recording_enabled
        result["sensor_state"] = state
        return jsonify(result)

@app.route("/manual", methods=["POST"])
def set_manual():
    """수기 입력 (BP, TEMP) — PyQt5/웹 양쪽에서 호출 가능"""
    data = request.get_json(force=True)
    with lock:
        if "bp" in data:
            # "120/80" 형식
            parts = str(data["bp"]).split("/")
            if len(parts) == 2:
                try:
                    manual["SBP"] = int(parts[0])
                    manual["DBP"] = int(parts[1])
                except: pass
            else:
                try: manual["SBP"] = int(parts[0]); manual["DBP"] = 0
                except: pass
        if "temp" in data:
            if sensor_state.get("temp", False):
                try: manual["TEMP"] = float(data["temp"])
                except: pass
            else:
                manual.pop("TEMP", None)
        mark_valid_input_if_needed(latest, manual)
    log.info("[MANUAL] Updated: %s", manual)
    return jsonify({"ok": True, "manual": manual})

@app.route("/manual", methods=["GET"])
def get_manual():
    """현재 수기 입력 상태 조회"""
    with lock: return jsonify(manual)

@app.route("/manual/clear", methods=["POST"])
def clear_manual():
    """수기 입력 초기화 (센서값으로 복귀)"""
    with lock: manual.clear()
    return jsonify({"ok": True})

@app.route("/recording", methods=["POST"])
def set_recording():
    """PyQt5 센서 ON/OFF 상태에 따라 DB 저장을 제어한다."""
    global recording_enabled, last_valid_input_ts
    data = request.get_json(force=True) or {}
    enabled = bool(data.get("enabled", False))
    with lock:
        if "vital_enabled" in data or "temp_enabled" in data:
            sensor_state["vital"] = bool(data.get("vital_enabled", False))
            sensor_state["temp"] = bool(data.get("temp_enabled", False))
        else:
            sensor_state["vital"] = enabled
            sensor_state["temp"] = enabled

        recording_enabled = bool(enabled and (sensor_state["vital"] or sensor_state["temp"]))

        if not sensor_state["temp"]:
            latest["TEMP"] = 0.0
            manual.pop("TEMP", None)

        if recording_enabled:
            last_valid_input_ts = time.time()
        else:
            manual.clear()
            last_valid_input_ts = 0.0
    log.info("[RECORDING] enabled=%s sensor_state=%s", recording_enabled, sensor_state)
    return jsonify({"ok": True, "recording_enabled": recording_enabled, "sensor_state": dict(sensor_state)})

@app.route("/recording", methods=["GET"])
def get_recording():
    with lock:
        idle_sec = time.time() - last_valid_input_ts if last_valid_input_ts else None
        return jsonify({
            "recording_enabled": recording_enabled,
            "crew_id": active_crew_id,
            "idle_timeout_sec": RECORDING_IDLE_TIMEOUT_SEC,
            "idle_sec": idle_sec,
            "manual": dict(manual),
            "sensor_state": dict(sensor_state),
        })

@app.route("/crew", methods=["GET", "POST"])
def crew_state():
    """현재 모니터링 중인 환자 crew_id 설정"""
    global active_crew_id
    if request.method == "GET":
        with lock:
            return jsonify({"ok": True, "crew_id": active_crew_id})

    data = request.get_json(force=True) or {}
    cid = int(data.get("crew_id", 0) or 0)
    with lock:
        active_crew_id = cid if cid > 0 else 0
    log.info("[CREW] Active crew_id set to %d", active_crew_id)
    return jsonify({"ok": True, "crew_id": active_crew_id})

@app.route("/crew/focus", methods=["GET", "POST"])
def crew_focus_state():
    """웹 대시보드와 PyQt5가 공유하는 집중 관리 선원 목록."""
    if request.method == "GET":
        with lock:
            return jsonify({
                "ok": True,
                "focused_crew_ids": sorted(focused_crew_ids),
                "updated_at": focused_crew_updated_at,
                "source": focused_crew_source,
            })

    data = request.get_json(force=True) or {}
    source = data.get("source") or "unknown"
    try:
        with lock:
            if "crew_ids" in data:
                next_ids = set()
                for raw_id in data.get("crew_ids") or []:
                    cid = int(raw_id or 0)
                    if cid > 0:
                        next_ids.add(cid)
                focused_crew_ids.clear()
                focused_crew_ids.update(next_ids)
            else:
                cid = int(data.get("crew_id", 0) or 0)
                if cid <= 0:
                    return jsonify({"ok": False, "reason": "invalid_crew_id"}), 400
                focused = bool(data.get("focused", data.get("isEmergency", True)))
                if focused:
                    focused_crew_ids.add(cid)
                else:
                    focused_crew_ids.discard(cid)
            save_focused_crew_state(source)
            response = {
                "ok": True,
                "focused_crew_ids": sorted(focused_crew_ids),
                "updated_at": focused_crew_updated_at,
                "source": focused_crew_source,
            }
        log.info("[CREW-FOCUS] source=%s ids=%s", source, response["focused_crew_ids"])
        return jsonify(response)
    except Exception as e:
        log.error("[CREW-FOCUS] update failed: %s", e)
        return jsonify({"ok": False, "reason": "crew_focus_update_failed", "detail": str(e)}), 500

@app.route("/trauma/start", methods=["POST"])
def start_jetson_trauma():
    """웹 대시보드 요청을 Jetson Nano PyQt5 외상 촬영 화면으로 전달한다."""
    try:
        result = jetson_control_request("/trauma/start", method="POST", payload={})
        return jsonify(result)
    except urllib.error.URLError as e:
        log.error("[TRAUMA] Jetson PyQt5 control unavailable: %s", e)
        return jsonify({"ok": False, "reason": "jetson_pyqt5_unavailable", "detail": str(e)}), 503
    except Exception as e:
        log.error("[TRAUMA] start failed: %s", e)
        return jsonify({"ok": False, "reason": "trauma_start_failed", "detail": str(e)}), 500

@app.route("/trauma/capture", methods=["POST"])
def capture_jetson_trauma():
    """Jetson Nano PyQt5 외상 촬영 화면의 촬영/분석을 원격 시작한다."""
    try:
        result = jetson_control_request("/trauma/capture", method="POST", payload={})
        return jsonify(result)
    except urllib.error.URLError as e:
        log.error("[TRAUMA] Jetson PyQt5 capture unavailable: %s", e)
        return jsonify({"ok": False, "reason": "jetson_pyqt5_unavailable", "detail": str(e)}), 503
    except Exception as e:
        log.error("[TRAUMA] capture failed: %s", e)
        return jsonify({"ok": False, "reason": "trauma_capture_failed", "detail": str(e)}), 500

@app.route("/trauma/reset", methods=["POST"])
def reset_jetson_trauma():
    """웹/PyQt5 외상 촬영을 재촬영 대기 상태로 동시에 되돌린다."""
    try:
        result = jetson_control_request("/trauma/reset", method="POST", payload={}, expect_json=True, timeout=3)
        return jsonify(result)
    except urllib.error.URLError as e:
        log.error("[TRAUMA] reset unavailable: %s", e)
        return jsonify({"ok": False, "reason": "jetson_reset_unavailable", "detail": str(e)}), 503
    except Exception as e:
        log.error("[TRAUMA] reset failed: %s", e)
        return jsonify({"ok": False, "reason": "trauma_reset_failed", "detail": str(e)}), 500

@app.route("/trauma/frame.jpg")
def get_jetson_trauma_frame():
    """Jetson Nano PyQt5 카메라 프레임을 웹 대시보드로 전달한다."""
    last_error = None
    for attempt in range(1, 13):
        try:
            body, content_type = jetson_control_request("/trauma/frame.jpg", method="GET", expect_json=False, timeout=2)
            return Response(body, mimetype=content_type or "image/jpeg", headers={"Cache-Control": "no-store"})
        except urllib.error.HTTPError as e:
            last_error = e
            if e.code == 503 and attempt < 12:
                time.sleep(0.2)
                continue
            log.error("[TRAUMA] frame unavailable: %s", e)
            return jsonify({"ok": False, "reason": "jetson_frame_unavailable", "detail": str(e)}), 503
        except urllib.error.URLError as e:
            last_error = e
            if attempt < 12:
                time.sleep(0.2)
                continue
            log.error("[TRAUMA] frame unavailable: %s", e)
            return jsonify({"ok": False, "reason": "jetson_frame_unavailable", "detail": str(e)}), 503
        except Exception as e:
            last_error = e
            if attempt < 12:
                time.sleep(0.2)
                continue
            log.error("[TRAUMA] frame failed: %s", e)
            return jsonify({"ok": False, "reason": "trauma_frame_failed", "detail": str(e)}), 500

    log.error("[TRAUMA] frame failed after retry: %s", last_error)
    return jsonify({"ok": False, "reason": "trauma_frame_retry_exhausted", "detail": str(last_error)}), 503

@app.route("/trauma/stream.mjpg")
def stream_jetson_trauma_frame():
    """웹 대시보드용 MJPEG 스트림. frame.jpg 반복 요청보다 브라우저 정지 현상이 적다."""
    def generate():
        while True:
            try:
                body, _ = jetson_control_request("/trauma/frame.jpg", method="GET", expect_json=False, timeout=2)
                yield b"--frame\r\n"
                yield b"Content-Type: image/jpeg\r\n"
                yield f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
                yield body
                yield b"\r\n"
                time.sleep(0.25)
            except GeneratorExit:
                return
            except Exception as e:
                log.warning("[TRAUMA] stream frame skipped: %s", e)
                time.sleep(0.2)

    return Response(
        generate(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"},
    )

@app.route("/trauma/result")
def get_jetson_trauma_result():
    """Jetson Nano PyQt5 외상 분석 결과를 웹 대시보드로 전달한다."""
    try:
        result = jetson_control_request("/trauma/result", method="GET", expect_json=True, timeout=3)
        return jsonify(result)
    except urllib.error.URLError as e:
        log.error("[TRAUMA] result unavailable: %s", e)
        return jsonify({"ok": False, "reason": "jetson_result_unavailable", "detail": str(e)}), 503
    except Exception as e:
        log.error("[TRAUMA] result failed: %s", e)
        return jsonify({"ok": False, "reason": "trauma_result_failed", "detail": str(e)}), 500

@app.route("/trauma/stop", methods=["POST"])
def stop_jetson_trauma():
    """웹 대시보드 종료 요청 시 Jetson Nano PyQt5 외상 촬영 송출을 중단한다."""
    try:
        result = jetson_control_request("/trauma/stop", method="POST", payload={}, expect_json=True, timeout=3)
        return jsonify(result)
    except urllib.error.URLError as e:
        log.error("[TRAUMA] stop unavailable: %s", e)
        return jsonify({"ok": False, "reason": "jetson_stop_unavailable", "detail": str(e)}), 503
    except Exception as e:
        log.error("[TRAUMA] stop failed: %s", e)
        return jsonify({"ok": False, "reason": "trauma_stop_failed", "detail": str(e)}), 500

@app.route("/trauma/guide", methods=["POST"])
def open_jetson_trauma_guide():
    """웹 대시보드 AI 분석 시작 시 Jetson Nano PyQt5를 외상 응급처치 가이드 화면으로 전환한다."""
    try:
        payload = request.get_json(force=True) or {}
        result = jetson_control_request("/trauma/guide", method="POST", payload=payload, expect_json=True, timeout=3)
        return jsonify(result)
    except urllib.error.URLError as e:
        log.error("[TRAUMA] guide unavailable: %s", e)
        return jsonify({"ok": False, "reason": "jetson_guide_unavailable", "detail": str(e)}), 503
    except Exception as e:
        log.error("[TRAUMA] guide failed: %s", e)
        return jsonify({"ok": False, "reason": "trauma_guide_failed", "detail": str(e)}), 500

@app.route("/vitals/history")
def get_history():
    """바이탈 로그 조회 (최근 N건, 기본 100건)"""
    limit = request.args.get("limit", 100, type=int)
    try:
        conn = pymysql.connect(**DB_CFG)
        cur = conn.cursor(pymysql.cursors.DictCursor)
        cur.execute("SELECT * FROM vital_logs ORDER BY id DESC LIMIT %s", (limit,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        # datetime → string 변환
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    threading.Thread(target=sensor_loop, daemon=True).start()
    threading.Thread(target=db_loop, daemon=True).start()
    log.info("[DB] vital_logs 저장 시작 (5초 간격)")
    app.run(host="0.0.0.0", port=5000, debug=False)
