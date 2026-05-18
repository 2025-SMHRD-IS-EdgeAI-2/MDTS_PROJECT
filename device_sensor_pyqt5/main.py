import sys, math, os, random, threading, json, time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from urllib.request import urlopen
from urllib.error import URLError
cv2 = None
HAS_CV2 = False

def ensure_cv2():
    """외상 촬영 화면 진입 전까지 OpenCV 로드를 지연해 기본 메모리 사용량을 줄인다."""
    global cv2, HAS_CV2
    if HAS_CV2 and cv2 is not None:
        return True
    try:
        import cv2 as _cv2
        cv2 = _cv2
        HAS_CV2 = True
        return True
    except ImportError:
        HAS_CV2 = False
        return False
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QStackedWidget,
    QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QFrame, QPushButton, QSizePolicy, QDialog, QLineEdit,
    QScrollArea, QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView,
    QGraphicsDropShadowEffect
)
from PyQt5.QtCore import Qt, QTimer, QDateTime, QPointF, QRectF, QSize, QRect, pyqtSignal
from PyQt5.QtGui import (
    QFont, QColor, QPainter, QPen, QBrush, QPixmap, QImage,
    QLinearGradient, QRadialGradient, QPainterPath
)

# ── [전역 설정 및 테마] ──────────────────────────
BG_DEEP    = "#020617"
BG_CARD    = "#0f172a"
ACCENT     = "#00e5ff"    # 사이언
ACCENT2    = "#7c4dff"    # 퍼플
ACCENT3    = "#00e676"    # 네온 그린
BORDER_CLR = "rgba(13, 217, 197, 0.2)"

CLR_HR     = "#00ff00"
CLR_SPO2   = "#00ffff"
CLR_BP     = "#ff00ff"
CLR_RESP   = "#ffff00"
CLR_TEMP   = "#ff8c00"
CLR_DIM    = "#2a3a55"

W, H = 1024, 600
FONT_MAIN = "Pretendard"

def _detect_rpi_url():
    import socket
    for ip in ["YOUR_RPI_HOST", "YOUR_RPI_HOST"]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(0.5); s.connect((ip, 5000)); s.close()
            return f"http://{ip}:5000/vitals"
        except: pass
    return "http://YOUR_RPI_HOST:5000/vitals"

RPI_SENSOR_URL = _detect_rpi_url()
RPI_IP = RPI_SENSOR_URL.replace("http://", "").replace("https://", "").split(":")[0]
JETSON_CONTROL_HOST = "0.0.0.0"
JETSON_CONTROL_PORT = 5055

GLOBAL_SS = f"""
    * {{ font-family: '{FONT_MAIN}'; }}
    QWidget {{ background: {BG_DEEP}; color: #c8d8ec; }}
    QScrollBar:vertical {{ background: {BG_DEEP}; width: 6px; border: none; }}
    QScrollBar::handle:vertical {{ background: #1a2a44; border-radius: 3px; min-height: 30px; }}
"""

def neon_btn(color=ACCENT):
    return f"QPushButton {{ background: transparent; color: {color}; border: 1.5px solid {color}; border-radius: 12px; font-weight: 900; font-size: 16px; }} QPushButton:hover {{ background: {color}; color: #000; }}"

# ── [원격 DB 선원 데이터 동기화] ──────────────────────────
REMOTE_DB_CFG = {"host": "YOUR_REMOTE_DB_HOST", "port": 3307, "user": "MDTS", "password": "YOUR_DB_PASSWORD", "database": "MDTS", "charset": "utf8mb4"}
RPI_FOCUS_URL = "http://YOUR_RPI_HOST:5000/crew/focus"

def fetch_crew_from_remote():
    """원격 DB tb_crew에서 선원 목록을 가져와 GUI 형식으로 변환"""
    try:
        import pymysql
        from datetime import date
        conn = pymysql.connect(**REMOTE_DB_CFG, connect_timeout=3)
        cur = conn.cursor(pymysql.cursors.DictCursor)
        cur.execute("SELECT * FROM tb_crew ORDER BY crew_id")
        rows = cur.fetchall()
        cur.close(); conn.close()
        if not rows:
            return None
        result = []
        for r in rows:
            bd = r.get("birthdate")
            age = 0
            dob_str = ""
            if bd:
                today = date.today()
                age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                dob_str = bd.strftime("%Y-%m-%d")
            joined = r.get("joined_at")
            board_str = joined.strftime("%Y-%m-%d") if joined else ""
            crew = {
                "id": f"S26-{r['crew_id']:03d}",
                "crew_id": r["crew_id"],
                "name": r.get("name", ""),
                "age": age,
                "role": r.get("position", ""),
                "dept": r.get("department", ""),
                "blood": r.get("bloodtype", ""),
                "chronic": r.get("underlying_disease") or "없음",
                "allergies": r.get("allergy") or "없음",
                "contact": r.get("phone") or "",
                "emergencyName": r.get("guardian_name") or "",
                "emergency": r.get("emergency_contact") or "",
                "height": float(r.get("height") or 0),
                "weight": float(r.get("weight") or 0),
                "boardingDate": board_str,
                "location": "",
                "dob": dob_str,
                "gender": "남" if r.get("gender") == "M" else "여" if r.get("gender") == "F" else r.get("gender", ""),
                "lastMed": r.get("recent_medication") or "없음",
                "note": "",
                "pastHistory": r.get("medical_history") or "없음",
                "isEmergency": False,
            }
            result.append(crew)
        return result
    except Exception:
        return None

def _crew_numeric_id(crew):
    try:
        return int(crew.get("crew_id") or str(crew.get("id", "")).split("-")[-1] or 0)
    except Exception:
        return 0

def fetch_focused_crew_ids_from_rpi():
    """Raspberry Pi 공통 상태에서 집중 관리 선원 목록을 가져온다."""
    try:
        from urllib.request import urlopen
        payload = json.loads(urlopen(RPI_FOCUS_URL, timeout=2).read().decode("utf-8"))
        return {int(x) for x in payload.get("focused_crew_ids", []) if int(x) > 0}
    except Exception:
        return None

def apply_focused_crew_state(crew_list):
    """Pi의 집중 관리 상태를 현재 선원 목록에 반영한다."""
    focused_ids = fetch_focused_crew_ids_from_rpi()
    if focused_ids is None:
        return False
    changed = False
    for crew in crew_list:
        focused = _crew_numeric_id(crew) in focused_ids
        if bool(crew.get("isEmergency")) != focused:
            crew["isEmergency"] = focused
            changed = True
    return changed

def sync_focused_crew_to_rpi(crew_id, focused=True):
    """PyQt5 환자 등록 상태를 Raspberry Pi 공통 상태에 저장한다."""
    try:
        from urllib.request import Request, urlopen
        cid = int(crew_id or 0)
        if cid <= 0:
            return
        payload = {"crew_id": cid, "focused": bool(focused), "source": "pyqt5"}
        req = Request(
            RPI_FOCUS_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urlopen(req, timeout=2).read()
    except Exception:
        pass

# ── [데이터 : 전문 선원 명단 (로컬 fallback)] ─────────────────────
CREW_DATA_LOCAL = [
    {"id":"S26-001","name":"이선장","age":52,"role":"선장","dept":"항해부","blood":"O+","chronic":"고혈압","allergies":"없음","contact":"010-2600-0001","emergencyName":"김도윤","emergency":"010-1234-5678 (배우자)","height":175,"weight":78,"boardingDate":"2024-01-10","location":"항해 브릿지","dob":"1974-05-12","gender":"남","lastMed":"암로디핀 5mg","note":"혈압 관리 주의","pastHistory":"2020년 맹장 수술","isEmergency":False},
    {"id":"S26-002","name":"김항해","age":45,"role":"1등 항해사","dept":"항해부","blood":"A+","chronic":"없음","allergies":"페니실린","contact":"010-2600-0002","emergencyName":"이서연","emergency":"010-9876-5432 (부친)","height":180,"weight":82,"boardingDate":"2024-02-15","location":"메인 데크","dob":"1981-11-20","gender":"남","lastMed":"없음","note":"특이사항 없음","pastHistory":"없음","isEmergency":False},
    {"id":"S26-003","name":"박기관","age":55,"role":"기관장","dept":"기관부","blood":"B+","chronic":"고혈압, 고지혈증","allergies":"아스피린","contact":"010-2600-0003","emergencyName":"양정희","emergency":"010-8765-4321 (배우자)","height":172,"weight":70,"boardingDate":"2024-03-01","location":"엔진 제어실","dob":"1971-08-05","gender":"남","lastMed":"암로디핀 5mg","note":"기관실 추락 사고 발생 (늑골 골절 의심)","pastHistory":"2021년 고혈압 진단","isEmergency":True},
    {"id":"S26-004","name":"최갑판","age":41,"role":"갑판장","dept":"항해부","blood":"AB+","chronic":"허리디스크","allergies":"없음","contact":"010-2600-0004","emergencyName":"박지호","emergency":"010-1122-3344 (배우자)","height":178,"weight":75,"boardingDate":"2024-01-20","location":"선수 갑판","dob":"1985-03-15","gender":"남","lastMed":"없음","note":"중량물 운반 주의","pastHistory":"2022년 요추 시술","isEmergency":False},
    {"id":"S26-005","name":"정조타","age":38,"role":"조타사","dept":"항해부","blood":"O-","chronic":"없음","allergies":"조개류","contact":"010-2600-0005","emergencyName":"최민준","emergency":"010-5566-7788 (동생)","height":170,"weight":68,"boardingDate":"2024-04-10","location":"조타실","dob":"1988-12-22","gender":"남","lastMed":"없음","note":"식품 알레르기 주의","pastHistory":"없음","isEmergency":False},
    {"id":"S26-006","name":"한통신","age":43,"role":"통신장","dept":"항해부","blood":"A+","chronic":"비염","allergies":"먼지","contact":"010-2600-0006","emergencyName":"정하윤","emergency":"010-9988-7766 (배우자)","height":174,"weight":72,"boardingDate":"2024-02-05","location":"통신 제어실","dob":"1983-05-30","gender":"남","lastMed":"없음","note":"건강 양호","pastHistory":"없음","isEmergency":False},
    {"id":"S26-007","name":"강기계","age":47,"role":"1등 기관사","dept":"기관부","blood":"B-","chronic":"없음","allergies":"벌침","contact":"010-2600-0007","emergencyName":"강준우","emergency":"010-4455-6677 (누나)","height":179,"weight":80,"boardingDate":"2024-03-12","location":"제2엔진실","dob":"1979-11-18","gender":"남","lastMed":"없음","note":"숙련 정비사","pastHistory":"없음","isEmergency":False},
    {"id":"S26-008","name":"윤조리","age":49,"role":"조리장","dept":"지원부","blood":"O+","chronic":"당뇨","allergies":"없음","contact":"010-2600-0008","emergencyName":"조예은","emergency":"010-6677-8899 (배우자)","height":168,"weight":76,"boardingDate":"2024-01-05","location":"상부 데크 조리실","dob":"1977-09-22","gender":"남","lastMed":"메트포르민","note":"식이 관리 필요","pastHistory":"없음","isEmergency":False},
    {"id":"S26-009","name":"임전기","age":35,"role":"전기사","dept":"기관부","blood":"AB-","chronic":"없음","allergies":"없음","contact":"010-2600-0009","emergencyName":"윤도현","emergency":"010-2211-0099 (형)","height":176,"weight":73,"boardingDate":"2024-05-20","location":"주 발전기실","dob":"1991-03-12","gender":"남","lastMed":"없음","note":"전기 설비 담당","pastHistory":"없음","isEmergency":False},
    {"id":"S26-010","name":"백보급","age":32,"role":"사무장","dept":"지원부","blood":"A-","chronic":"없음","allergies":"먼지","contact":"010-2600-0010","emergencyName":"장수빈","emergency":"010-3344-5566 (모친)","height":165,"weight":58,"boardingDate":"2024-06-15","location":"A-데크 사무실","dob":"1994-07-08","gender":"남","lastMed":"없음","note":"물자 관리 담당","pastHistory":"없음","isEmergency":False},
    {"id":"S26-011","name":"황갑판","age":28,"role":"갑판원","dept":"항해부","blood":"B+","chronic":"없음","allergies":"없음","contact":"010-2600-0011","emergencyName":"임지훈","emergency":"010-1100-2233 (동생)","height":182,"weight":85,"boardingDate":"2024-07-01","location":"보트 데크","dob":"1998-01-25","gender":"남","lastMed":"없음","note":"체력 우수","pastHistory":"없음","isEmergency":False},
    {"id":"S26-012","name":"서기관","age":30,"role":"3등 기관사","dept":"기관부","blood":"O+","chronic":"없음","allergies":"땅콩","contact":"010-2600-0012","emergencyName":"한지민","emergency":"010-5544-3322 (친구)","height":173,"weight":70,"boardingDate":"2024-08-10","location":"청정기실","dob":"1996-12-05","gender":"남","lastMed":"없음","note":"초임 사관","pastHistory":"없음","isEmergency":False},
    {"id":"S26-013","name":"오항해","age":26,"role":"실습 항해사","dept":"항해부","blood":"A+","chronic":"없음","allergies":"없음","contact":"010-2600-0013","emergencyName":"오세현","emergency":"010-7788-9900 (부친)","height":177,"weight":68,"boardingDate":"2024-09-01","location":"항해 브릿지","dob":"2000-04-14","gender":"남","lastMed":"없음","note":"실습 중","pastHistory":"없음","isEmergency":False},
    {"id":"S26-014","name":"나위생","age":31,"role":"위생원","dept":"지원부","blood":"B+","chronic":"없음","allergies":"없음","contact":"010-2600-0014","emergencyName":"신예준","emergency":"010-1122-3344 (언니)","height":162,"weight":52,"boardingDate":"2024-04-20","location":"거주구역 공용실","dob":"1995-10-30","gender":"여","lastMed":"없음","note":"방역 담당","pastHistory":"없음","isEmergency":False},
    {"id":"S26-015","name":"고기수","age":44,"role":"기수","dept":"기관부","blood":"O-","chronic":"치질","allergies":"없음","contact":"010-2600-0015","emergencyName":"송다희","emergency":"010-9900-1122 (배우자)","height":171,"weight":75,"boardingDate":"2024-02-28","location":"엔진룸 워크샵","dob":"1982-08-12","gender":"남","lastMed":"없음","note":"용접 숙련","pastHistory":"없음","isEmergency":False},
    {"id":"S26-016","name":"문세탁","age":33,"role":"세탁원","dept":"지원부","blood":"AB+","chronic":"습진","allergies":"세제","contact":"010-2600-0016","emergencyName":"권태한","emergency":"010-8899-2233 (모친)","height":164,"weight":60,"boardingDate":"2024-06-20","location":"B-데크 세탁실","dob":"1993-02-14","gender":"남","lastMed":"연고","note":"장갑 착용 필수","pastHistory":"없음","isEmergency":False},
]

# 시작 시 원격 DB에서 선원 데이터 로드, 실패 시 로컬 fallback
_remote = fetch_crew_from_remote()
CREW_DATA = _remote if _remote else list(CREW_DATA_LOCAL)
apply_focused_crew_state(CREW_DATA)

class CrewDataSync:
    """30초마다 원격 DB에서 선원 데이터를 동기화"""
    def __init__(self):
        self._crew_screen = None
        threading.Thread(target=self._loop, daemon=True).start()
    def set_crew_screen(self, cs):
        self._crew_screen = cs
    def _loop(self):
        global CREW_DATA
        while True:
            time.sleep(30)
            remote = fetch_crew_from_remote()
            if remote:
                apply_focused_crew_state(remote)
                CREW_DATA[:] = remote
                if self._crew_screen:
                    try: QTimer.singleShot(0, self._crew_screen._populate)
                    except: pass
            else:
                if apply_focused_crew_state(CREW_DATA) and self._crew_screen:
                    try: QTimer.singleShot(0, self._crew_screen._populate)
                    except: pass

crew_sync = CrewDataSync()

# ── [센서 데이터 수집] ──────────────────────────
class SensorDataFetcher:
    def __init__(self):
        self._data = {"HR": 0, "SpO2": 0, "TEMP": 0.0, "SBP": 0, "DBP": 0, "RESP": 0}
        self._lock = threading.Lock(); self._conn = False; threading.Thread(target=self._loop, daemon=True).start()
    def _loop(self):
        while True:
            try:
                with urlopen(RPI_SENSOR_URL, timeout=1) as r: raw = json.loads(r.read().decode())
                with self._lock: self._data.update(raw); self._conn = True
            except:
                with self._lock: self._conn = False
            time.sleep(1)
    def get(self):
        with self._lock: return dict(self._data), self._conn

sensor_fetcher = SensorDataFetcher()

# ── [의료용 UI 컴포넌트] ───────────────────────
class AiHeaderWidget(QWidget):
    def __init__(self, on_toggle_fs=None, parent=None):
        super().__init__(parent); self.setFixedHeight(48); self.on_toggle_fs = on_toggle_fs
        lay = QHBoxLayout(self); lay.setContentsMargins(16,0,16,0)
        self.title_lbl = QLabel("MDTS"); self.title_lbl.setStyleSheet(f"color: {ACCENT}; font-size: 26px; font-weight: bold;"); lay.addWidget(self.title_lbl)
        lay.addSpacing(20); self.sensor_stat = QLabel("● 센서 연결됨"); self.sensor_stat.setStyleSheet("color: #00e676; font-size: 14px;"); lay.addWidget(self.sensor_stat)
        lay.addStretch(); self.p_info = QLabel("환자 정보: 선택된 환자 없음"); self.p_info.setStyleSheet("color: #c8d8ec; font-size: 16px; font-weight: bold;"); lay.addWidget(self.p_info); lay.addStretch()
        self.time_lbl = QLabel(); self.time_lbl.setStyleSheet(f"color: {ACCENT}; font-size: 17px;"); lay.addWidget(self.time_lbl)
    def paintEvent(self, _): p = QPainter(self); p.fillRect(self.rect(), QColor(0,0,0)); p.end()

class WaveformWidget(QWidget):
    """저메모리 Jetson용 센서 파형 위젯.

    - list.pop(0) 대신 deque(maxlen)를 사용해 O(n) 이동과 임시 객체 생성을 줄인다.
    - 40ms 갱신을 120ms로 낮춰 repaint 빈도를 줄인다.
    - 비활성/숨김 상태에서는 repaint를 발생시키지 않는다.
    """
    SPEEDS = {"ecg": 0.20, "spo2": 0.09, "bp": 0.16, "resp": 0.05, "temp": 0.02}
    MAX_POINTS = 120
    TIMER_MS = 120

    def __init__(self, color, label, wave_type="ecg"):
        super().__init__()
        self.color = QColor(color)
        self.label = label
        self.wave_type = wave_type
        self.pts = deque(maxlen=self.MAX_POINTS)
        self.off = 0.0
        self.active = False
        self._timer = QTimer(self)
        self._timer.timeout.connect(self.tick)
        self._timer.start(self.TIMER_MS)

    def tick(self):
        if not self.active or not self.isVisible():
            return
        self.off += self.SPEEDS.get(self.wave_type, 0.2)
        v = 0.0
        if self.wave_type == "ecg":
            c = self.off % (2 * math.pi)
            if c < 0.8: v = math.sin(c * 4) * 5
            elif c < 1.1: v = math.sin((c - 0.8) * 10) * 8
            elif c < 1.4: v = -math.sin((c - 1.1) * 10) * 4
            elif c < 1.9: v = math.sin((c - 1.4) * 6.3) * 35
            elif c < 2.3: v = -math.sin((c - 1.9) * 7.8) * 15
            else: v = math.sin(c) * 2
        elif self.wave_type == "spo2":
            s = math.sin(self.off)
            v = (s ** 3) * 22 if s > 0 else s * 4
        elif self.wave_type == "bp":
            c = self.off % (2 * math.pi)
            if c < 0.5: v = math.sin(c / 0.5 * math.pi * 0.5) * 28
            elif c < 0.8: v = 28 - (c - 0.5) / 0.3 * 8
            elif c < 1.1: v = 20 + math.sin((c - 0.8) / 0.3 * math.pi) * 5
            else: v = max(0, 20 - (c - 1.1) / (2 * math.pi - 1.1) * 22)
        elif self.wave_type == "resp":
            v = math.sin(self.off) * 18
        elif self.wave_type == "temp":
            v = math.sin(self.off) * 4
        self.pts.append(v)
        self.update()

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        try:
            p.fillRect(self.rect(), QColor(0, 0, 0))
            p.setPen(QPen(QColor(30, 30, 30), 1))
            for x in range(0, self.width(), 24):
                p.drawLine(x, 0, x, self.height())
            p.setPen(QPen(self.color, 2))
            p.setFont(QFont(FONT_MAIN, 11, QFont.Bold))
            p.drawText(10, 22, self.label)
            if self.active and self.pts:
                mid = self.height() / 2
                step = self.width() / max(1, self.MAX_POINTS - 1)
                it = iter(self.pts)
                first = next(it)
                path = QPainterPath()
                path.moveTo(0, mid - first)
                for i, v in enumerate(it, 1):
                    path.lineTo(i * step, mid - v)
                p.drawPath(path)
        finally:
            p.end()

class NumpadDialog(QDialog):
    """숫자 키패드 팝업"""
    def __init__(self, title, parent=None):
        super().__init__(parent); self.setWindowTitle(title)
        self.setFixedSize(408, 476); self.setStyleSheet("background:#0a1628;")
        l = QVBoxLayout(self); l.setContentsMargins(20,20,20,20); l.setSpacing(12)
        # 타이틀
        lbl = QLabel(title); lbl.setStyleSheet("color:#00e5cc; font-size:22px; font-weight:900;"); lbl.setAlignment(Qt.AlignCenter)
        l.addWidget(lbl)
        # 입력 표시 + 지우기 버튼
        disp_row = QHBoxLayout(); disp_row.setSpacing(8)
        self.display = QLabel(""); self.display.setAlignment(Qt.AlignCenter)
        self.display.setStyleSheet("color:#fff; font-size:38px; font-weight:900; background:#0f172a; border:2px solid #00e5cc; border-radius:10px; padding:10px;")
        self.display.setFixedHeight(62); disp_row.addWidget(self.display)
        btn_clr = QPushButton("지우기"); btn_clr.setFixedSize(80, 62)
        btn_clr.setStyleSheet("QPushButton { background:#ff9800; color:#fff; border:none; border-radius:10px; font-size:16px; font-weight:900; } QPushButton:pressed { background:#e68900; }")
        btn_clr.clicked.connect(self._clear); disp_row.addWidget(btn_clr)
        l.addLayout(disp_row)
        self.value = ""
        # 키패드 그리드
        grid = QGridLayout(); grid.setSpacing(8)
        keys = [("7",0,0),("8",0,1),("9",0,2),("4",1,0),("5",1,1),("6",1,2),("1",2,0),("2",2,1),("3",2,2),(".",3,0),("0",3,1),("/",3,2)]
        for txt, row, col in keys:
            btn = QPushButton(txt); btn.setFixedSize(104, 62)
            btn.setStyleSheet("QPushButton { background:#1e293b; color:#fff; border:1px solid #334155; border-radius:10px; font-size:24px; font-weight:900; } QPushButton:pressed { background:#334155; }")
            btn.clicked.connect(lambda _, t=txt: self._key(t)); grid.addWidget(btn, row, col)
        l.addLayout(grid)
        # 하단 버튼
        btn_row = QHBoxLayout(); btn_row.setSpacing(12)
        btn_del = QPushButton("닫기"); btn_del.setFixedHeight(52)
        btn_del.setStyleSheet("QPushButton { background:#ff4d6d; color:#fff; border:none; border-radius:10px; font-size:19px; font-weight:900; }")
        btn_del.clicked.connect(self.reject); btn_row.addWidget(btn_del)
        btn_ok = QPushButton("확인"); btn_ok.setFixedHeight(52)
        btn_ok.setStyleSheet("QPushButton { background:#26de81; color:#000; border:none; border-radius:10px; font-size:19px; font-weight:900; }")
        btn_ok.clicked.connect(self.accept); btn_row.addWidget(btn_ok)
        l.addLayout(btn_row)
    def _key(self, t):
        self.value += t; self.display.setText(self.value)
    def _clear(self):
        self.value = ""; self.display.setText(self.value)
    def get_value(self): return self.value

class MedicalVitalCard(QFrame):
    def __init__(self, title, unit, color, manual_input=False):
        super().__init__(); self.color = color; self.title = title; self.manual_input = manual_input
        self.manual_val = None  # 수기 입력값
        self._last_val = None
        self._last_active = None
        self.setStyleSheet(f"background: #000; border: none;")
        l = QVBoxLayout(self); l.setContentsMargins(10, 5, 10, 5)
        h = QHBoxLayout()
        h.addWidget(QLabel(title, styleSheet=f"color: {color}; font-size: 24px; font-weight: bold;"))
        if manual_input:
            inp_lbl = QLabel("(입력)"); inp_lbl.setStyleSheet(f"color: {color}; font-size: 14px; font-weight:700; opacity:0.7;")
            h.addWidget(inp_lbl)
        h.addStretch()
        u = QLabel(unit); u.setStyleSheet(f"color: {color}; font-size: 14px;"); h.addWidget(u)
        l.addLayout(h)
        self.lbl_val = QLabel("--"); self.lbl_val.setStyleSheet(f"color: {CLR_DIM}; font-size: 57px; font-weight: 950;")
        l.addWidget(self.lbl_val, 0, Qt.AlignRight)
        if manual_input:
            self.setCursor(Qt.PointingHandCursor)
    def set_val(self, v):
        if self.manual_val is not None:
            v = self.manual_val
        active = v not in [0, 0.0, '--']
        if v != self._last_val:
            self.lbl_val.setText(str(v))
            self._last_val = v
        if active != self._last_active:
            self.lbl_val.setStyleSheet(f"color: {self.color if active else CLR_DIM}; font-size: 57px; font-weight: 950;")
            self._last_active = active
    def mousePressEvent(self, e):
        if self.manual_input:
            dlg = NumpadDialog(f"{self.title} 입력", self)
            if dlg.exec_() == QDialog.Accepted:
                val = dlg.get_value()
                if val:
                    self.manual_val = val
                    self.set_val(val)
                    # RPi 서버에 수기값 전송 (웹 연동)
                    self._post_manual(val)
        super().mousePressEvent(e)
    def _post_manual(self, val):
        try:
            import json
            from urllib.request import Request, urlopen
            url = RPI_SENSOR_URL.replace("/vitals", "/manual")
            if "혈압" in self.title:
                body = json.dumps({"bp": val}).encode()
            elif "체온" in self.title:
                body = json.dumps({"temp": val}).encode()
            else: return
            req = Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
            urlopen(req, timeout=2)
        except: pass

class PictogramButton(QPushButton):
    def __init__(self, label, bg, fg="#fff"):
        super().__init__(); self.label = label; self.bg = QColor(bg); self.fg = QColor(fg); self.setCursor(Qt.PointingHandCursor); self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
    def paintEvent(self, _):
        p = QPainter(self); p.setRenderHint(QPainter.Antialiasing); p.fillRect(self.rect(), self.bg.lighter(120) if self.underMouse() else self.bg)
        p.setPen(self.fg); p.setFont(QFont(FONT_MAIN, 20, QFont.Bold)); p.drawText(self.rect(), Qt.AlignCenter, self.label); p.end()


# ── [MDTS 부트스트랩: 재부팅 후 연동 자동 복구] ───────────────────
def mdts_startup_bootstrap_async():
    "PyQt5 시작 시 Pi 센서 서버, 센서 recording, Jetson Ollama를 백그라운드에서 복구한다."
    import threading
    worker = threading.Thread(target=_mdts_startup_bootstrap, daemon=True)
    worker.start()


def _mdts_startup_bootstrap():
    "재부팅 후 분리 실행되는 구성요소를 자동으로 정렬한다."
    import json as _json
    import os as _os
    import subprocess as _subprocess
    import time as _time
    from urllib.request import Request as _Request, urlopen as _urlopen

    def _http_json(url, method="GET", payload=None, timeout=2):
        data = None
        headers = {}
        if payload is not None:
            data = _json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = _Request(url, data=data, headers=headers, method=method)
        with _urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return _json.loads(raw) if raw else {}

    def _ensure_rpi_sensor_server():
        if not RPI_IP:
            return False
        vitals_url = f"http://{RPI_IP}:5000/vitals"
        try:
            _http_json(vitals_url, timeout=2)
            return True
        except Exception:
            pass

        try:
            import paramiko as _paramiko
            ssh = _paramiko.SSHClient()
            ssh.set_missing_host_key_policy(_paramiko.AutoAddPolicy())
            ssh.connect(
                RPI_IP,
                username=_os.getenv("MDTS_PI_USER", "pi"),
                password=_os.getenv("MDTS_PI_PASSWORD", "YOUR_RPI_PASSWORD"),
                timeout=5,
                auth_timeout=5,
                banner_timeout=5,
            )
            cmd = "pgrep -f '^python3 -u /home/pi/sensor_server_rpi.py$' >/dev/null || nohup python3 -u /home/pi/sensor_server_rpi.py > /home/pi/sensor.log 2>&1 &"
            ssh.exec_command(cmd, timeout=10)
            ssh.close()
            _time.sleep(3)
            _http_json(vitals_url, timeout=2)
            return True
        except Exception:
            return False

    def _enable_recording():
        if not RPI_IP:
            return False
        try:
            _http_json(
                f"http://{RPI_IP}:5000/recording",
                method="POST",
                payload={"enabled": True, "vital_enabled": True, "temp_enabled": True},
                timeout=2,
            )
            return True
        except Exception:
            return False

    def _ensure_ollama():
        try:
            _http_json("http://127.0.0.1:11434/api/tags", timeout=2)
            return True
        except Exception:
            pass
        try:
            _subprocess.run(["sudo", "-n", "systemctl", "start", "ollama"], timeout=6, check=False)
            _time.sleep(3)
            _http_json("http://127.0.0.1:11434/api/tags", timeout=3)
            return True
        except Exception:
            return False

    _ensure_rpi_sensor_server()
    _enable_recording()
    _ensure_ollama()


# ── [화면 1 : 정밀 모니터링 (메인 화면)] ────────────────────
class MonitorScreen(QWidget):
    def __init__(self, on_scan, on_crew, on_guide, on_home, on_fs, ctrl=None):
        super().__init__(); self._ctrl = ctrl; l = QVBoxLayout(self); l.setContentsMargins(0,0,0,0); l.setSpacing(0)
        self.header = AiHeaderWidget(on_toggle_fs=on_fs); l.addWidget(self.header)
        body = QHBoxLayout(); body.setSpacing(0); l.addLayout(body)
        w_v = QVBoxLayout(); w_v.setSpacing(2); body.addLayout(w_v, 6)
        self.ws = [WaveformWidget(CLR_HR, "심박수 (60~100 bpm)", "ecg"), WaveformWidget(CLR_SPO2, "산소포화도 (95~100%)", "spo2"), WaveformWidget(CLR_BP, "혈압 (120/80 mmHg)", "bp"), WaveformWidget(CLR_RESP, "호흡수 (12~20 /min)", "resp"), WaveformWidget(CLR_TEMP, "체온 (36.5~37.5 °C)", "temp")]
        for w in self.ws: w_v.addWidget(w)
        v_v = QVBoxLayout(); v_v.setSpacing(2); body.addLayout(v_v, 4)
        self.cvs = [MedicalVitalCard("심박수", "bpm", CLR_HR), MedicalVitalCard("산소포화도", "%", CLR_SPO2), MedicalVitalCard("혈압", "mmHg", CLR_BP, manual_input=True), MedicalVitalCard("호흡수", "/min", CLR_RESP), MedicalVitalCard("체온", "°C", CLR_TEMP, manual_input=True)]
        for c in self.cvs: v_v.addWidget(c)
        side = QVBoxLayout(); side.setSpacing(0); side.setContentsMargins(0,0,0,0); body.addLayout(side, 2)
        b_home = PictogramButton("센서\nON/OFF", "#1565c0"); b_home.clicked.connect(on_home); side.addWidget(b_home)
        b_crew = PictogramButton("선원\n관리", ACCENT, fg="#000"); b_crew.clicked.connect(on_crew); side.addWidget(b_crew)
        b_scan = PictogramButton("외상\n촬영", ACCENT3, fg="#000"); b_scan.clicked.connect(on_scan); side.addWidget(b_scan)
        b_cpr = PictogramButton("CPR\n가이드", "#dc143c"); b_cpr.clicked.connect(on_guide); side.addWidget(b_cpr)
        self._temp_captured = 0.0
        self._last_conn = None
        self._monitor_timer = QTimer(self)
        self._monitor_timer.timeout.connect(self.up)
        self._monitor_timer.start(1000)
    def set_patient(self, c):
        self.header.p_info.setText(f"환자 정보: {c['name']} ({c['id']}) | {c['dept']} {c['role']}")
        self._patient_selected = True
    def up(self):
        self.header.time_lbl.setText(QDateTime.currentDateTime().toString("yyyy-MM-dd HH:mm:ss"))
        d, conn = sensor_fetcher.get()
        if conn != self._last_conn:
            self.header.sensor_stat.setText("● 센서 연결됨" if conn else "○ 센서 대기")
            self.header.sensor_stat.setStyleSheet(f"color: {'#00e676' if conn else '#fb923c'}; font-size: 14px;")
            self._last_conn = conn
        # 센서 ON/OFF 상태에 따라 마스킹
        vital_on = self._ctrl._sensor_active if self._ctrl else True
        temp_on = self._ctrl._temp_active if self._ctrl else True
        if not vital_on:
            d["HR"] = 0; d["SpO2"] = 0; d["SBP"] = 0; d["DBP"] = 0; d["RESP"] = 0
            for w in self.ws[:4]: w.pts.clear(); w.update()
            self.cvs[2].manual_val = None
        if not temp_on:
            d["TEMP"] = 0.0
            self._temp_captured = 0.0
            self.ws[4].pts.clear(); self.ws[4].update()
        else:
            # 체온은 1회 측정값 유지 (센서에 댔을 때만 갱신)
            if d["TEMP"] > 0 and self._temp_captured == 0.0:
                self._temp_captured = d["TEMP"]
            d["TEMP"] = self._temp_captured
        v_list = [d["HR"], int(d["SpO2"]), f"{d['SBP']}/{d['DBP']}", d["RESP"], d["TEMP"]]
        for i, v in enumerate(v_list): self.cvs[i].set_val(v)
        raw_per_wave = [d["HR"], d["SpO2"], d["SBP"], d["RESP"], d["TEMP"]]
        for i, w in enumerate(self.ws):
            w.active = raw_per_wave[i] not in [0, 0.0]

# ── [화면 2 : 외상촬영 및 AI 분석 (웹 동일 구조 — 외상 6종)] ─────────────
# 외상 6종 정의
WOUND_TYPES = [
    {"key":"abrasion",  "label":"찰과상", "labelEn":"Abrasion",  "desc":"피부 표면이 긁혀 쓸린 상처입니다.", "actions":["상처 부위 생리식염수 세척","이물질 제거","항생제 연고 도포","멸균 거즈 드레싱"]},
    {"key":"contusion", "label":"타박상", "labelEn":"Contusion", "desc":"충격으로 멍이 드는 상처입니다.", "actions":["냉찜질 20분 적용","압박 붕대 감기","거상(높이 올리기)","통증 관리"]},
    {"key":"burn",      "label":"화상",   "labelEn":"Burn",      "desc":"열이나 화학물질로 피부가 손상된 상처입니다.", "actions":["15분 이상 냉각 처치","물집 보존 (터뜨리지 않기)","멸균 드레싱","감염 예방 항생제"]},
    {"key":"incision",  "label":"절상",   "labelEn":"Incision",  "desc":"날카로운 물체에 베인 상처입니다.", "actions":["직접 압박 지혈","상처 세척 후 봉합 테이프","멸균 드레싱","파상풍 예방 확인"]},
    {"key":"laceration","label":"열상",   "labelEn":"Laceration","desc":"피부가 불규칙하게 찢어진 상처입니다.", "actions":["압박 지혈","상처 세척","봉합 또는 스테리스트립","감염 모니터링"]},
    {"key":"puncture",  "label":"자창",   "labelEn":"Puncture",  "desc":"뾰족한 물체에 찔린 상처입니다.", "actions":["이물질 제거하지 않기 (깊은 경우)","상처 주변 세척","출혈 관찰","파상풍 예방 확인"]},
]

class TraumaScanScreen(QWidget):
    """외상 촬영 화면 — 카메라 피드 + 스캔 오버레이 동시 표시 (웹 동일 구조)"""
    def __init__(self, on_back, on_guide=None):
        super().__init__(); self.on_back = on_back; self.on_guide = on_guide
        self.scan_result = None
        self.scan_error = None
        self.scan_event_id = 0
        self.scan_phase = "camera"  # camera / scanning / result
        self.progress = 0
        self.scan_line_y = 0.0
        self.scan_dir = 1
        self.cam_frame = None  # 현재 카메라 프레임 (QImage)
        self.latest_jpeg = None  # 웹 대시보드 전송용 최신 JPEG 프레임
        self._last_jpeg_ts = 0.0  # 웹 송출용 JPEG 생성 주기 제한
        self._jpeg_interval_sec = 0.20
        self.cap = None  # cv2.VideoCapture
        # 전체 화면을 paintEvent로 직접 그림 (카메라 + 오버레이)
        self.setStyleSheet("background:#000;")
        # ── 타이머 ──
        self.cam_timer = QTimer(self); self.cam_timer.timeout.connect(self._grab_frame)
        self.scan_timer = QTimer(self); self.scan_timer.timeout.connect(self._scan_tick)
        self.line_timer = QTimer(self); self.line_timer.timeout.connect(self._animate_line)

    def showEvent(self, e):
        self._reset_to_camera()
        self._start_camera()

    def hideEvent(self, e):
        self._stop_camera()
        self.scan_timer.stop(); self.line_timer.stop()

    def _start_camera(self):
        if not ensure_cv2(): return
        if self.cap and self.cap.isOpened():
            self.cam_timer.start(66)
            return
        if self.cap:
            self.cap.release()
            self.cap = None
        self.latest_jpeg = None
        try:
            try:
                import subprocess
                subprocess.run(
                    ["v4l2-ctl", "-d", "/dev/video0", "--set-ctrl=gain=20,sharpness=24,backlight_compensation=1"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=1.5,
                )
            except Exception:
                pass
            self.cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
            if not self.cap.isOpened():
                self.cap = None
            else:
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.cap.set(cv2.CAP_PROP_FPS, 30)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                self.cap.set(cv2.CAP_PROP_GAIN, 20)
                self.cap.set(cv2.CAP_PROP_SHARPNESS, 24)
                for _ in range(3):
                    self.cap.read()
        except:
            self.cap = None
        self.cam_timer.start(66)  # ~15fps: Jetson Nano 메모리/CPU 보호

    def _stop_camera(self):
        self.cam_timer.stop()
        if self.cap:
            self.cap.release(); self.cap = None
        self.cam_frame = None
        self.latest_jpeg = None
        self._last_jpeg_ts = 0.0

    def _grab_frame(self):
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                now = time.monotonic()
                if now - self._last_jpeg_ts >= self._jpeg_interval_sec:
                    try:
                        ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 64])
                        if ok:
                            self.latest_jpeg = encoded.tobytes()
                            self._last_jpeg_ts = now
                    except Exception:
                        pass
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                h, w, ch = frame.shape
                self.cam_frame = QImage(frame.data, w, h, ch * w, QImage.Format_RGB888).copy()
            else:
                self.cam_frame = None
                self.latest_jpeg = None
        self.update()

    def _reset_to_camera(self):
        self.scan_phase = "camera"; self.progress = 0
        self.scan_line_y = 0.0; self.scan_dir = 1
        self.scan_timer.stop(); self.line_timer.stop()
        self.update()

    def prepare_retake(self):
        """웹/PyQt5 재촬영 요청 시 양쪽 모두 촬영 대기 상태로 되돌린다."""
        self.scan_timer.stop()
        self.line_timer.stop()
        self.scan_phase = "camera"
        self.progress = 0
        self.scan_result = None
        self.scan_error = None
        self.scan_line_y = 0.0
        self.scan_dir = 1
        self._start_camera()
        self.update()

    def stop_remote_stream(self):
        """웹 대시보드 종료 신호 수신 시 카메라 송출과 분석 상태를 중단한다."""
        self.scan_timer.stop()
        self.line_timer.stop()
        self._stop_camera()
        self.scan_phase = "camera"
        self.progress = 0
        self.scan_result = None
        self.scan_error = None
        self.scan_line_y = 0.0
        self.scan_dir = 1
        self.update()

    def _start_scan(self):
        self.scan_event_id += 1
        self.scan_phase = "scanning"; self.progress = 0; self.scan_result = None; self.scan_error = None
        self.scan_timer.start(80)
        self.line_timer.start(30)

    def _scan_tick(self):
        self.progress += 2
        if self.progress >= 100:
            self.scan_timer.stop(); self.line_timer.stop()
            self._finish_scan()
        self.update()

    def _animate_line(self):
        self.scan_line_y += 0.025 * self.scan_dir
        if self.scan_line_y >= 1.0: self.scan_dir = -1
        elif self.scan_line_y <= 0.0: self.scan_dir = 1
        self.update()

    def _finish_scan(self):
        roll = random.random()
        if roll < 0.15:
            # 오류: 이미지 인식 실패
            self.scan_error = {"mode": "error", "message": "이미지를 인식하지 못했습니다."}
            self._show_scan_modal("error")
            self._reset_to_camera()
            return
        if roll < 0.30:
            # 상처 미감지
            self.scan_error = {"mode": "no_wound", "message": "외상 상처가 감지되지 않았습니다."}
            self._show_scan_modal("no_wound")
            self._reset_to_camera()
            return
        wound = random.choice(WOUND_TYPES)
        conf = random.randint(78, 96)
        self.scan_result = {
            "key": wound["key"], "label": wound["label"], "labelEn": wound["labelEn"],
            "confidence": conf, "desc": wound["desc"], "actions": wound["actions"]
        }
        self.scan_error = None
        self.scan_phase = "result"
        self.update()

    def get_scan_state(self):
        return {
            "ok": True,
            "scan_event_id": self.scan_event_id,
            "phase": self.scan_phase,
            "progress": self.progress,
            "result": self.scan_result,
            "error": self.scan_error,
        }

    def _show_scan_modal(self, mode):
        dlg = QDialog(self); dlg.setWindowFlags(Qt.FramelessWindowHint | Qt.Dialog)
        dlg.setFixedSize(380, 260); dlg.setStyleSheet("background:rgba(8,16,32,0.98); border:2px solid %s; border-radius:20px;" % ("#ff4d6d" if mode == "error" else "#f59e0b"))
        # 좌측 카메라 영역 중앙에 배치
        cam_w, _, _, _ = self._layout()
        gx = self.mapToGlobal(self.rect().topLeft()).x()
        gy = self.mapToGlobal(self.rect().topLeft()).y()
        dlg.move(gx + (cam_w - 380) // 2, gy + (self.height() - 260) // 2)
        lay = QVBoxLayout(dlg); lay.setContentsMargins(28, 28, 28, 24); lay.setSpacing(14)
        if mode == "error":
            title = "촬영 오류"
            msg = "이미지를 인식하지 못했습니다.\n선명한 사진으로 다시 촬영해 주세요."
            color = "#ff4d6d"
        else:
            title = "외상 미감지"
            msg = "외상 상처가 감지되지 않았습니다.\n촬영 각도를 조정하여 다시 시도해 주세요."
            color = "#f59e0b"
        t = QLabel(title); t.setAlignment(Qt.AlignCenter)
        t.setStyleSheet(f"color:{color}; font-size:24px; font-weight:900; border:none;")
        lay.addWidget(t)
        m = QLabel(msg); m.setAlignment(Qt.AlignCenter); m.setWordWrap(True)
        m.setStyleSheet("color:#8da2c0; font-size:16px; border:none;")
        lay.addWidget(m)
        lay.addSpacing(10)
        btn_row = QHBoxLayout(); btn_row.setSpacing(10)
        btn_cancel = QPushButton("취소"); btn_cancel.setFixedHeight(44)
        btn_cancel.setStyleSheet("QPushButton { background:rgba(255,255,255,0.05); color:#8da2c0; border:1px solid rgba(255,255,255,0.1); border-radius:12px; font-size:15px; font-weight:700; }")
        btn_cancel.clicked.connect(dlg.reject); btn_row.addWidget(btn_cancel)
        btn_retry = QPushButton("다시 촬영"); btn_retry.setFixedHeight(44)
        btn_retry.setStyleSheet(f"QPushButton {{ background:{color}; color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:900; }}")
        btn_retry.clicked.connect(dlg.accept); btn_row.addWidget(btn_retry, 2)
        lay.addLayout(btn_row)
        if dlg.exec_() == QDialog.Accepted:
            self.prepare_retake()

    def _layout(self):
        """2열 레이아웃 좌표 계산 (좌: 카메라 영역, 우: 패널)"""
        W, H = self.width(), self.height()
        panel_w = 280  # 우측 패널 폭
        cam_w = W - panel_w  # 좌측 카메라 영역
        return cam_w, panel_w, W, H

    def _btn_rects(self):
        cam_w, panel_w, W, H = self._layout()
        bw, bh = panel_w - 40, 64  # 패널 내 좌우 20px 여백, 높이 64
        bx = cam_w + 20
        cap_rect = (bx, H//2 - 80, bw, bh)
        exit_rect = (bx, H//2 + 10, bw, bh)
        return cap_rect, exit_rect

    def _result_btn_rects(self):
        cam_w, panel_w, W, H = self._layout()
        bw, bh = panel_w - 40, 54
        bx = cam_w + 20
        gap = 12
        start_y = H//2 - 60
        rescan_rect = (bx, start_y, bw, bh)
        guide_rect = (bx, start_y + bh + gap, bw, bh)
        monitor_rect = (bx, start_y + (bh + gap) * 2, bw, bh)
        return rescan_rect, guide_rect, monitor_rect

    def mousePressEvent(self, e):
        W, H = self.width(), self.height()
        if self.scan_phase == "camera":
            cap_r, exit_r = self._btn_rects()
            if cap_r[0] <= e.x() <= cap_r[0]+cap_r[2] and cap_r[1] <= e.y() <= cap_r[1]+cap_r[3]:
                self._start_scan(); return
            if exit_r[0] <= e.x() <= exit_r[0]+exit_r[2] and exit_r[1] <= e.y() <= exit_r[1]+exit_r[3]:
                self.on_back(); return
        elif self.scan_phase == "result":
            rescan_r, guide_r, monitor_r = self._result_btn_rects()
            if rescan_r[0] <= e.x() <= rescan_r[0]+rescan_r[2] and rescan_r[1] <= e.y() <= rescan_r[1]+rescan_r[3]:
                self._reset_to_camera(); self._start_camera(); return
            if guide_r[0] <= e.x() <= guide_r[0]+guide_r[2] and guide_r[1] <= e.y() <= guide_r[1]+guide_r[3]:
                self._go_guide(); return
            if monitor_r[0] <= e.x() <= monitor_r[0]+monitor_r[2] and monitor_r[1] <= e.y() <= monitor_r[1]+monitor_r[3]:
                self.on_back(); return

    def _show_guide(self):
        if not self.scan_result: return
        dlg = QDialog(self); dlg.setWindowTitle("응급처치 가이드")
        dlg.setFixedSize(500, 400); dlg.setStyleSheet("background:#0a1628;")
        dl = QVBoxLayout(dlg); dl.setContentsMargins(24,24,24,24); dl.setSpacing(10)
        title = QLabel(f"{self.scan_result['label']} 응급처치")
        title.setStyleSheet("color:#26de81; font-size:22px; font-weight:900;"); dl.addWidget(title)
        desc = QLabel(self.scan_result['desc']); desc.setStyleSheet("color:#8da2c0; font-size:14px;"); desc.setWordWrap(True); dl.addWidget(desc)
        dl.addSpacing(8)
        steps_lbl = QLabel("처치 단계"); steps_lbl.setStyleSheet("color:#00e5cc; font-size:14px; font-weight:900;"); dl.addWidget(steps_lbl)
        for i, a in enumerate(self.scan_result['actions']):
            row = QLabel(f"  {i+1}. {a}"); row.setStyleSheet("color:#e8f0fe; font-size:15px; padding:4px 0;"); dl.addWidget(row)
        dl.addStretch()
        btn_close = QPushButton("닫기"); btn_close.setFixedHeight(40)
        btn_close.setStyleSheet("QPushButton { background:#26de81; color:#000; border:none; border-radius:10px; font-size:16px; font-weight:900; }")
        btn_close.clicked.connect(dlg.close); dl.addWidget(btn_close)
        dlg.exec_()

    def _go_guide(self):
        label = self.scan_result.get("label", "") if self.scan_result else ""
        if self.on_guide: self.on_guide(label)

    def paintEvent(self, e):
        p = QPainter(self); p.setRenderHint(QPainter.Antialiasing)
        W, H = self.width(), self.height()
        cam_w, panel_w, _, _ = self._layout()

        # ─── 결과 화면 (2열: 좌측 결과 정보, 우측 버튼) ───
        if self.scan_phase == "result" and self.scan_result:
            p.fillRect(0, 0, W, H, QColor("#08101e"))
            r = self.scan_result
            # 좌측 영역에 결과 표시 (수직 중앙 정렬)
            lx, lw = 0, cam_w
            block_h = 310  # 전체 콘텐츠 높이
            ty = (H - block_h) // 2  # 수직 중앙
            # 외상명 (대)
            f = QFont(FONT_MAIN, 54, QFont.Black); p.setFont(f); p.setPen(QColor("#ffffff"))
            p.drawText(QRect(lx, ty, lw, 80), Qt.AlignCenter, r["label"])
            # 영문명
            gap = int(H * 0.03)
            f.setPointSize(21); f.setWeight(QFont.DemiBold); p.setFont(f); p.setPen(QColor("#26de81"))
            p.drawText(QRect(lx, ty + 85 + gap, lw, 32), Qt.AlignCenter, r["labelEn"])
            # 설명
            f.setPointSize(17); f.setWeight(QFont.Normal); p.setFont(f); p.setPen(QColor("#94a3b8"))
            p.drawText(QRect(lx + 40, ty + 125 + gap, lw - 80, 50), Qt.AlignCenter | Qt.TextWordWrap, r["desc"])
            # 신뢰도
            f.setPointSize(68); f.setWeight(QFont.Black); p.setFont(f); p.setPen(QColor("#26de81"))
            p.drawText(QRect(lx, ty + 185, lw, 85), Qt.AlignCenter, f"{r['confidence']}%")
            # AI 분석 정확도
            f.setPointSize(14); f.setWeight(QFont.Bold); p.setFont(f); p.setPen(QColor("#334155"))
            p.drawText(QRect(lx, ty + 275, lw, 28), Qt.AlignCenter, "AI 분석 정확도")
            # 면책
            f.setPointSize(12); p.setFont(f); p.setPen(QColor("#64748b"))
            p.drawText(QRect(lx, H - 40, lw, 24), Qt.AlignCenter, "본 결과는 AI 분석 참고용이며 의료 진단이 아닙니다.")

            # 우측 패널 배경
            p.setPen(Qt.NoPen); p.setBrush(QColor(10, 22, 40, 240))
            p.drawRect(cam_w, 0, panel_w, H)
            # 우측 패널 구분선
            p.setPen(QPen(QColor(0, 229, 204, 40), 1))
            p.drawLine(cam_w, 0, cam_w, H)
            # 버튼 3개
            rescan_r, guide_r, monitor_r = self._result_btn_rects()
            rx, ry, rw, rh = rescan_r
            # 우측 패널 타이틀 (다시 촬영하기 버튼 바로 위, 가운데 정렬)
            f = QFont(FONT_MAIN, 14, QFont.Black); p.setFont(f); p.setPen(QColor("#00e5cc"))
            p.drawText(QRect(cam_w, ry - 40, panel_w, 30), Qt.AlignCenter, "분석 완료")
            # 다시 촬영하기 버튼
            p.setPen(QPen(QColor("#475569"), 1.5)); p.setBrush(QColor(255, 255, 255, 8))
            p.drawRoundedRect(rx, ry, rw, rh, 14, 14)
            f = QFont(FONT_MAIN, 14, QFont.Bold); p.setFont(f); p.setPen(QColor("#94a3b8"))
            p.drawText(QRect(rx, ry, rw, rh), Qt.AlignCenter, "다시 촬영하기")
            # 응급처치가이드 버튼
            gx, gy, gw, gh = guide_r
            p.setPen(Qt.NoPen); p.setBrush(QColor("#f59e0b"))
            p.drawRoundedRect(gx, gy, gw, gh, 14, 14)
            f.setPointSize(14); f.setWeight(QFont.Black); p.setFont(f); p.setPen(QColor("#000"))
            p.drawText(QRect(gx, gy, gw, gh), Qt.AlignCenter, "응급처치가이드")
            # 모니터링 이동 버튼
            mx, my, mw, mh = monitor_r
            p.setPen(Qt.NoPen); p.setBrush(QColor("#00e5cc"))
            p.drawRoundedRect(mx, my, mw, mh, 14, 14)
            f.setPointSize(14); f.setWeight(QFont.Black); p.setFont(f); p.setPen(QColor("#000"))
            p.drawText(QRect(mx, my, mw, mh), Qt.AlignCenter, "모니터링 이동")
            p.end(); return

        # ═══════════════════════════════════════════════════════
        # ─── 카메라 + 스캔 화면 (2열: 좌측 카메라, 우측 패널) ───
        # ═══════════════════════════════════════════════════════

        # 좌측: 카메라 배경
        if self.cam_frame:
            scaled = self.cam_frame.scaled(cam_w, H, Qt.KeepAspectRatioByExpanding)
            ox = (scaled.width() - cam_w) // 2; oy = (scaled.height() - H) // 2
            p.drawImage(0, 0, scaled, ox, oy, cam_w, H)
        else:
            p.fillRect(0, 0, cam_w, H, QColor("#0a0a0a"))

        # 비네팅 (좌측만)
        vignette = QRadialGradient(cam_w/2, H/2, max(cam_w, H) * 0.55)
        vignette.setColorAt(0, QColor(0, 0, 0, 0))
        vignette.setColorAt(1, QColor(0, 10, 20, 180))
        p.setPen(Qt.NoPen); p.setBrush(QBrush(vignette))
        p.drawRect(0, 0, cam_w, H)

        # ─── 스캔 프레임 (좌측 중앙) ───
        sz = min(cam_w, H) - 80  # 화면 맞춤
        cx, cy = cam_w // 2, H // 2
        half = sz // 2

        # 원형 가이드
        p.setPen(QPen(QColor(0, 229, 204, 80), 1)); p.setBrush(Qt.NoBrush)
        p.drawEllipse(QRect(cx - half, cy - half, sz, sz))
        pen_dash = QPen(QColor(0, 229, 204, 50), 2, Qt.DashLine)
        p.setPen(pen_dash)
        inner = int(sz * 0.90)
        p.drawEllipse(QRect(cx - inner//2, cy - inner//2, inner, inner))

        # 코너 프레임
        corner_pen = QPen(QColor("#00e5cc"), 4)
        p.setPen(corner_pen); p.setBrush(Qt.NoBrush)
        cl = 45
        corners = [
            (cx - half, cy - half, 1, 1), (cx + half, cy - half, -1, 1),
            (cx - half, cy + half, 1, -1), (cx + half, cy + half, -1, -1),
        ]
        for x, y, dx, dy in corners:
            p.drawLine(int(x), int(y), int(x + cl*dx), int(y))
            p.drawLine(int(x), int(y), int(x), int(y + cl*dy))

        # 십자 조준선
        p.setPen(QPen(QColor("#00e5cc"), 2))
        p.drawLine(cx - 18, cy, cx + 18, cy)
        p.drawLine(cx, cy - 18, cx, cy + 18)

        # ─── 스캔 라인 ───
        if self.scan_phase == "scanning":
            line_y = int((cy - half) + self.scan_line_y * sz)
            grad = QLinearGradient(cx - half, line_y, cx + half, line_y)
            grad.setColorAt(0, QColor(0, 0, 0, 0))
            grad.setColorAt(0.2, QColor(0, 229, 204, 180))
            grad.setColorAt(0.5, QColor(255, 255, 255, 255))
            grad.setColorAt(0.8, QColor(0, 229, 204, 180))
            grad.setColorAt(1, QColor(0, 0, 0, 0))
            p.setPen(Qt.NoPen); p.setBrush(QBrush(grad))
            p.drawRect(cx - half, line_y - 1, sz, 3)
            glow = QLinearGradient(cx - half, line_y - 12, cx - half, line_y + 12)
            glow.setColorAt(0, QColor(0, 229, 204, 0))
            glow.setColorAt(0.5, QColor(0, 229, 204, 35))
            glow.setColorAt(1, QColor(0, 229, 204, 0))
            p.setBrush(QBrush(glow))
            p.drawRect(cx - half, line_y - 12, sz, 24)

        # 상단 안내 텍스트 (좌측 영역 중앙)
        if self.scan_phase == "scanning":
            guide_text = "AI 이미지 분석 중..."
        else:
            guide_text = "진단 부위를 프레임 안에 맞춰주세요"
        f = QFont(FONT_MAIN, 15, QFont.Black); p.setFont(f)
        tw = p.fontMetrics().horizontalAdvance(guide_text) + 60
        gy = int(12 + H * 0.15)
        tx = (cam_w - tw) // 2
        p.setPen(QPen(QColor("#00e5cc"), 1.5)); p.setBrush(QColor(0, 20, 30, 220))
        p.drawRoundedRect(tx, gy, tw, 42, 10, 10)
        p.setPen(QColor("#ffffff")); p.drawText(QRect(tx, gy, tw, 42), Qt.AlignCenter, guide_text)

        # ─── 우측 패널 ───
        p.setPen(Qt.NoPen); p.setBrush(QColor(8, 16, 30, 245))
        p.drawRect(cam_w, 0, panel_w, H)
        # 구분선
        p.setPen(QPen(QColor(0, 229, 204, 40), 1))
        p.drawLine(cam_w, 0, cam_w, H)

        if self.scan_phase == "camera":
            # 촬영 시작 + 종료 버튼
            cap_r, exit_r = self._btn_rects()
            bx, by, bw, bh = cap_r
            # 패널 타이틀 (촬영시작 버튼 바로 위, 가운데 정렬)
            f = QFont(FONT_MAIN, 14, QFont.Black); p.setFont(f); p.setPen(QColor("#00e5cc"))
            p.drawText(QRect(cam_w, by - 40, panel_w, 30), Qt.AlignCenter, "외상 AI 스캔")
            p.setPen(Qt.NoPen); p.setBrush(QColor("#00e5cc"))
            p.drawRoundedRect(bx, by, bw, bh, 14, 14)
            f = QFont(FONT_MAIN, 16, QFont.Black); p.setFont(f); p.setPen(QColor("#000000"))
            p.drawText(QRect(bx, by, bw, bh), Qt.AlignCenter, "촬영 시작")

            ex, ey, ew, eh = exit_r
            p.setPen(QPen(QColor(255, 255, 255, 60), 1.5)); p.setBrush(QColor(0, 0, 0, 120))
            p.drawRoundedRect(ex, ey, ew, eh, 14, 14)
            f.setPointSize(14); f.setWeight(QFont.Bold); p.setFont(f); p.setPen(QColor("#ffffff"))
            p.drawText(QRect(ex, ey, ew, eh), Qt.AlignCenter, "진단 모드 종료")

            # 카메라 없을 때 안내
            if not self.cam_frame:
                f.setPointSize(11); p.setFont(f); p.setPen(QColor("#475569"))
                p.drawText(QRect(cam_w + 20, H - 80, panel_w - 40, 40), Qt.AlignCenter | Qt.TextWordWrap, "카메라 연결 대기 중...")

        elif self.scan_phase == "scanning":
            # 진행률 정보
            f = QFont(FONT_MAIN, 13, QFont.Bold); p.setFont(f); p.setPen(QColor("#8da2c0"))
            p.drawText(QRect(cam_w + 20, H//2 - 60, panel_w - 40, 24), Qt.AlignLeft, "분석 진행률")
            # 퍼센트 (대)
            f = QFont(FONT_MAIN, 36, QFont.Black); p.setFont(f); p.setPen(QColor("#00e5cc"))
            p.drawText(QRect(cam_w + 20, H//2 - 30, panel_w - 40, 50), Qt.AlignCenter, f"{self.progress}%")
            # 진행률 바
            bar_x = cam_w + 20; bar_y = H//2 + 30; bar_w = panel_w - 40; bar_h = 8
            p.setPen(Qt.NoPen); p.setBrush(QColor(255, 255, 255, 25))
            p.drawRoundedRect(bar_x, bar_y, bar_w, bar_h, 4, 4)
            prog_grad = QLinearGradient(bar_x, bar_y, bar_x + bar_w, bar_y)
            prog_grad.setColorAt(0, QColor("#00e5cc")); prog_grad.setColorAt(1, QColor("#38bdf8"))
            p.setBrush(QBrush(prog_grad))
            p.drawRoundedRect(bar_x, bar_y, int(bar_w * self.progress / 100), bar_h, 4, 4)
            # 상태 텍스트
            f = QFont(FONT_MAIN, 11); p.setFont(f); p.setPen(QColor("#64748b"))
            p.drawText(QRect(cam_w + 20, bar_y + 16, bar_w, 20), Qt.AlignCenter, "AI 이미지 분석 중...")

        p.end()

# ── [화면 3 : 선원 통합 관리 (웹 동일 구조)] ─────────────────────
class CrewScreen(QWidget):
    TABS = [("ALL","전체 선원"), ("EMERGENCY","응급 환자"), ("항해부","항해부"), ("기관부","기관부"), ("지원부","조리/지원")]
    def __init__(self, on_select, on_back):
        super().__init__(); self.on_select = on_select; self.active_tab = "ALL"; self.query = ""
        l = QVBoxLayout(self); l.setContentsMargins(10,8,10,8); l.setSpacing(4)
        # 헤더
        hdr = QHBoxLayout()
        hdr.addWidget(QLabel("선원 통합 관리 시스템", styleSheet=f"font-size:22px; font-weight:950; color:{ACCENT};"))
        l.addLayout(hdr)
        # 탭 바
        tab_bar = QHBoxLayout(); tab_bar.setSpacing(6)
        self.tab_btns = []
        for tid, tlabel in self.TABS:
            tb = QPushButton(tlabel); tb.setFixedHeight(36); tb.setProperty("tab_id", tid)
            tb.clicked.connect(lambda _, t=tid: self._set_tab(t)); tab_bar.addWidget(tb); self.tab_btns.append(tb)
        tab_bar.addStretch()
        btn_back = QPushButton("뒤로가기"); btn_back.setFixedSize(100, 34)
        btn_back.setStyleSheet("QPushButton { background:#334155; color:#fff; border:none; border-radius:8px; font-weight:900; font-size:16px; }")
        btn_back.clicked.connect(on_back); tab_bar.addWidget(btn_back)
        l.addLayout(tab_bar)
        self._style_tabs()
        # 테이블 (5컬럼, 폰트 키움, 좌우스크롤 제거)
        self.table = QTableWidget(); self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["이름/ID","소속/직책","나이/혈액형","기저질환/알레르기","환자 관리"])
        self.table.horizontalHeader().setStyleSheet("QHeaderView::section { background:#020617; color:#64748b; font-size:18px; font-weight:900; border:none; padding:4px; }")
        # 이름/ID, 소속/직책, 나이/혈액형: ResizeToContents (잘림 방지, 전체 데이터 기준)
        # 기저질환/알레르기: Stretch, 환자관리: Fixed
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(3, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(4, QHeaderView.Fixed)
        self.table.setColumnWidth(4, 100)
        self.table.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.table.verticalHeader().setVisible(False); self.table.setSelectionMode(QAbstractItemView.NoSelection)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.setStyleSheet("QTableWidget { background:#0a1628; border:none; gridline-color:#1e293b; } QTableWidget::item { padding:2px; }")
        self.table.setVerticalScrollMode(QAbstractItemView.ScrollPerPixel)
        self.table.viewport().installEventFilter(self); self._drag_pos = None; self._drag_moved = False
        l.addWidget(self.table)
        # 전체 데이터로 먼저 렌더링해서 최대 컬럼 폭 확보 후 고정
        self._populate_all_first = True
        self._populate()
        self._col_widths = [self.table.columnWidth(i) for i in range(5)]
        self._populate_all_first = False
        self._focus_timer = QTimer(self)
        self._focus_timer.timeout.connect(self._sync_focus_state)
        self._focus_timer.start(3000)
    def _style_tabs(self):
        colors = {"ALL":ACCENT, "EMERGENCY":"#ef4444", "항해부":"#38bdf8", "기관부":"#fb923c", "지원부":"#2dd4bf"}
        for tb in self.tab_btns:
            tid = tb.property("tab_id"); c = colors.get(tid, ACCENT); active = (tid == self.active_tab)
            if active: tb.setStyleSheet(f"QPushButton {{ background:{c}; color:#000; border:none; border-radius:8px; font-weight:900; font-size:16px; padding:0 14px; }}")
            else: tb.setStyleSheet(f"QPushButton {{ background:{c}22; color:{c}; border:1.5px solid {c}; border-radius:8px; font-weight:800; font-size:16px; padding:0 14px; }} QPushButton:hover {{ background:{c}; color:#000; }}")
    def _set_tab(self, tid): self.active_tab = tid; self._style_tabs(); self._populate()
    def _on_search(self, txt): self.query = txt.lower(); self._populate()
    def _sync_focus_state(self):
        if apply_focused_crew_state(CREW_DATA):
            self._populate()
    def _filtered(self):
        if getattr(self, '_populate_all_first', False):
            return CREW_DATA
        result = []
        for c in CREW_DATA:
            if self.query and not (self.query in c['name'].lower() or self.query in c['id'].lower() or self.query in c['role'].lower()): continue
            if self.active_tab == "ALL": result.append(c)
            elif self.active_tab == "EMERGENCY":
                if c.get('isEmergency'): result.append(c)
            elif c['dept'] == self.active_tab: result.append(c)
        return result
    def _populate(self):
        data = self._filtered(); self.table.setRowCount(len(data))
        for row, c in enumerate(data):
            self.table.setRowHeight(row, 66)
            self.table.setCellWidget(row, 0, self._make_label(f"{c['name']}  {c['id']}", "#fff", bold=True))
            self.table.setCellWidget(row, 1, self._make_label(f"{c['dept']} / {c['role']}", "#38bdf8"))
            self.table.setCellWidget(row, 2, self._make_small_label(f"{c['age']}세/{c['blood']}", "#ff4d6d"))
            parts = []
            if c['chronic'] != "없음": parts.append(c['chronic'])
            if c['allergies'] != "없음": parts.append(c['allergies'])
            combined = " / ".join(parts) if parts else "없음"
            ch_clr = "#fb923c" if parts else "#475569"
            self.table.setCellWidget(row, 3, self._make_label(combined, ch_clr))
            btn = QPushButton("관리 중" if c.get('isEmergency') else "환자전환")
            bc = "#ef4444" if c.get('isEmergency') else "#0dd9c5"
            btn.setFixedHeight(36)
            btn.setStyleSheet(f"QPushButton {{ background:{bc}; color:#000; border:none; border-radius:6px; font-weight:900; font-size:16px; padding:0 2px; }} QPushButton:hover {{ opacity:0.8; }}")
            btn.clicked.connect(lambda _, crew=c: self._confirm_patient(crew))
            w = QWidget(); wl = QHBoxLayout(w); wl.setContentsMargins(0,0,0,0); wl.addWidget(btn); self.table.setCellWidget(row, 4, w)
        # 초기 계산된 컬럼 폭 강제 적용
        if hasattr(self, '_col_widths'):
            for i, cw in enumerate(self._col_widths):
                self.table.setColumnWidth(i, cw)
    def _confirm_patient(self, crew):
        if crew.get('isEmergency'):
            # 이미 응급 환자 → 바로 모니터링으로 이동
            self.on_select(crew); return
        dlg = QDialog(self); dlg.setWindowFlags(Qt.Dialog | Qt.FramelessWindowHint)
        dlg.setFixedSize(480, 260); dlg.setStyleSheet("background:#0a1628; border:2px solid #ef4444; border-radius:14px;")
        l = QVBoxLayout(dlg); l.setContentsMargins(32, 28, 32, 28); l.setSpacing(16)
        icon_lbl = QLabel("⚠"); icon_lbl.setAlignment(Qt.AlignCenter)
        icon_lbl.setStyleSheet("color:#ef4444; font-size:36px; border:none;")
        l.addWidget(icon_lbl)
        title = QLabel("응급 환자 등록"); title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("color:#fff; font-size:22px; font-weight:900; border:none;")
        l.addWidget(title)
        msg = QLabel(f"{crew['name']} ({crew['role']}) 선원을\n응급 환자로 등록하시겠습니까?")
        msg.setAlignment(Qt.AlignCenter); msg.setWordWrap(True)
        msg.setStyleSheet("color:#94a3b8; font-size:16px; border:none;")
        l.addWidget(msg)
        btn_row = QHBoxLayout(); btn_row.setSpacing(12)
        btn_cancel = QPushButton("취소"); btn_cancel.setFixedHeight(44)
        btn_cancel.setStyleSheet("QPushButton{background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;font-size:16px;font-weight:700;} QPushButton:pressed{background:#334155;}")
        btn_ok = QPushButton("등록"); btn_ok.setFixedHeight(44)
        btn_ok.setStyleSheet("QPushButton{background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:900;} QPushButton:pressed{background:#dc2626;}")
        btn_cancel.clicked.connect(dlg.reject); btn_ok.clicked.connect(dlg.accept)
        btn_row.addWidget(btn_cancel); btn_row.addWidget(btn_ok); l.addLayout(btn_row)
        if dlg.exec_() == QDialog.Accepted:
            crew['isEmergency'] = True
            sync_focused_crew_to_rpi(_crew_numeric_id(crew), True)
            for target in CREW_DATA:
                if _crew_numeric_id(target) == _crew_numeric_id(crew):
                    target['isEmergency'] = True
            self._populate(); self.on_select(crew)
    def eventFilter(self, obj, event):
        from PyQt5.QtCore import QEvent
        if obj == self.table.viewport():
            if event.type() == QEvent.MouseButtonPress:
                self._drag_pos = event.pos().y(); self._drag_moved = False
            elif event.type() == QEvent.MouseMove and self._drag_pos is not None:
                delta = self._drag_pos - event.pos().y()
                if abs(delta) > 3: self._drag_moved = True
                self._drag_pos = event.pos().y()
                sb = self.table.verticalScrollBar(); sb.setValue(sb.value() + delta)
            elif event.type() == QEvent.MouseButtonRelease:
                if not getattr(self, "_drag_moved", False):
                    # 클릭 이벤트 — 셀 위젯에 전달
                    idx = self.table.indexAt(event.pos())
                    if idx.isValid():
                        w = self.table.cellWidget(idx.row(), idx.column())
                        if w and hasattr(w, '_overflow'): self._toggle_scroll(w)
                self._drag_pos = None
        return False
    def _make_label(self, text, color, bold=False):
        from PyQt5.QtWidgets import QScrollArea
        from PyQt5.QtCore import QPropertyAnimation
        lbl = QLabel(text); lbl.setStyleSheet(f"color:{color}; font-size:26px; font-weight:{'900' if bold else '700'}; padding:2px 4px; background:transparent;")
        lbl.setFixedHeight(40)
        sa = QScrollArea(); sa.setWidget(lbl); sa.setWidgetResizable(False); sa.setFixedHeight(44)
        sa.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff); sa.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        sa.setStyleSheet("QScrollArea { background:transparent; border:none; }")
        lbl.adjustSize()
        sa._overflow = lbl.sizeHint().width() > 200
        sa._lbl = lbl; sa._anim = None
        sa.mousePressEvent = lambda e, s=sa: self._toggle_scroll(s)
        return sa
    def _make_small_label(self, text, color):
        lbl = QLabel(text); lbl.setStyleSheet(f"color:{color}; font-size:20px; font-weight:900; padding:2px 10px;"); lbl.setAlignment(Qt.AlignCenter); return lbl
    def _toggle_scroll(self, sa):
        from PyQt5.QtCore import QPropertyAnimation
        if not sa._overflow: return
        if sa._anim and sa._anim.state() == QPropertyAnimation.Running:
            sa._anim.stop(); sa.horizontalScrollBar().setValue(0); sa._anim = None
        else:
            anim = QPropertyAnimation(sa.horizontalScrollBar(), b"value")
            anim.setDuration(3000); anim.setStartValue(0); anim.setEndValue(sa._lbl.sizeHint().width())
            anim.setLoopCount(-1); anim.start(); sa._anim = anim

# ── [화면 4 : CPR 가이드 페이지 복원] ───────────────────
class EmergencyGuideScreen(QWidget):
    GOLDEN_TIME_SECONDS = 240

    STEPS = [
        {"title": "의식 및 호흡 확인",
         "desc": "어깨를 두드리며 '괜찮으세요?'라고 묻고, 가슴이 오르내리는지 10초간 확인하십시오.",
         "img": "CPR/CPR-01.png"},
        {"title": "도움 및 AED 요청",
         "desc": "주변 사람 중 한 명을 지목해 '비상 상황 전파' 및 'AED(심장충격기)'를 가져와 달라고 지시하십시오.",
         "img": "CPR/CPR-02.png"},
        {"title": "가슴 압박 시행",
         "desc": "가슴 중앙에 깍지 낀 손을 대고, 팔꿈치를 펴서 수직으로 5~6cm 깊이로 강하게 누르십시오. 분당 100~120회 속도를 유지하세요.",
         "img": "CPR/CPR-03.png"},
        {"title": "AED 패드 부착",
         "desc": "전원을 켜고 패드 하나는 오른쪽 쇄골 아래, 다른 하나는 왼쪽 옆구리에 붙인 뒤 음성 지시에 따르십시오. 분석 중에는 환자에게서 떨어지십시오.",
         "img": "CPR/CPR-04.png"},
    ]
    def __init__(self, on_back):
        super().__init__(); self.on_back = on_back; self._sel = 0
        self.setStyleSheet("background:#020617;")
        # 전체 화면 투명 레드 오버레이
        self._red_overlay = QFrame(self)
        self._red_overlay.setStyleSheet("background:transparent;")
        self._red_overlay.hide(); self._red_overlay.setAttribute(Qt.WA_TransparentForMouseEvents)
        self._golden_time = self.GOLDEN_TIME_SECONDS; self._golden_active = False
        l = QVBoxLayout(self); l.setContentsMargins(14, 8, 14, 8); l.setSpacing(6)
        # 헤더
        hdr = QHBoxLayout(); hdr.setContentsMargins(0,0,0,0)
        hdr.addWidget(QLabel("심폐소생술 가이드", styleSheet="font-size:24px; font-weight:950; color:#fff;"))
        hdr.addStretch()
        btn = QPushButton("뒤로가기"); btn.setFixedSize(100, 34)
        btn.setStyleSheet("QPushButton { background:#334155; color:#fff; border:none; border-radius:8px; font-weight:900; font-size:16px; }")
        btn.clicked.connect(on_back); hdr.addWidget(btn)
        l.addLayout(hdr)
        # 본문 2열: 좌=스텝리스트, 우=이미지+골든타임
        body = QHBoxLayout(); body.setSpacing(12)
        # 좌: 스텝 리스트
        left = QVBoxLayout(); left.setSpacing(8)
        self._step_btns = []
        for i, s in enumerate(self.STEPS):
            sb = QPushButton(); sb.setCursor(Qt.PointingHandCursor)
            sb.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
            sb_lay = QHBoxLayout(sb); sb_lay.setContentsMargins(12,8,12,8); sb_lay.setSpacing(12)
            # 번호 원
            num = QLabel(str(i+1)); num.setFixedSize(36,36); num.setAlignment(Qt.AlignCenter)
            num.setStyleSheet("background:#38bdf8; color:#fff; font-size:18px; font-weight:950; border-radius:18px;")
            sb_lay.addWidget(num)
            # 텍스트
            txt_w = QWidget(); txt_l = QVBoxLayout(txt_w); txt_l.setContentsMargins(0,0,0,0); txt_l.setSpacing(2)
            t_lbl = QLabel(s["title"]); t_lbl.setStyleSheet("color:#fff; font-size:26px; font-weight:900;")
            txt_l.addWidget(t_lbl)
            d_lbl = QLabel(s["desc"]); d_lbl.setWordWrap(True); d_lbl.setStyleSheet("color:#94a3b8; font-size:18px; font-weight:600;")
            txt_l.addWidget(d_lbl)
            sb_lay.addWidget(txt_w, 1)
            sb.clicked.connect(lambda _, idx=i: self._select_step(idx))
            left.addWidget(sb)
            self._step_btns.append(sb)
            sb._num = num
        body.addLayout(left, 6)
        # 우: 이미지 컨테이너 (골든타임 오버레이)
        img_container = QWidget(); img_container.setStyleSheet("background:#0f172a; border-radius:14px;")
        self._img_lbl = QLabel(img_container); self._img_lbl.setAlignment(Qt.AlignCenter)
        self._img_lbl.setStyleSheet("background:transparent;")
        # 골든타임 원형 오버레이
        self._gt_circle = QFrame(img_container)
        self._gt_circle.setFixedSize(160, 160)
        self._gt_circle.setStyleSheet("background:rgba(250,204,21,0.9); border:none; border-radius:80px;")
        gt_lay = QVBoxLayout(self._gt_circle); gt_lay.setAlignment(Qt.AlignCenter); gt_lay.setContentsMargins(0,0,0,0); gt_lay.setSpacing(0)
        self._gt_title = QLabel("골든타임"); self._gt_title.setAlignment(Qt.AlignCenter)
        self._gt_title.setStyleSheet("color:#000; font-size:17px; font-weight:900; background:transparent;")
        gt_lay.addWidget(self._gt_title)
        self._gt_time = QLabel("04:00"); self._gt_time.setAlignment(Qt.AlignCenter)
        self._gt_time.setStyleSheet("color:#000; font-size:39px; font-weight:950; background:transparent;")
        gt_lay.addWidget(self._gt_time)
        # CPR 박자 오버레이 (120bpm)
        self._bpm_frame = QFrame(img_container)
        self._bpm_frame.setFixedHeight(44)
        self._bpm_frame.setStyleSheet("background:rgba(239,68,68,0.9); border:none; border-radius:10px;")
        bpm_lay = QHBoxLayout(self._bpm_frame); bpm_lay.setAlignment(Qt.AlignCenter); bpm_lay.setContentsMargins(16,0,16,0)
        self._bpm_lbl = QLabel("깜빡임 속도에 맞춰 압박하세요"); self._bpm_lbl.setAlignment(Qt.AlignCenter)
        self._bpm_lbl.setStyleSheet("color:#fff; font-size:25px; font-weight:900; background:transparent;")
        bpm_lay.addWidget(self._bpm_lbl)
        self._bpm_frame.hide()
        self._bpm_on = False
        # CPR 박자 타이머 (500ms = 120bpm)
        self._bpm_timer = QTimer(self); self._bpm_timer.timeout.connect(self._tick_bpm); self._bpm_timer.setInterval(250)
        self._img_container = img_container
        body.addWidget(img_container, 4)
        l.addLayout(body, 1)
        # 골든타임 타이머: 화면이 보이는 동안에만 실행해 숨겨진 상태에서 0초가 되는 문제를 막는다.
        self._gtimer = QTimer(self); self._gtimer.timeout.connect(self._tick_golden); self._gtimer.setInterval(1000)
        self.reset_golden_time()

    def reset_golden_time(self):
        """CPR 가이드 진입 시 골든타임을 4분으로 초기화한다."""
        self._golden_time = self.GOLDEN_TIME_SECONDS
        self._golden_active = True
        self._gt_title.setText("골든타임")
        self._gt_title.setStyleSheet("color:#000; font-size:17px; font-weight:900; background:transparent;")
        self._gt_circle.setStyleSheet("background:rgba(250,204,21,0.9); border:none; border-radius:80px;")
        self._gt_time.setText("04:00")
        if not self._gtimer.isActive():
            self._gtimer.start()
        self._select_step(0, reset_timer=False)

    def showEvent(self, event):
        super().showEvent(event)
        self.reset_golden_time()

    def hideEvent(self, event):
        super().hideEvent(event)
        self._golden_active = False
        self._gtimer.stop()

    def _select_step(self, idx, reset_timer=True):
        self._sel = idx
        if idx == 0 and reset_timer and self._golden_time <= 0:
            self._golden_active = True
            self._golden_time = self.GOLDEN_TIME_SECONDS
            self._gt_title.setText("골든타임")
            self._gt_title.setStyleSheet("color:#000; font-size:17px; font-weight:900; background:transparent;")
            self._gt_circle.setStyleSheet("background:rgba(250,204,21,0.9); border:none; border-radius:80px;")
        for i, sb in enumerate(self._step_btns):
            if i == idx:
                sb.setStyleSheet("QPushButton { background:rgba(56,189,248,0.15); border:2px solid #38bdf8; border-radius:16px; }")
                sb._num.setStyleSheet("background:#38bdf8; color:#fff; font-size:18px; font-weight:950; border-radius:18px;")
            else:
                sb.setStyleSheet("QPushButton { background:rgba(255,255,255,0.03); border:2px solid #1e293b; border-radius:16px; }")
                sb._num.setStyleSheet("background:#334155; color:#94a3b8; font-size:18px; font-weight:950; border-radius:18px;")
        # CPR 박자: 3번 스텝(가슴 압박)에서만 활성화
        if idx == 2:
            self._bpm_frame.show(); self._red_overlay.show(); self._bpm_timer.start()
        else:
            self._bpm_frame.hide(); self._red_overlay.hide(); self._bpm_timer.stop()
            self._bpm_frame.setStyleSheet("background:rgba(239,68,68,0.9); border:none; border-radius:10px;")
            self._red_overlay.setStyleSheet("background:transparent; border:8px solid transparent;")
        self._update_img()

    def _tick_bpm(self):
        self._bpm_on = not self._bpm_on
        if self._bpm_on:
            self._bpm_frame.setStyleSheet("background:#ef4444; border:none; border-radius:10px;")
            self._red_overlay.setStyleSheet("background:rgba(239,68,68,0.12); border:8px solid rgba(239,68,68,0.6);")
        else:
            self._bpm_frame.setStyleSheet("background:#b91c1c; border:none; border-radius:10px;")
            self._red_overlay.setStyleSheet("background:transparent; border:8px solid transparent;")

    def _update_img(self):
        c = self._img_container; cw, ch = c.width(), c.height()
        self._img_lbl.setGeometry(0, 0, cw, ch)
        pix = QPixmap(self.STEPS[self._sel]["img"])
        if not pix.isNull():
            scale = max(cw / pix.width(), ch / pix.height())
            scaled = pix.scaled(int(pix.width() * scale), int(pix.height() * scale), Qt.KeepAspectRatio, Qt.SmoothTransformation)
            x = (scaled.width() - cw) // 2; y = (scaled.height() - ch) // 2
            self._img_lbl.setPixmap(scaled.copy(x, y, cw, ch))
        self._gt_circle.move(cw - 168, ch - 168)
        self._bpm_frame.setFixedWidth(cw - 16)
        self._bpm_frame.move(8, 8)

    def resizeEvent(self, e):
        super().resizeEvent(e)
        self._red_overlay.setGeometry(0, 0, self.width(), self.height())
        self._red_overlay.raise_()
        self._update_img()

    def _tick_golden(self):
        if self._golden_active and self._golden_time > 0:
            self._golden_time -= 1
        m = self._golden_time // 60; s = self._golden_time % 60
        self._gt_time.setText(f"{m:02d}:{s:02d}")
        if self._golden_time == 0:
            self._gt_title.setText("시간초과")
            self._gt_title.setStyleSheet("color:#fff; font-size:17px; font-weight:900; background:transparent;")
            self._gt_circle.setStyleSheet("background:rgba(239,68,68,0.9); border:none; border-radius:80px;")

# ── [화면 6 : 외상 응급처치 가이드 (6종)] ─────────────────
TRAUMA_IMG_DIR = os.path.expanduser("~/trauma_wound")
TRAUMA_GUIDES = [
    {"label":"찰과상","color":"#22c55e","severity":"LOW",
     "desc":"넘어지거나 긁혀서 피부 표면이 쓸린 상처입니다. 깨끗이 씻는 것이 가장 중요합니다.",
     "steps":[
         {"title":"상처를 깨끗이 씻기","desc":"흐르는 깨끗한 물이나 식염수로 상처 속 흙·먼지를 5~10분간 충분히 씻어내십시오.","img":"찰과상_01.png"},
         {"title":"소독 연고 바르기","desc":"깨끗한 거즈로 물기를 닦은 뒤, 소독 연고를 면봉으로 얇게 발라 주십시오.","img":"찰과상_02.png"},
         {"title":"거즈로 덮어 보호하기","desc":"바람이 통하는 거즈를 상처 위에 덮어 먼지나 오염으로부터 보호하십시오.","img":"찰과상_03.png"},
         {"title":"하루마다 확인 및 교체","desc":"하루에 한 번 거즈를 교체하고 상처 상태를 확인하십시오. 빨개지거나 고름이 나오면 즉시 의료진에게 알리십시오.","img":"찰과상_04.png"},
     ]},
    {"label":"타박상","color":"#22c55e","severity":"LOW",
     "desc":"부딪히거나 맞아서 피부 속 혈관이 터져 멍이 들고 붓는 상처입니다. 뼈가 부러진 경우도 있으니 주의가 필요합니다.",
     "steps":[
         {"title":"차갑게 식히기 (48시간)","desc":"얼음팩(수건에 싸서)을 20분 올려두고, 20분 쉬는 것을 반복하십시오.","img":"타박상_01.png"},
         {"title":"다친 부위 높이 올려두기","desc":"다친 부위를 심장보다 높은 위치에 올려두면 붓기가 줄어듭니다.","img":"타박상_02.png"},
         {"title":"따뜻하게 하기 (48시간 이후)","desc":"48시간이 지난 뒤에는 따뜻한 찜질로 혈액 순환을 도와 빠른 회복을 도우십시오.","img":"타박상_03.png"},
         {"title":"뼈 부러짐 의심 시 고정","desc":"통증이 심해지거나 모양이 이상하면 뼈가 부러진 것일 수 있습니다. 움직이지 않도록 즉시 고정하십시오.","img":"타박상_04.png"},
     ]},
    {"label":"화상","color":"#f59e0b","severity":"HIGH",
     "desc":"뜨거운 물, 증기, 화염 또는 화학물질에 의한 피부 손상입니다. 즉각적인 냉각이 조직 손상을 최소화합니다.",
     "steps":[
         {"title":"흐르는 물에 20분 냉각","desc":"12~25\u00b0C 찬물에 최소 20분 이상 노출시켜 열기를 식히십시오. 얼음물은 절대 금지합니다.","img":"Burn-01.png"},
         {"title":"의복 및 장신구 제거","desc":"피부가 붓기 전 반지·시계 등 신속 제거. 피부에 붙은 옷은 억지로 떼지 마십시오.","img":"Burn-02.png"},
         {"title":"화상 연고 도포","desc":"깨끗한 면봉을 사용하여 화상 전용 연고를 얇게 발라 주십시오. 물집은 절대 터뜨리지 마십시오.","img":"Burn-03.png"},
         {"title":"멸균 드레싱 및 보호","desc":"멸균 거즈나 화상 전용 드레싱을 환부에 대고 느슨하게 고정하여 외부 오염을 차단하십시오.","img":"Burn-04.png"},
     ]},
    {"label":"절상","color":"#f97316","severity":"MEDIUM",
     "desc":"칼이나 유리처럼 날카로운 것에 베인 상처입니다. 깊이 베이면 혈관이나 힘줄까지 다칠 수 있습니다.",
     "steps":[
         {"title":"거즈로 눌러 피 멈추기","desc":"깨끗한 거즈를 상처에 대고 5~10분간 꾹 눌러 피를 멈추십시오. 거즈가 젖어도 떼지 말고 위에 덧대십시오.","img":"절상_01.png"},
         {"title":"깨끗한 물로 씻기","desc":"피가 멈추면 깨끗한 물이나 식염수로 상처를 충분히 씻어내십시오.","img":"절상_02.png"},
         {"title":"상처 테이프로 임시 접합","desc":"상처가 1cm보다 얕고 벌어지지 않으면 상처 접합 테이프로 가장자리를 맞붙여 주십시오.","img":"절상_03.png"},
         {"title":"깊은 상처는 의료진에게","desc":"1cm 이상 깊거나 벌어진 상처는 임시 접합 후 즉시 원격 의료진에게 알리십시오.","img":"절상_04.png"},
     ]},
    {"label":"열상","color":"#ef4444","severity":"HIGH",
     "desc":"딱딱한 것에 세게 부딪히거나 찢겨서 피부가 울퉁불퉁하게 찢어진 상처입니다. 감염 위험이 높습니다.",
     "steps":[
         {"title":"강하게 눌러 피 멈추기","desc":"거즈를 상처에 대고 있는 힘껏 꾹 눌러 피를 멈추십시오. 거즈가 젖어도 떼지 말고 위에 덧대십시오.","img":"열상_01.png"},
         {"title":"깨끗한 물로 충분히 씻기","desc":"식염수나 깨끗한 물을 많이 사용하여 상처 안쪽까지 꼼꼼히 씻어내십시오.","img":"열상_02.png"},
         {"title":"임시 접합 후 의료진 연결","desc":"상처 접합 테이프로 임시로 맞붙인 뒤 즉시 원격 의료진에게 알리십시오.","img":"열상_03.png"},
         {"title":"파상풍·감염 확인","desc":"파상풍 주사 접종 여부를 확인하십시오. 48시간 동안 빨개짐·고름·열감을 관찰하십시오.","img":"열상_04.png"},
     ]},
    {"label":"자창","color":"#dc2626","severity":"CRITICAL",
     "desc":"칼이나 못처럼 뾰족한 것에 찔린 상처입니다. 겉으로 피가 적어도 몸 안이 크게 다쳐 있을 수 있어 가장 위험합니다.",
     "steps":[
         {"title":"박힌 것 절대 빼지 말기","desc":"박힌 물체는 절대 빼지 마십시오. 수건이나 거즈로 주변을 받쳐 흔들리지 않도록 고정만 하십시오.","img":"자창_01.png"},
         {"title":"주변 눌러 지혈","desc":"물체 주변을 거즈로 둘러 피를 멈추십시오. 가슴에 찔렸다면 테이프를 3면만 붙이고 1면은 열어두십시오.","img":"자창_02.png"},
         {"title":"따뜻하게 덮고 다리 높이기","desc":"담요로 환자를 따뜻하게 덮고 다리를 높게 올려 쇼크를 예방하십시오. 음식과 물은 절대 주지 마십시오.","img":"자창_03.png"},
         {"title":"즉시 배 돌리고 이송","desc":"지금 당장 배를 돌려 병원으로 향하십시오. 먼저 의료진에게 연락하여 지시를 받으십시오.","img":"자창_04.png"},
     ]},
]

class TraumaGuideScreen(QWidget):
    def __init__(self, on_back):
        super().__init__(); self.on_back = on_back; self._sel_wound = 0; self._sel_step = 0
        self.setStyleSheet("background:#020617;")
        l = QVBoxLayout(self); l.setContentsMargins(14, 8, 14, 8); l.setSpacing(6)
        # 헤더
        hdr = QHBoxLayout(); hdr.setContentsMargins(0,0,0,0)
        hdr.addWidget(QLabel("외상 응급처치 가이드", styleSheet="font-size:24px; font-weight:950; color:#fff;"))
        hdr.addStretch()
        btn = QPushButton("뒤로가기"); btn.setFixedSize(100, 34)
        btn.setStyleSheet("QPushButton { background:#334155; color:#fff; border:none; border-radius:8px; font-weight:900; font-size:16px; }")
        btn.clicked.connect(on_back); hdr.addWidget(btn)
        l.addLayout(hdr)
        # 외상 6종 탭 버튼
        tab_lay = QHBoxLayout(); tab_lay.setSpacing(6)
        self._tab_btns = []
        for i, g in enumerate(TRAUMA_GUIDES):
            tb = QPushButton(g["label"]); tb.setCursor(Qt.PointingHandCursor)
            tb.setFixedHeight(42)
            tb.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
            tb.clicked.connect(lambda _, idx=i: self._select_wound(idx))
            tab_lay.addWidget(tb)
            self._tab_btns.append(tb)
        l.addLayout(tab_lay)
        # 설명 라벨
        self._desc_lbl = QLabel(); self._desc_lbl.setWordWrap(True)
        self._desc_lbl.setStyleSheet("color:#94a3b8; font-size:16px; font-weight:600; padding:4px 0;")
        self._desc_lbl.setFixedHeight(40)
        l.addWidget(self._desc_lbl)
        # 본문 2열: 좌=스텝리스트, 우=위험도 패널
        body = QHBoxLayout(); body.setSpacing(12)
        # 좌: 스텝 리스트
        left = QVBoxLayout(); left.setSpacing(8)
        self._step_btns = []
        for i in range(4):
            sb = QPushButton(); sb.setCursor(Qt.PointingHandCursor)
            sb.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
            sb_lay = QHBoxLayout(sb); sb_lay.setContentsMargins(12,8,12,8); sb_lay.setSpacing(12)
            num = QLabel(str(i+1)); num.setFixedSize(36,36); num.setAlignment(Qt.AlignCenter)
            num.setStyleSheet("background:#38bdf8; color:#fff; font-size:18px; font-weight:950; border-radius:18px;")
            sb_lay.addWidget(num)
            txt_w = QWidget(); txt_l = QVBoxLayout(txt_w); txt_l.setContentsMargins(0,0,0,0); txt_l.setSpacing(2)
            t_lbl = QLabel(); t_lbl.setStyleSheet("color:#fff; font-size:24px; font-weight:900;")
            txt_l.addWidget(t_lbl)
            d_lbl = QLabel(); d_lbl.setWordWrap(True); d_lbl.setStyleSheet("color:#94a3b8; font-size:16px; font-weight:600;")
            txt_l.addWidget(d_lbl)
            sb_lay.addWidget(txt_w, 1)
            sb.clicked.connect(lambda _, idx=i: self._select_step(idx))
            left.addWidget(sb)
            self._step_btns.append(sb)
            sb._num = num; sb._t_lbl = t_lbl; sb._d_lbl = d_lbl
        body.addLayout(left, 6)
        # 우: 이미지 + 위험도 패널
        right_w = QWidget(); right_w.setStyleSheet("background:#0f172a; border-radius:14px;")
        right_l = QVBoxLayout(right_w); right_l.setAlignment(Qt.AlignCenter); right_l.setSpacing(8); right_l.setContentsMargins(8,8,8,8)
        # 이미지
        self._img_lbl = QLabel(); self._img_lbl.setAlignment(Qt.AlignCenter)
        self._img_lbl.setStyleSheet("background:transparent;")
        right_l.addWidget(self._img_lbl, 1)
        body.addWidget(right_w, 4)
        l.addLayout(body, 1)
        self._select_wound(0)

    def _select_wound(self, idx):
        self._sel_wound = idx; self._sel_step = 0
        g = TRAUMA_GUIDES[idx]
        # 탭 스타일 갱신
        for i, tb in enumerate(self._tab_btns):
            if i == idx:
                tb.setStyleSheet(f"QPushButton {{ background:{g['color']}; color:#fff; border:none; border-radius:10px; font-size:18px; font-weight:950; }}")
            else:
                c = TRAUMA_GUIDES[i]["color"]
                tb.setStyleSheet(f"QPushButton {{ background:rgba(255,255,255,0.04); color:#94a3b8; border:2px solid {c}44; border-radius:10px; font-size:18px; font-weight:800; }} QPushButton:hover {{ background:rgba(255,255,255,0.08); }}")
        # 설명 (탭 색깔 적용)
        self._desc_lbl.setText(g["desc"])
        self._desc_lbl.setStyleSheet(f"color:{g['color']}; font-size:16px; font-weight:600; padding:4px 0;")
        # 스텝 갱신
        for i, sb in enumerate(self._step_btns):
            s = g["steps"][i]
            sb._t_lbl.setText(s["title"])
            sb._d_lbl.setText(s["desc"])
        self._update_step_styles()
        self._update_img()

    def _select_step(self, idx):
        self._sel_step = idx
        self._update_step_styles()
        self._update_img()

    def _update_img(self):
        g = TRAUMA_GUIDES[self._sel_wound]
        img_file = g["steps"][self._sel_step].get("img", "")
        img_path = os.path.join(TRAUMA_IMG_DIR, img_file)
        if os.path.isfile(img_path):
            pix = QPixmap(img_path)
            lbl_w = self._img_lbl.width() or 300
            lbl_h = self._img_lbl.height() or 300
            self._img_lbl.setPixmap(pix.scaled(lbl_w, lbl_h, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        else:
            self._img_lbl.setText(img_file)
            self._img_lbl.setStyleSheet("color:#475569; font-size:14px; background:transparent;")

    def _update_step_styles(self):
        g = TRAUMA_GUIDES[self._sel_wound]
        for i, sb in enumerate(self._step_btns):
            if i == self._sel_step:
                sb.setStyleSheet(f"QPushButton {{ background:rgba({self._hex_to_rgb(g['color'])},0.15); border:2px solid {g['color']}; border-radius:16px; }}")
                sb._num.setStyleSheet(f"background:{g['color']}; color:#fff; font-size:18px; font-weight:950; border-radius:18px;")
            else:
                sb.setStyleSheet("QPushButton { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:16px; }")
                sb._num.setStyleSheet("background:#334155; color:#94a3b8; font-size:18px; font-weight:950; border-radius:18px;")

    def select_by_label(self, label):
        for i, g in enumerate(TRAUMA_GUIDES):
            if g["label"] == label:
                self._select_wound(i); return

    @staticmethod
    def _hex_to_rgb(h):
        h = h.lstrip('#')
        return f"{int(h[0:2],16)},{int(h[2:4],16)},{int(h[4:6],16)}"

# ── [화면 5 : 제어판 시스템 복원] ─────────────────
class ControlScreen(QWidget):
    def __init__(self, on_back, on_scan=None, get_active_crew_id=None):
        super().__init__(); self.on_back = on_back; self.on_scan = on_scan; self.get_active_crew_id = get_active_crew_id
        self._sensor_active = False; self._temp_active = False
        self.setStyleSheet("background:#020617;")
        l = QVBoxLayout(self); l.setContentsMargins(14,4,14,4); l.setSpacing(4)
        # 헤더 (최소화)
        hdr = QHBoxLayout(); hdr.setContentsMargins(0,0,0,0)
        hdr.addWidget(QLabel("센서제어", styleSheet=f"font-size:23px; font-weight:950; color:{ACCENT};"))
        hdr.addStretch()
        self.status_lbl = QLabel("센서 대기"); self.status_lbl.setStyleSheet("color:#64748b; font-size:16px; font-weight:700;")
        hdr.addWidget(self.status_lbl)
        hdr.addSpacing(10)
        btn = QPushButton("뒤로가기"); btn.setFixedSize(100, 34)
        btn.setStyleSheet("QPushButton { background:#334155; color:#fff; border:none; border-radius:8px; font-weight:900; font-size:16px; }")
        btn.clicked.connect(on_back); hdr.addWidget(btn)
        l.addLayout(hdr)
        # ── 센서 카드 3개 (가로 배치) ──
        cards_lay = QHBoxLayout(); cards_lay.setSpacing(10)
        self.btn_vital = self._make_sensor_card("산소포화도\n심박수 / 호흡수", "SpO2 · HR · RESP", CLR_HR)
        self.btn_vital.clicked.connect(self._toggle_vital)
        cards_lay.addWidget(self.btn_vital)
        self.btn_temp = self._make_sensor_card("체온 측정", "TEMP", CLR_TEMP)
        self.btn_temp.clicked.connect(self._toggle_temp)
        cards_lay.addWidget(self.btn_temp)
        self.btn_camera = self._make_sensor_card("외상 촬영", "TRAUMA SCAN", "#6a1b9a")
        self.btn_camera.clicked.connect(self._go_scan)
        cards_lay.addWidget(self.btn_camera)
        l.addLayout(cards_lay, 3)
        # ── 하단: 큰 START 버튼 ──
        l.addSpacing(6)
        self.btn_main = QPushButton("모니터링 시작"); self.btn_main.setFixedHeight(70)
        self.btn_main.setStyleSheet("QPushButton { background:#00e5cc; color:#000; font-size:38px; font-weight:950; border-radius:16px; } QPushButton:hover { background:#33eeff; }")
        self.btn_main.clicked.connect(self._toggle_all)
        l.addWidget(self.btn_main)
        l.addSpacing(20)
        # 타이머
        self._timer = QTimer(self); self._timer.timeout.connect(self._update_status); self._timer.start(2000)
        threading.Thread(target=self._sync_recording_state, args=(False,), daemon=True).start()

    def _make_sensor_card(self, title, sub, color):
        btn = QPushButton(); btn.setCursor(Qt.PointingHandCursor)
        btn.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        btn.setStyleSheet("QPushButton { background:#111827; border:none; border-radius:14px; } QPushButton:hover { background:#1a2332; }")
        lay = QVBoxLayout(btn); lay.setSpacing(0); lay.setContentsMargins(4,2,4,2)
        t = QLabel(title); t.setAlignment(Qt.AlignCenter); t.setWordWrap(True)
        t.setStyleSheet("color:#fff; font-size:39px; font-weight:900; background:transparent;")
        lay.addWidget(t, 1)
        lay.addSpacing(2)
        # 상태 영역 (원형)
        stat_container = QWidget(); stat_container.setStyleSheet("background:transparent;")
        sc_lay = QVBoxLayout(stat_container); sc_lay.setAlignment(Qt.AlignCenter); sc_lay.setContentsMargins(0,0,0,0)
        stat_w = QFrame(); stat_w.setFixedSize(240, 240)
        stat_w.setStyleSheet("background:#00c853; border:none; border-radius:120px;")
        stat_lay = QVBoxLayout(stat_w); stat_lay.setAlignment(Qt.AlignCenter); stat_lay.setContentsMargins(0,0,0,0)
        stat_lbl = QLabel("START"); stat_lbl.setAlignment(Qt.AlignCenter)
        stat_lbl.setStyleSheet("color:#fff; font-size:55px; font-weight:950; background:transparent;")
        stat_lay.addWidget(stat_lbl)
        sc_lay.addWidget(stat_w)
        lay.addWidget(stat_container, 2)
        btn._stat_w = stat_w; btn._stat_lbl = stat_lbl; btn._active = False
        return btn

    def _set_card_state(self, btn, active):
        btn._active = active
        if active:
            btn._stat_w.setStyleSheet("background:#d32f2f; border:none; border-radius:120px;")
            btn._stat_lbl.setText("STOP")
        else:
            btn._stat_w.setStyleSheet("background:#00c853; border:none; border-radius:120px;")
            btn._stat_lbl.setText("START")

    def _toggle_vital(self):
        self._sensor_active = not self._sensor_active
        self._set_card_state(self.btn_vital, self._sensor_active)
        if self._sensor_active:
            self.status_lbl.setText("센서 서버 시작 중...")
            threading.Thread(target=self._start_server, daemon=True).start()
        else:
            self.status_lbl.setText("센서 저장 일시중지 중...")
            threading.Thread(target=self._sync_recording_state, args=(self._any_sensor_active(),), daemon=True).start()

    def _toggle_temp(self):
        self._temp_active = not self._temp_active
        self._set_card_state(self.btn_temp, self._temp_active)
        threading.Thread(target=self._sync_recording_state, args=(self._any_sensor_active(),), daemon=True).start()

    def _go_scan(self):
        if self.on_scan: self.on_scan()

    def _any_sensor_active(self):
        return bool(self._sensor_active or self._temp_active)

    def _sync_recording_state(self, enabled):
        try:
            import json
            from urllib.request import Request, urlopen
            payload = {
                "enabled": bool(enabled and self._any_sensor_active()),
                "vital_enabled": bool(self._sensor_active),
                "temp_enabled": bool(self._temp_active),
            }
            req = Request(
                RPI_SENSOR_URL.replace("/vitals", "/recording"),
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urlopen(req, timeout=2).read()
            if not enabled:
                req_clear = Request(
                    RPI_SENSOR_URL.replace("/vitals", "/manual/clear"),
                    data=b"{}",
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                urlopen(req_clear, timeout=2).read()
            QTimer.singleShot(0, lambda: self.status_lbl.setText("DB 저장 활성" if enabled else "DB 저장 일시중지"))
        except:
            QTimer.singleShot(0, lambda: self.status_lbl.setText("RPi 저장 제어 실패"))

    def _sync_active_crew(self):
        if not self.get_active_crew_id:
            return
        try:
            from urllib.request import Request, urlopen
            cid = int(self.get_active_crew_id() or 0)
            if cid <= 0:
                return
            req = Request(
                RPI_SENSOR_URL.replace("/vitals", "/crew"),
                data=json.dumps({"crew_id": cid}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urlopen(req, timeout=2).read()
        except:
            pass

    def _toggle_all(self):
        """모니터링 화면으로 이동"""
        self.on_back()

    def _start_server(self):
        try:
            import paramiko
            ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect('YOUR_RPI_HOST', username='pi', password='YOUR_RPI_PASSWORD', timeout=5)
            ssh.exec_command('pkill -9 -f sensor_server_rpi')
            time.sleep(0.5)
            ssh.exec_command('nohup python3 -u /home/pi/sensor_server_rpi.py > /home/pi/sensor.log 2>&1 &')
            ssh.close()
            time.sleep(1.0)
            self._sync_active_crew()
            self._sync_recording_state(True)
            QTimer.singleShot(0, lambda: self.status_lbl.setText("센서 서버 실행 중 / DB 저장 활성"))
        except:
            QTimer.singleShot(0, lambda: self.status_lbl.setText("RPi 연결 실패"))

    def _stop_server(self):
        try:
            import paramiko
            ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect('YOUR_RPI_HOST', username='pi', password='YOUR_RPI_PASSWORD', timeout=5)
            ssh.exec_command('pkill -9 -f sensor_server_rpi')
            ssh.close()
            QTimer.singleShot(0, lambda: self.status_lbl.setText("센서 서버 중지됨"))
        except:
            QTimer.singleShot(0, lambda: self.status_lbl.setText("RPi 연결 실패"))

    def _update_status(self):
        _, conn = sensor_fetcher.get()
        if conn:
            self.status_lbl.setText("센서 서버 실행 중")
        elif not self._sensor_active:
            self.status_lbl.setText("센서 대기")

    def showEvent(self, e):
        self._update_status()

# ── [웹 대시보드 → Jetson PyQt5 외상 촬영 제어 API] ────────────────────────
class JetsonControlHandler(BaseHTTPRequestHandler):
    app_window = None

    def log_message(self, fmt, *args):
        return

    def _capture_fallback_jpeg(self):
        """HTTP 요청 스레드에서는 카메라를 직접 열지 않는다.

        Jetson Nano에서 PyQt5 GUI 타이머와 HTTP 요청 스레드가 동시에 /dev/video0을 열면
        V4L2 busy, OpenCV double free가 발생할 수 있다. 웹에는 PyQt5 GUI 타이머가 이미
        생성한 latest_jpeg만 전달한다.
        """
        if self.app_window is not None and hasattr(self.app_window, "scan"):
            return getattr(self.app_window.scan, "latest_jpeg", None)
        return None

    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_jpeg(self, body):
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.end_headers()
        self.wfile.write(body)

    def _send_mjpeg_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()

        try:
            while True:
                frame = None
                if self.app_window is not None and hasattr(self.app_window, "scan"):
                    frame = self.app_window.scan.latest_jpeg
                if not frame:
                    frame = self._capture_fallback_jpeg()

                if frame:
                    self.wfile.write(b"--frame\r\n")
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode("ascii"))
                    self.wfile.write(frame)
                    self.wfile.write(b"\r\n")
                    self.wfile.flush()

                time.sleep(0.25)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return
        except Exception:
            return

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
            if length <= 0:
                return {}
            raw = self.rfile.read(length).decode("utf-8")
            return json.loads(raw) if raw else {}
        except Exception:
            return {}

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            return self._send_json({"ok": True, "service": "jetson_pyqt5_control"})

        if path == "/trauma/stream.mjpg":
            return self._send_mjpeg_stream()

        if path == "/trauma/frame.jpg":
            frame = None
            if self.app_window is not None and hasattr(self.app_window, "scan"):
                frame = self.app_window.scan.latest_jpeg
                if not frame and getattr(self.app_window.scan, "cap", None) is not None:
                    for _ in range(24):
                        time.sleep(0.05)
                        frame = self.app_window.scan.latest_jpeg
                        if frame:
                            break
            if not frame:
                frame = self._capture_fallback_jpeg()
            if not frame:
                return self._send_json({"ok": False, "reason": "camera_frame_not_ready"}, 503)
            return self._send_jpeg(frame)

        if path == "/trauma/result":
            if self.app_window is None or not hasattr(self.app_window, "scan"):
                return self._send_json({"ok": False, "reason": "pyqt_window_not_ready"}, 503)
            return self._send_json(self.app_window.scan.get_scan_state())

        return self._send_json({"ok": False, "reason": "not_found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/trauma/start":
            if self.app_window is None:
                return self._send_json({"ok": False, "reason": "pyqt_window_not_ready"}, 503)
            self.app_window.trauma_command.emit("start")
            return self._send_json({"ok": True, "action": "trauma_start"})

        if path == "/trauma/capture":
            if self.app_window is None:
                return self._send_json({"ok": False, "reason": "pyqt_window_not_ready"}, 503)
            self.app_window.trauma_command.emit("capture")
            return self._send_json({"ok": True, "action": "trauma_capture"})

        if path == "/trauma/reset":
            if self.app_window is None:
                return self._send_json({"ok": False, "reason": "pyqt_window_not_ready"}, 503)
            self.app_window.trauma_command.emit("reset")
            return self._send_json({"ok": True, "action": "trauma_reset"})

        if path == "/trauma/stop":
            if self.app_window is None:
                return self._send_json({"ok": False, "reason": "pyqt_window_not_ready"}, 503)
            self.app_window.trauma_command.emit("stop")
            return self._send_json({"ok": True, "action": "trauma_stop"})

        if path == "/trauma/guide":
            if self.app_window is None:
                return self._send_json({"ok": False, "reason": "pyqt_window_not_ready"}, 503)
            payload = self._read_json()
            label = str(payload.get("label") or payload.get("traumaType") or "").strip()
            if not label and self.app_window.scan.scan_result:
                label = self.app_window.scan.scan_result.get("label", "")
            self.app_window.trauma_command.emit(f"guide:{label}")
            return self._send_json({"ok": True, "action": "trauma_guide", "label": label})

        return self._send_json({"ok": False, "reason": "not_found"}, 404)

# ── [메인 윈도우 컨트롤러] ────────────────────────
class MainWindow(QMainWindow):
    trauma_command = pyqtSignal(str)

    def __init__(self):
        super().__init__(); self.setFixedSize(W, H); self.setWindowTitle("MDTS")
        self.stack = QStackedWidget(); self.setCentralWidget(self.stack)
        self.active_crew_id = 0
        self.ctrl = ControlScreen(self.show_mon, self.show_scan, self._get_active_crew_id)
        self.mon = MonitorScreen(self.show_scan, self.show_crew, self.show_guide, self.show_ctrl, self._toggle_fs, self.ctrl)
        self.scan = TraumaScanScreen(self.show_mon, self.show_trauma_guide); self.crew = CrewScreen(self.on_patient_select, self.show_mon)
        crew_sync.set_crew_screen(self.crew)
        self.guide = EmergencyGuideScreen(self.show_mon)
        self.trauma_guide = TraumaGuideScreen(self.show_scan)
        self.stack.addWidget(self.mon); self.stack.addWidget(self.scan); self.stack.addWidget(self.crew); self.stack.addWidget(self.guide); self.stack.addWidget(self.ctrl); self.stack.addWidget(self.trauma_guide)
        self.trauma_command.connect(self._handle_trauma_command)
        self._start_control_api()
        self._sensor_crew_timer = QTimer(self)
        self._sensor_crew_timer.timeout.connect(self._sync_crew_from_sensor_state)
        self._sensor_crew_timer.start(1500)
        QTimer.singleShot(500, self._sync_crew_from_sensor_state)

        # 환자 미선택 상태로 시작 - 선원관리에서 선택 필요
    def _sync_crew_from_sensor_state(self):
        """PyQt5에 선택 환자가 없을 때만 웹/센서 서버의 crew_id를 적용한다."""
        if self.active_crew_id > 0:
            return
        try:
            with urlopen(RPI_SENSOR_URL.replace("/vitals", "/crew"), timeout=1) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            cid = int(payload.get("crew_id") or 0)
            if cid <= 0:
                return
            for crew in CREW_DATA:
                if int(crew.get("crew_id") or 0) == cid:
                    self.on_patient_select(crew)
                    return
        except:
            pass

    def show_mon(self): self.stack.setCurrentWidget(self.mon)
    def show_scan(self):
        self.stack.setCurrentWidget(self.scan)
        self.scan._start_camera()
    def show_crew(self): self.stack.setCurrentWidget(self.crew)
    def show_guide(self): self.stack.setCurrentWidget(self.guide)
    def show_trauma_guide(self, label=""):
        if label: self.trauma_guide.select_by_label(label)
        self.stack.setCurrentWidget(self.trauma_guide)
    def show_ctrl(self): self.stack.setCurrentWidget(self.ctrl)
    def on_patient_select(self, c):
        self.mon.set_patient(c); self.show_mon()
        # 센서 서버에 선택된 환자 crew_id 전달
        cid = c.get("crew_id", 0)
        self.active_crew_id = int(cid or 0)
        threading.Thread(target=self._notify_crew, args=(cid,), daemon=True).start()
    def _get_active_crew_id(self):
        return self.active_crew_id
    def _notify_crew(self, cid):
        try:
            import urllib.request
            req = urllib.request.Request(RPI_SENSOR_URL.replace("/vitals", "/crew"), data=json.dumps({"crew_id": cid}).encode(), headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=2)
        except: pass
    def _handle_trauma_command(self, action):
        if action == "start":
            self.show_scan()
            return
        if action == "capture":
            self.show_scan()
            self.scan._start_scan()
            return
        if action == "reset":
            self.show_scan()
            self.scan.prepare_retake()
            return
        if action == "stop":
            self.scan.stop_remote_stream()
            if self.stack.currentWidget() in (self.scan, self.trauma_guide):
                self.show_mon()
            return
        if action.startswith("guide:"):
            label = action.split(":", 1)[1].strip()
            self.show_trauma_guide(label)
    def _start_control_api(self):
        def run_server():
            try:
                JetsonControlHandler.app_window = self
                server = ThreadingHTTPServer((JETSON_CONTROL_HOST, JETSON_CONTROL_PORT), JetsonControlHandler)
                server.daemon_threads = True
                server.serve_forever()
            except OSError:
                pass
            except Exception:
                pass
        threading.Thread(target=run_server, daemon=True).start()
    def _toggle_fs(self): (self.showFullScreen() if not self.isFullScreen() else self.showNormal())

if __name__ == "__main__":
    import os
    mdts_startup_bootstrap_async()
    app = QApplication(sys.argv); app.setStyle("Fusion"); app.setFont(QFont(FONT_MAIN, 10)); app.setStyleSheet(GLOBAL_SS); w = MainWindow()
    if os.environ.get("DISPLAY") == ":0":
        w.showFullScreen()
    else:
        w.setFixedSize(1024, 600); w.show()
    sys.exit(app.exec())
