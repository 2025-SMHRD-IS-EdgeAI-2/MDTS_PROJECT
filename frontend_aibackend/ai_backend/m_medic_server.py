from __future__ import annotations

import json
import os
import re
import shutil
import sys
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
import torch
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mysql.connector import Error as MySQLError
from mysql.connector import pooling

from typing import Annotated
from fastapi import Query

# ─── Jetson torch compatibility patch (edge 환경 호환) ───────────────────────
if not hasattr(torch, "distributed"):
    class DummyTorchDistributed:
        @staticmethod
        def is_initialized() -> bool:
            return False

    torch.distributed = DummyTorchDistributed()
elif not hasattr(torch.distributed, "is_initialized"):
    torch.distributed.is_initialized = lambda: False

# ─── 모듈 경로 설정 ───────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
INTEGRATED_DIR = BASE_DIR / "M_MEDIC_v2" / "04_integrated_system"
if not INTEGRATED_DIR.exists():
    INTEGRATED_DIR = BASE_DIR.parent / "M_MEDIC_v2" / "04_integrated_system"
sys.path.append(str(BASE_DIR))
sys.path.append(str(INTEGRATED_DIR))

# ─── DB 설정 (MariaDB) ─────────────────────────────────────────────────────
REMOTE_DB_CONFIG = {
    "host": os.getenv("MDTS_REMOTE_DB_HOST", "YOUR_REMOTE_DB_HOST"),
    "port": int(os.getenv("MDTS_REMOTE_DB_PORT", "3307")),
    "user": os.getenv("MDTS_REMOTE_DB_USER", "MDTS"),
    "password": os.getenv("MDTS_REMOTE_DB_PASSWORD", "YOUR_DB_PASSWORD"),
    "database": os.getenv("MDTS_REMOTE_DB_NAME", "MDTS"),
    "connect_timeout": 10,
}

LOCAL_DB_CONFIG = {
    "host": os.getenv("MDTS_LOCAL_DB_HOST", "YOUR_RPI_HOST"),
    "port": int(os.getenv("MDTS_LOCAL_DB_PORT", "3306")),
    "user": os.getenv("MDTS_LOCAL_DB_USER", "mdts"),
    "password": os.getenv("MDTS_LOCAL_DB_PASSWORD", "YOUR_DB_PASSWORD"),
    "database": os.getenv("MDTS_LOCAL_DB_NAME", "MDTS"),
    "connect_timeout": 10,
}


def _create_pool(name: str, config: Dict[str, Any]) -> Optional[pooling.MySQLConnectionPool]:
    try:
        return pooling.MySQLConnectionPool(pool_name=name, pool_size=3, **config)
    except Exception as exc:
        print(f"[!] DB pool init failed for {name}: {exc}")
        return None


_remote_pool = _create_pool("remote_pool", REMOTE_DB_CONFIG)
_local_pool = _create_pool("local_pool", LOCAL_DB_CONFIG)


def _get_connection(pool: Optional[pooling.MySQLConnectionPool]):
    if pool is None:
        return None
    try:
        return pool.get_connection()
    except Exception as exc:
        print(f"[!] Failed to get db connection: {exc}")
        return None


def _fetch_one(pool: Optional[pooling.MySQLConnectionPool], query: str, params=()) -> Optional[Dict[str, Any]]:
    conn = _get_connection(pool)
    if conn is None:
        return None

    try:
        with closing(conn.cursor(dictionary=True)) as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()
    except MySQLError as exc:
        print(f"[!] SQL fetch_one failed: {exc}")
        return None
    finally:
        conn.close()


def _fetch_all(pool: Optional[pooling.MySQLConnectionPool], query: str, params=()) -> list[Dict[str, Any]]:
    conn = _get_connection(pool)
    if conn is None:
        return []

    try:
        with closing(conn.cursor(dictionary=True)) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
    except MySQLError as exc:
        print(f"[!] SQL fetch_all failed: {exc}")
        return []
    finally:
        conn.close()


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return int(value)
        text = str(value).strip()
        if not text or text == "-":
            return default
        return int(float(text))
    except (TypeError, ValueError):
        return default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        text = str(value).strip()
        if not text or text == "-":
            return default
        return float(text)
    except (TypeError, ValueError):
        return default


def _safe_json(raw: Any) -> Dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def _safe_text(value: Any, default: str = "-") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _safe_display_value(value: Any, default: str = "-") -> str:
    return _safe_text(value, default=default)


def _safe_vital_display(value: Any, default: str = "미측정") -> str:
    text = _safe_text(value, default="")
    if text in ("", "-", "--/--", "0", "0.0", "None", "none", "null"):
        return default
    return text


def _extract_patient_name(patient_data: Dict[str, Any], fallback_name: Optional[str] = None) -> str:
    for key in ("name", "patient_name", "patientName", "fullName", "full_name", "crew_name"):
        if key in patient_data:
            candidate = _safe_text(patient_data.get(key), default="")
            if candidate:
                return candidate

    crew_block = patient_data.get("crew")
    if isinstance(crew_block, dict):
        for key in ("name", "full_name", "fullName", "crew_name"):
            candidate = _safe_text(crew_block.get(key), default="")
            if candidate:
                return candidate

    if fallback_name:
        return fallback_name
    return ""


def _extract_vitals(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}

    systolic = 0
    diastolic = 0
    raw_bp = _safe_text(payload.get("blood_pressure") or payload.get("bp") or payload.get("pressure"), default="-")
    normalized_bp = raw_bp.replace(" ", "").replace("mmHg", "").replace("MMHG", "")
    if "/" in normalized_bp:
        bp_parts = normalized_bp.split("/")
        if len(bp_parts) == 2:
            systolic = _to_int(bp_parts[0], 0)
            diastolic = _to_int(bp_parts[1], 0)

    return {
        "heart_rate": _to_int(payload.get("heart_rate", payload.get("hr", payload.get("pulse", 0))), 0),
        "spo2": _to_int(payload.get("spo2", payload.get("SpO2", payload.get("o2", 0))), 0),
        "respiration_rate": _to_int(
            payload.get("respiration_rate", payload.get("rr", payload.get("resp", 0))),
            0,
        ),
        "blood_pressure": normalized_bp,
        "systolic": systolic,
        "diastolic": diastolic,
        "temperature": _to_float(payload.get("temperature", payload.get("temp", 0.0)), 0.0),
        "measured_at": _safe_text(payload.get("measured_at"), default=""),
    }


def _merge_vitals(primary: Dict[str, Any], secondary: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(secondary)
    for key, value in primary.items():
        if value not in (0, "0", "-", "", None):
            merged[key] = value
    return merged


def _assess_vital_status(vitals: Dict[str, Any]) -> Tuple[str, List[str], List[str]]:
    # 정량 규칙 기반 판정: O(1) (항목 수 고정).
    status_items: List[str] = []
    trend_lines: List[str] = []
    issue_count = 0
    warning_count = 0

    heart_rate = _to_int(vitals.get("heart_rate"), 0)
    if heart_rate > 0:
        if heart_rate >= 130 or heart_rate <= 40:
            status_items.append(f"심박수 {heart_rate} bpm: 중증 이상(긴급 조치 필요)")
            issue_count += 1
        elif heart_rate >= 110 or heart_rate <= 55:
            status_items.append(f"심박수 {heart_rate} bpm: 주의(모니터링 필요)")
            warning_count += 1

    spo2 = _to_int(vitals.get("spo2"), 0)
    if spo2 > 0:
        if spo2 < 90:
            status_items.append(f"산소포화도 {spo2}%: 저산소증 위험")
            issue_count += 1
        elif spo2 < 94:
            status_items.append(f"산소포화도 {spo2}%: 경도 저하")
            warning_count += 1

    respiration = _to_int(vitals.get("respiration_rate"), 0)
    if respiration > 0:
        if respiration >= 30 or respiration <= 8:
            status_items.append(f"호흡수 {respiration}회/분: 중증 호흡수치")
            issue_count += 1
        elif respiration >= 24 or respiration <= 10:
            status_items.append(f"호흡수 {respiration}회/분: 주의 필요")
            warning_count += 1

    blood_pressure = _safe_text(vitals.get("blood_pressure"), default="")
    systolic = _to_int(vitals.get("systolic"), 0)
    diastolic = _to_int(vitals.get("diastolic"), 0)
    if blood_pressure and blood_pressure != "-":
        if systolic >= 180 or systolic <= 80 or (diastolic and diastolic >= 110):
            status_items.append(f"혈압 {blood_pressure}: 즉시 조치 필요")
            issue_count += 1
        elif systolic >= 160 or systolic <= 90 or (diastolic and diastolic >= 100):
            status_items.append(f"혈압 {blood_pressure}: 경도 위험")
            warning_count += 1

    temperature = _to_float(vitals.get("temperature"), 0.0)
    if temperature > 0:
        if temperature >= 39.0 or temperature <= 35.0:
            status_items.append(f"체온 {temperature:.1f}°C: 중증 열/저체온 위험")
            issue_count += 1
        elif temperature >= 38.0:
            status_items.append(f"체온 {temperature:.1f}°C: 발열")
            warning_count += 1

    has_valid_measurement = any(
        [
            heart_rate > 0,
            spo2 > 0,
            respiration > 0,
            bool(blood_pressure and blood_pressure not in ("-", "--/--")),
            temperature > 0,
        ]
    )
    if not has_valid_measurement:
        return "측정값 없음", ["현재 유효한 바이탈 측정값 없음"], trend_lines

    if issue_count > 0:
        return "이상 소견 확인", status_items, trend_lines
    if warning_count > 0:
        return "주의", status_items, trend_lines
    return "정상 범위", ["현재 수치 모두 기준 내",], trend_lines


def _format_vitals(vitals: Dict[str, Any]) -> List[str]:
    return [
        f"심박수: {_safe_vital_display(vitals.get('heart_rate'))}",
        f"산소포화도: {_safe_vital_display(vitals.get('spo2'))}",
        f"호흡수: {_safe_vital_display(vitals.get('respiration_rate'))}",
        f"혈압: {_safe_vital_display(vitals.get('blood_pressure'))}",
        f"체온: {_safe_vital_display(vitals.get('temperature'))}",
    ]


def _has_valid_vital_measurement(vitals: Dict[str, Any]) -> bool:
    return any(
        [
            _to_int(vitals.get("heart_rate"), 0) > 0,
            _to_int(vitals.get("spo2"), 0) > 0,
            _to_int(vitals.get("respiration_rate"), 0) > 0,
            _safe_text(vitals.get("blood_pressure"), default="") not in ("", "-", "--/--", "0", "0.0"),
            _to_float(vitals.get("temperature"), 0.0) > 0,
        ]
    )


def _normalize_crew_id(raw_value: Any) -> Optional[int]:
    value = _to_int(raw_value, 0)
    return value if value > 0 else None


def get_live_vital_by_crew(crew_id: Optional[int]) -> Optional[Dict[str, Any]]:
    if crew_id:
        query = (
            "SELECT * FROM tb_vital WHERE crew_id = %s "
            "ORDER BY measured_at DESC LIMIT 1"
        )
        row = _fetch_one(_remote_pool, query, (crew_id,))
    else:
        row = _fetch_one(_remote_pool, "SELECT * FROM tb_vital ORDER BY measured_at DESC LIMIT 1", ())

    if not row:
        return None

    return {
        "crew_id": row.get("crew_id"),
        "heart_rate": _to_int(row.get("heart_rate"), 0),
        "spo2": _to_int(row.get("spo2"), 0),
        "respiration_rate": _to_int(row.get("respiration_rate"), 0),
        "blood_pressure": row.get("blood_pressure") or "--/--",
        "temperature": _to_float(row.get("temperature"), 0.0),
        "measured_at": str(row.get("measured_at")) if row.get("measured_at") else None,
    }


def _extract_crew_id(patient_data: Dict[str, Any]) -> Optional[int]:
    for key in ("crew_id", "crewId", "crewDbId", "id"):
        if key in patient_data:
            crew_id = _normalize_crew_id(patient_data.get(key))
            if crew_id:
                return crew_id
    return None


def get_patient_history_records(name: Optional[str], limit: int = 10) -> List[Dict[str, Any]]:
    if not name:
        return []

    return _fetch_all(
        _local_pool,
        (
            "SELECT * FROM tb_patient_history WHERE name = %s "
            "ORDER BY created_at DESC LIMIT %s"
        ),
        (name, _to_int(limit, 10)),
    )


def get_crew_context_by_id(crew_id: Optional[int], name: Optional[str]) -> Optional[Dict[str, Any]]:
    if crew_id:
        row = _fetch_one(_remote_pool, "SELECT * FROM tb_crew WHERE crew_id = %s LIMIT 1", (crew_id,))
        if row:
            return row

    if name:
        row = _fetch_one(_remote_pool, "SELECT * FROM tb_crew WHERE name = %s LIMIT 1", (name,))
        return row
    return None


def get_patient_history(name: Optional[str], limit: int = 10) -> str:
    rows = get_patient_history_records(name, limit=limit)
    if not rows:
        return "과거 진료 기록 없음"

    records = []
    for row in rows:
        records.append(
            "- [{timestamp}] BP: {blood_pressure}, HR: {heart_rate}, RR: {respiration_rate}, Temp: {temperature} | "
            "진단: {diagnosis} | 참고: {notes}".format(
                timestamp=row.get("created_at"),
                blood_pressure=row.get("blood_pressure") or "--/--",
                heart_rate=_to_int(row.get("heart_rate"), 0),
                respiration_rate=_to_int(row.get("respiration_rate"), 0),
                temperature=_to_float(row.get("temperature"), 0.0),
                diagnosis=row.get("diagnosis") or "정보 없음",
                notes=row.get("notes") or "",
            )
        )
    return "\n".join(records)


def _format_history(records: List[Dict[str, Any]]) -> str:
    if not records:
        return "과거 진료 기록 없음"

    lines = []
    for row in records[:5]:
        lines.append(
            "- [{timestamp}] BP:{blood_pressure} HR:{heart_rate} RR:{respiration_rate} Temp:{temperature} | "
            "진단:{diagnosis} | 참고:{notes}".format(
                timestamp=row.get("created_at"),
                blood_pressure=row.get("blood_pressure") or "--/--",
                heart_rate=_to_int(row.get("heart_rate"), 0),
                respiration_rate=_to_int(row.get("respiration_rate"), 0),
                temperature=_to_float(row.get("temperature"), 0.0),
                diagnosis=row.get("diagnosis") or "정보 없음",
                notes=row.get("notes") or "-",
            )
        )
    return "\n".join(lines)


FORBIDDEN_KNOWLEDGE_OUTPUT_FRAGMENTS = (
    "데이터셋",
    "dataset",
    "kaggle",
    "wound segmentation",
    "skin wound detection",
    "우선순위",
    "순위:",
    "2순위",
    "1순위",
    "모델 정보",
    "학습 완료",
    "보강 데이터",
    "classification report",
    "generate_team_report",
    "source_type=",
    "source=",
    "distance=",
    "score=",
    "markdown 파일",
    "lastwritetime",
    "db 컬럼",
    "컬럼 정의",
    "erd",
    "테이블명",
    "분석 활용 방법",
    "프로젝트 핵심",
    "프론트엔드",
    "백엔드",
    "github",
    "react",
    "vite",
    "jsx",
)

DISALLOWED_CJK_PATTERN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def _contains_disallowed_cjk(text: str) -> bool:
    """중국어/일본어 한자 계열 문자가 사용자 답변에 섞이는 것을 차단한다."""
    return bool(DISALLOWED_CJK_PATTERN.search(text or ""))


def _is_forbidden_knowledge_line(line: str) -> bool:
    """RAG 내부 문서/학습 데이터 메타정보가 사용자 답변에 노출되는 것을 차단한다."""
    lowered = line.lower()
    if _contains_disallowed_cjk(line):
        return True
    if any(fragment in lowered for fragment in FORBIDDEN_KNOWLEDGE_OUTPUT_FRAGMENTS):
        return True
    if re.match(r"^\s*\d+\s*순위\s*[:：]", line):
        return True
    return False


def _clean_markdown_context(content: str) -> str:
    cleaned_lines: List[str] = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _is_forbidden_knowledge_line(line):
            continue
        if line.count("|") >= 3:
            continue
        if re.fullmatch(r"[-:\s|]+", line):
            continue
        if len(line) > 360:
            line = line[:360]
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def _is_obsidian_medical_candidate(file_path: Path, content: str) -> bool:
    filename = file_path.name.lower()
    excluded_tokens = (
        "table_",
        "table-",
        "project_",
        "project-",
        "handover",
        "handoff",
        "gemini",
        "readme",
        "working_memory",
        "state_log",
        "map",
        "guide",
        "specification",
        "definition",
        "analysis_report",
    )
    if any(token in filename for token in excluded_tokens):
        return False

    lowered = content.lower()
    development_tokens = (
        "emergency.jsx",
        "isburntimeractive",
        "timeline_summary",
        "bug",
        "버그",
        "즉시 수정 필요",
        "위치:",
        "react",
        "vite",
        "jsx",
        "component",
        "컴포넌트",
        "frontend",
        "backend",
        "localhost",
        "npm ",
        "api server",
        "프로토콜 버튼",
    )
    if any(token in lowered for token in development_tokens):
        return False

    medical_tokens = (
        "응급",
        "처치",
        "환자",
        "의료",
        "바이탈",
        "심박",
        "산소포화도",
        "호흡",
        "혈압",
        "체온",
        "외상",
        "상처",
        "출혈",
        "골절",
        "디스크",
        "척추",
        "허리",
        "이송",
        "통증",
        "쇼크",
        "cpr",
        "triage",
    )
    return any(token in lowered for token in medical_tokens)


def _extract_search_terms(query: str) -> List[str]:
    normalized = query.lower()
    for char in "()[]{}.,!?;:/\\|\"'`~@#$%^&*+=\n\r\t":
        normalized = normalized.replace(char, " ")

    stopwords = {
        "현재",
        "환자",
        "대상자",
        "어떻게",
        "무엇",
        "확인",
        "정리",
        "알려줘",
        "분석",
        "주의사항은",
        "방법은",
        "기록",
        "기록해줘",
    }
    terms: List[str] = []
    for raw_term in normalized.split():
        term = raw_term.strip()
        if len(term) >= 2 and term not in stopwords and term not in terms:
            terms.append(term)

    synonyms = {
        "허리디스크": ["디스크", "추간판", "요추", "척추", "허리", "이동", "고정"],
        "디스크": ["허리디스크", "추간판", "요추", "척추", "허리"],
        "바이탈": ["심박수", "산소포화도", "호흡수", "혈압", "체온", "vital"],
        "이상": ["응급", "위험", "저산소증", "쇼크", "발열"],
        "타임라인": ["상황", "대응", "기록", "로그", "시간"],
        "외상": ["상처", "출혈", "골절", "찰과상", "열상"],
    }
    for key, values in synonyms.items():
        if key in normalized:
            for value in values:
                if value not in terms:
                    terms.append(value)

    return terms[:24]


def _iter_markdown_files(directory: Path, max_files: int = 350) -> List[Path]:
    if not directory.exists() or not directory.is_dir():
        return []

    ignored_dirs = {".git", "node_modules", "dist", "build", ".venv", "venv", "__pycache__"}
    files: List[Path] = []
    for root, dirs, filenames in os.walk(directory):
        dirs[:] = [dirname for dirname in dirs if dirname not in ignored_dirs]
        for filename in filenames:
            if filename.lower().endswith(".md"):
                files.append(Path(root) / filename)
                if len(files) >= max_files:
                    return files
    return files


def _obsidian_candidate_dirs() -> List[Path]:
    raw_candidates = [
        os.getenv("MDTS_OBSIDIAN_DIR", ""),
        str(BASE_DIR / "memory"),
        str(BASE_DIR.parent / "memory"),
        str(BASE_DIR.parent.parent / "memory"),
        str(BASE_DIR.parent.parent / "02_ai_backend"),
        str(BASE_DIR.parent.parent / "02_ai_backend" / "M_MEDIC_v2"),
        str(BASE_DIR.parent.parent / "02_ai_backend" / "frontend_integration"),
    ]

    candidates: List[Path] = []
    seen = set()
    for raw_path in raw_candidates:
        if not raw_path:
            continue
        path = Path(raw_path).expanduser()
        try:
            resolved = path.resolve()
        except Exception:
            continue
        if resolved.exists() and resolved.is_dir() and str(resolved) not in seen:
            seen.add(str(resolved))
            candidates.append(resolved)
    return candidates


def _score_obsidian_doc(title: str, content: str, terms: List[str]) -> int:
    title_lower = title.lower()
    content_lower = content.lower()
    score = 0
    for term in terms:
        if term in title_lower:
            score += 8
        count = content_lower.count(term)
        if count:
            score += min(count, 8)
    return score


def _extract_obsidian_snippet(content: str, terms: List[str], limit: int = 480) -> str:
    normalized = " ".join(content.split())
    lowered = normalized.lower()
    positions = [lowered.find(term) for term in terms if term and lowered.find(term) >= 0]
    start = max(0, min(positions) - 180) if positions else 0
    snippet = normalized[start:start + limit].strip()
    return snippet


def search_obsidian_mcp_notes(query: str, max_results: int = 3) -> str:
    terms = _extract_search_terms(query)
    if not terms:
        return ""

    scored: List[Tuple[int, float, str, str]] = []
    for base_dir in _obsidian_candidate_dirs():
        for file_path in _iter_markdown_files(base_dir):
            try:
                raw_content = file_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            content = _clean_markdown_context(raw_content)
            if not content.strip():
                continue
            if not _is_obsidian_medical_candidate(file_path, content):
                continue

            score = _score_obsidian_doc(file_path.name, content, terms)
            if score <= 0:
                continue

            try:
                source_name = str(file_path.relative_to(base_dir)).replace("\\", "/")
            except ValueError:
                source_name = file_path.name

            snippet = _extract_obsidian_snippet(content, terms)
            scored.append((score, file_path.stat().st_mtime, source_name, snippet))

    if not scored:
        return ""

    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    outputs = []
    for score, _, source_name, snippet in scored[:max_results]:
        outputs.append(f"[Obsidian MCP Markdown: source={source_name}, score={score}]\n{snippet}")
    return "\n\n".join(outputs)


def _build_general_protocol_context(query: str) -> str:
    lowered = query.lower()
    contexts: List[str] = []

    if any(term in lowered for term in ("허리디스크", "디스크", "요추", "척추", "허리", "이동")):
        contexts.append(
            "척추/허리 손상 또는 허리디스크 환자 이동 일반 원칙: 통증 악화 자세를 피하고, 척추 중립 자세를 유지하며, "
            "몸통을 비틀지 않는다. 가능한 경우 2명 이상이 어깨-골반-다리를 같은 축으로 맞춰 천천히 이동한다. "
            "하지 감각저하, 마비, 대소변 조절 이상, 극심한 방사통이 있으면 불필요한 이동을 중지하고 즉시 상급 의료 자문을 요청한다."
        )

    if any(term in lowered for term in ("바이탈", "심박", "산소포화도", "호흡수", "혈압", "체온", "이상")):
        contexts.append(
            "바이탈 판정 일반 원칙: 심박수 0, 산소포화도 0, 호흡수 0은 생체 수치가 아니라 미측정 또는 미전송으로 우선 해석한다. "
            "SpO2 95~100%는 일반적으로 정상 범위이며, 94% 미만은 재측정과 호흡 상태 확인이 필요하다. "
            "급격한 변화는 단일 수치보다 이전 측정값과의 변화폭, 증상, 의식상태를 함께 본다."
        )

    if any(term in lowered for term in ("타임라인", "상황", "기록", "로그")):
        contexts.append(
            "타임라인 답변 원칙: 실제 DB 또는 화면에서 전달된 이벤트만 시간순으로 정리한다. 전달되지 않은 사건은 추정하지 않는다."
        )

    if any(term in lowered for term in ("응급처치", "응급 처치", "처치 가이드", "가이드", "first aid")):
        contexts.append(
            "응급처치 가이드 작성 일반 원칙: 환자 의식, 호흡, 대량출혈, 외상 종류, 화상, 골절, 통증 위치, 바이탈을 먼저 확인한다. "
            "구체 손상 유형이 없으면 임의 처치를 단정하지 말고 공통 초기평가, 안전 확보, 재측정, 상급기관 연결 기준을 기록한다. "
            "개발 문서나 시스템 버그 기록은 응급처치 가이드 근거로 사용하지 않는다."
        )

    return "\n".join(contexts)


def _classify_query_intent(query: str) -> str:
    lowered = query.lower()
    if any(term in lowered for term in ("혈액형", "bloodtype", "blood type")):
        return "patient_fact_lookup"
    if any(term in lowered for term in ("응급처치", "응급 처치", "처치 가이드", "응급 가이드", "first aid")):
        return "first_aid_guide"
    if "가이드" in lowered and any(term in lowered for term in ("기록", "작성", "알려", "정리")):
        return "first_aid_guide"
    if any(term in lowered for term in ("타임라인", "상황", "기록", "로그")):
        return "timeline_summary"
    if any(term in lowered for term in ("바이탈", "심박", "산소포화도", "호흡수", "혈압", "체온", "이상")):
        return "vital_analysis"
    if any(term in lowered for term in ("허리디스크", "디스크", "요추", "척추", "허리", "이동")):
        return "movement_precaution"
    if any(term in lowered for term in ("외상", "상처", "출혈", "골절", "촬영")):
        return "wound_or_trauma"
    return "medical_question"


def _sanitize_ai_reply(ai_reply: str) -> str:
    if not ai_reply:
        return ""

    blocked_fragments = (
        "chromadb",
        "obsidian mcp",
        "markdown",
        "source=",
        "score=",
        "distance=",
        "출력 규칙",
        "중요 지시",
        "질문 의도",
        "반드시 우선 반영",
        "위험 소견으로 쓰지 않습니다",
        "분석 활용 방법",
        "tb_vital",
        "tb_analysis",
        "tb_firstaid",
        "tb_logs",
        "mdts/m-medic",
        "edge ai 의료 지원 시스템",
        "컬럼",
        "auto_increment",
        "이 사람의 이름",
        "바이탈 이상 여부는 0",
        "ai 판단 정확도",
        "실제 처치 간의 일치도",
        "위험 등급별",
        "데이터 기반으로 수립",
        "승조원 특성",
        "상관관계",
        "직책",
        "연령대",
        "timeline_summary",
        "시각화된",
        "emergency.jsx",
        "isburntimeractive",
        "프로토콜 버튼",
        "버그",
        "즉시 수정 필요",
        "frontend",
        "backend",
        "react",
        "vite",
        "jsx",
    )

    clean_lines: List[str] = []
    for raw_line in ai_reply.replace("\r\n", "\n").split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if _contains_disallowed_cjk(line):
            continue
        if _is_forbidden_knowledge_line(line):
            continue
        if line.count("|") >= 2:
            continue

        line = re.sub(r"`([^`]*)`", r"\1", line)
        line = line.replace("**", "").replace("__", "").replace("*", "")
        line = re.sub(r"^\s*\d+[.)]\s*", "", line)
        line = re.sub(r"^\s*[-•]\s*", "", line)
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue

        lowered = line.lower()
        if any(fragment in lowered for fragment in blocked_fragments):
            continue
        if line in clean_lines:
            continue

        clean_lines.append(line)
        if len(clean_lines) >= 5:
            break

    return "\n".join(clean_lines)[:900].strip()


def _default_reply_for_intent(query_intent: str, overall_status: str, vital_issues: List[str]) -> str:
    if query_intent == "emergency_deterioration":
        return "\n".join(
            [
                "판단: 응급 상태 악화는 의식 저하, 호흡곤란, 산소포화도 저하, 혈압 급변, 심박 급상승 또는 급저하, 대량출혈, 청색증, 통증 급격 악화로 확인합니다.",
                "근거: 단일 수치보다 이전 측정값과 현재 증상 변화가 함께 악화될 때 위험도가 높습니다.",
                "조치: 의식, 호흡, SpO2, 심박수, 혈압, 체온, 출혈 여부를 같은 순서로 재확인하고 이상 소견이 있으면 즉시 상급기관에 연결합니다.",
                "재확인: 30초 간격으로 같은 센서 위치에서 다시 측정해 일시적 접촉 오류와 실제 악화를 구분합니다.",
            ]
        )
    if query_intent == "vital_analysis":
        if overall_status == "측정값 없음":
            return "\n".join(
                [
                    "판단: 현재 유효한 바이탈 측정값이 없습니다.",
                    "근거: 센서값이 0 또는 미측정으로 들어와 실제 이상 여부를 판정할 수 없습니다.",
                    "조치: 센서 접촉 상태와 데이터 전송 상태를 확인한 뒤 다시 측정합니다.",
                    "재확인: 실제 심박수, 산소포화도, 호흡수, 체온 값이 들어오는지 확인합니다.",
                ]
            )
        issue_text = ", ".join(vital_issues) if vital_issues else "현재 전달된 측정값 기준 즉시 이상 소견 없음"
        return "\n".join(
            [
                f"판단: {overall_status}",
                f"근거: {issue_text}",
                "조치: 센서 접촉 상태를 확인하고 30초 뒤 재측정합니다.",
                "재확인: 산소포화도 94% 미만, 심박 급상승, 호흡곤란, 의식저하가 있으면 즉시 상급기관에 연결합니다.",
            ]
        )
    if query_intent == "movement_precaution":
        return "\n".join(
            [
                "판단: 허리디스크 또는 척추 통증 환자는 몸통 비틀림을 피해야 합니다.",
                "조치: 어깨, 골반, 다리를 같은 축으로 유지하고 2명 이상이 천천히 이동합니다.",
                "재확인: 다리 감각저하, 마비, 대소변 조절 이상, 극심한 방사통이 있으면 이동을 중지합니다.",
            ]
        )
    if query_intent == "first_aid_guide":
        return "\n".join(
            [
                "판단: 현재 요청은 응급처치 가이드 기록 요청입니다.",
                "근거: 구체적인 손상 유형이 전달되지 않아 공통 초기평가 기준으로 기록합니다.",
                "조치: 현장 안전 확보, 의식과 호흡 확인, 대량출혈 여부 확인, 바이탈 재측정을 순서대로 진행합니다.",
                "재확인: 출혈, 화상, 골절, 호흡곤란, 의식저하 중 해당 증상이 확인되면 해당 처치 프로토콜로 전환합니다.",
            ]
        )
    if query_intent == "timeline_summary":
        return "\n".join(
            [
                "판단: 전달된 타임라인 기록만 기준으로 정리해야 합니다.",
                "재확인: 화면 또는 DB에 저장된 이벤트가 없으면 임의 사건을 추가하지 않습니다.",
            ]
        )
    return "\n".join(
        [
            "판단: 현재 확인된 정보만으로 우선 안내합니다.",
            "조치: 증상, 바이탈, 발생 시간, 의식 상태를 함께 확인합니다.",
            "재확인: 증상이 악화되거나 측정값이 급변하면 상급기관 컨설트를 요청합니다.",
        ]
    )


def _format_patient_fact_lookup_reply(
    patient_name: str,
    patient_data: Dict[str, Any],
    merged_vitals: Dict[str, Any],
    db_crew: Optional[Dict[str, Any]],
) -> str:
    """DB 사실 조회성 질문은 LLM 추론 없이 MariaDB 최신값을 그대로 요약한다."""
    blood_type = "-"
    if isinstance(db_crew, dict):
        blood_type = _safe_text(db_crew.get("bloodtype"), default="-")
    if blood_type == "-":
        blood_type = _safe_text(
            patient_data.get("blood") or patient_data.get("bloodtype") or patient_data.get("bloodType"),
            default="-",
        )

    blood_pressure = _safe_text(merged_vitals.get("blood_pressure"), default="-")
    systolic = _to_int(merged_vitals.get("systolic"), 0)
    diastolic = _to_int(merged_vitals.get("diastolic"), 0)
    measured_at = _safe_text(merged_vitals.get("measured_at"), default="")

    bp_note = ""
    if blood_pressure not in ("", "-", "--/--", "0"):
        if systolic <= 0 or diastolic <= 0 or systolic > 260 or diastolic > 160 or diastolic >= systolic:
            bp_note = "이 혈압값은 측정 오류 가능성이 높아 센서 접촉 상태 확인 후 재측정이 필요합니다."
        elif systolic >= 140 or diastolic >= 90:
            bp_note = "고혈압 범위이므로 안정 상태에서 재측정이 필요합니다."
        else:
            bp_note = "현재 DB 기준으로 즉시 위험 범위는 아닙니다."
    else:
        bp_note = "현재 유효한 혈압 측정값이 없습니다."

    lines = [
        f"대상자: {patient_name or '미확인'}",
        f"현재 혈압: {blood_pressure if blood_pressure else '-'}",
        f"혈액형: {blood_type}",
        f"확인: {bp_note}",
    ]
    if measured_at:
        lines.append(f"기준 시각: {measured_at}")
    return "\n".join(lines)


def _format_dashboard_reply(
    patient_name: str,
    query_intent: str,
    overall_status: str,
    vital_issues: List[str],
    merged_vitals: Dict[str, Any],
    medical_history: str,
    ai_reply: str,
) -> str:
    lines = [f"대상자: {patient_name or '미확인'}"]

    if query_intent == "vital_analysis":
        lines.append(f"상태: {overall_status}")
        if _has_valid_vital_measurement(merged_vitals):
            lines.append(f"바이탈: {' | '.join(_format_vitals(merged_vitals))}")
        else:
            lines.append("바이탈: 현재 유효한 측정값 없음")
        lines.append(f"이상 징후: {', '.join(vital_issues) if vital_issues else '없음'}")

    lines.append(f"과거 진료: {'없음' if medical_history == '과거 진료 기록 없음' else '있음'}")

    clean_reply = _sanitize_ai_reply(ai_reply)
    if not clean_reply:
        clean_reply = _default_reply_for_intent(query_intent, overall_status, vital_issues)

    return "\n".join([*lines, "", clean_reply])


def _compose_rag_context(query: str) -> str:
    sections: List[str] = []

    chroma_context = _clean_markdown_context(knowledge_engine.search_relevant_docs(query, k=2) or "")
    if chroma_context:
        sections.append("[ChromaDB Vector RAG]\n" + chroma_context)

    obsidian_context = _clean_markdown_context(search_obsidian_mcp_notes(query, max_results=2) or "")
    if obsidian_context:
        sections.append("[Obsidian MCP Source Search]\n" + obsidian_context)

    protocol_context = _build_general_protocol_context(query)
    if protocol_context:
        sections.append("[General Emergency Protocol]\n" + protocol_context)

    if not sections:
        return "관련 ChromaDB RAG/Obsidian MCP 근거가 없습니다. 일반 응급 원칙과 추가 확인 필요 항목을 분리해 답변합니다."
    return "\n\n".join(sections)


# ─── AI 엔진 초기화 ────────────────────────────────────────────────────────
try:
    from m_medic_v2 import diagnose_wound, load_wound_model
    from m_medic_llm_handler import MaritimeMedicLLM
    from m_medic_knowledge_engine import MedicalKnowledgeEngine
except ImportError as exc:
    print(f"[!] Module import failed: {exc}")
    sys.exit(1)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ollama_host_env = os.getenv("MDTS_OLLAMA_HOST", "").strip() or os.getenv("OLLAMA_HOST", "").strip()
if ollama_host_env:
    OLLAMA_HOST = (
        ollama_host_env
        .replace("http://", "")
        .replace("https://", "")
        .split("/")[0]
        .split(":")[0]
    )
else:
    OLLAMA_HOST = "127.0.0.1"

OLLAMA_PORT = int(os.getenv("MDTS_OLLAMA_PORT", os.getenv("OLLAMA_PORT", "11434")))
llm_handler = MaritimeMedicLLM(host=OLLAMA_HOST, port=OLLAMA_PORT)

ollama_host_only = OLLAMA_HOST
ollama_embed_url = f"http://{ollama_host_only}:{OLLAMA_PORT}/api/embeddings"
knowledge_engine = MedicalKnowledgeEngine(
    embed_url=os.getenv("MDTS_EMBED_URL", ollama_embed_url),
    auto_sync_obsidian=os.getenv("MDTS_OBSIDIAN_AUTO_SYNC", "0") == "1",
    obsidian_dir=os.getenv("MDTS_OBSIDIAN_DIR", ""),
    obsidian_sync_seconds=int(os.getenv("MDTS_OBSIDIAN_SYNC_SEC", "180")),
)

# 모델 로드 (Jetson / CUDA 캐시 제한)
try:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, model_loaded, wound_classes = load_wound_model(device)
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
except Exception as exc:
    model_loaded = False
    model = None
    wound_classes = []
    print(f"[!] Wound model load failed: {exc}")

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

AI_OFFLINE_REPLY = "AI가 동작하고 있지 않습니다.\nJetson Nano의 Ollama를 실행한 뒤 다시 질문하세요."


def _is_ollama_available() -> bool:
    try:
        response = requests.get(f"http://{OLLAMA_HOST}:{OLLAMA_PORT}/api/tags", timeout=2.5)
        return response.status_code == 200
    except requests.RequestException:
        return False


@app.get("/vitals/live")
async def get_live_vitals(crew_id: Annotated[Optional[int], Query(alias="crew_id")] = None):
    """
    실시간 바이탈은 요청 시 MariaDB(tb_vital)에서 직접 조회합니다.
    """
    payload = get_live_vital_by_crew(_normalize_crew_id(crew_id))
    if payload:
        payload["status"] = "success"
        return payload
    return {"status": "empty"}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": bool(model_loaded),
        "remote_db_connected": _remote_pool is not None,
        "local_db_connected": _local_pool is not None,
        "device": str(device if "device" in globals() else "cpu"),
    }


@app.post("/analyze/wound")
async def analyze_wound(
    file: UploadFile = File(...),
    age: float = Form(45.0),
    gender: str = Form("unknown"),
):
    if model is None:
        return JSONResponse(status_code=500, content={"status": "error", "message": "Model not loaded"})

    temp_path = UPLOAD_DIR / file.filename
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        result = diagnose_wound(str(temp_path), model, device, wound_classes)
        advice = llm_handler.generate_medical_advice(
            result.get("name", "알 수 없는 상처"),
            result.get("risk", "UNKNOWN"),
            result.get("action", "기본 조치 필요"),
        )
        return {
            "status": "success",
            "diagnosis": result.get("name"),
            "confidence": f"{result.get('confidence', 0):.1f}%",
            "risk": result.get("risk"),
            "base_action": result.get("action"),
            "law_ref": result.get("law_ref"),
            "ai_deep_advice": advice,
            "timestamp": result.get("timestamp"),
        }
    except Exception as exc:
        print(f"[AnzlyzeWound Error] {exc}")
        return {"status": "error", "message": str(exc)}


@app.post("/analyze/chat")
async def analyze_chat(
    query: str = Form(...),
    patient_data: str = Form(...),
    vitals: str = Form(...),
):
    if not query.strip():
        return JSONResponse(status_code=400, content={"reply": "요청이 비어 있습니다."})

    if not _is_ollama_available():
        return {"reply": AI_OFFLINE_REPLY}

    p_info = _safe_json(patient_data)
    v_info = _safe_json(vitals)

    crew_id = _extract_crew_id(p_info)
    db_crew = get_crew_context_by_id(crew_id, None)
    patient_name = _extract_patient_name(p_info, fallback_name=db_crew.get("name") if isinstance(db_crew, dict) else None)
    db_vitals = get_live_vital_by_crew(crew_id)
    live_vitals = _extract_vitals(db_vitals or {})
    ui_vitals = _extract_vitals(v_info)
    merged_vitals = _merge_vitals(live_vitals, ui_vitals)
    merged_vitals["patient_name"] = patient_name

    if db_crew:
        p_info.setdefault("blood", db_crew.get("bloodtype", p_info.get("blood")))
        p_info.setdefault("chronic", db_crew.get("underlying_disease", p_info.get("chronic", "-")))
        p_info.setdefault("allergies", db_crew.get("allergy", p_info.get("allergies", "-")))

    medical_history_records = get_patient_history_records(patient_name or None)
    medical_history = get_patient_history(patient_name or None)
    query_intent = _classify_query_intent(query)
    overall_status, vital_issues, _ = _assess_vital_status(merged_vitals)

    if query_intent == "patient_fact_lookup":
        return {
            "reply": _format_patient_fact_lookup_reply(
                patient_name=patient_name,
                patient_data=p_info,
                merged_vitals=merged_vitals,
                db_crew=db_crew,
            )
        }

    if query_intent == "vital_analysis":
        return {
            "reply": _format_dashboard_reply(
                patient_name=patient_name,
                query_intent=query_intent,
                overall_status=overall_status,
                vital_issues=vital_issues,
                merged_vitals=merged_vitals,
                medical_history=medical_history,
                ai_reply="",
            )
        }

    if any(keyword in query for keyword in ("악화 징후", "응급 상태 악화", "상태 악화", "악화 확인")):
        return {
            "reply": _format_dashboard_reply(
                patient_name=patient_name,
                query_intent="emergency_deterioration",
                overall_status=overall_status,
                vital_issues=vital_issues,
                merged_vitals=merged_vitals,
                medical_history=medical_history,
                ai_reply=_default_reply_for_intent("emergency_deterioration", overall_status, vital_issues),
            )
        }

    rag_context = _compose_rag_context(query)

    prompt_parts = [
        "당신은 선박 의료 보조 AI입니다.",
        "반드시 아래 데이터만 근거로 사용해 한글로 간단하고 정확하게 답변합니다.",
        "추측은 금지하고, 수치 기반 판단을 우선합니다.",
        "",
        "[환자]",
        f"이름: {patient_name or '미확인'}",
        "",
        "[실시간 바이탈(MariaDB 우선)]",
        *_format_vitals(merged_vitals),
        "",
        "[이상 징후 판정]",
        f"전체 상태: {overall_status}",
        *([f"- {line}" for line in vital_issues]),
        "",
        "[과거 진료 이력 요약(최근 5건)]",
        _format_history(medical_history_records),
        "",
        "[요청]",
        query,
        "",
        "[질문 의도]",
        query_intent,
        "",
        "[내부 참고자료: ChromaDB RAG + Obsidian MCP Markdown - 원문 출력 금지]",
        rag_context,
        "",
        "[중요 지시]",
        "- 사용자의 질문에 직접 답변합니다.",
        "- 질문이 바이탈 분석이 아니면 바이탈 정상/주의 문구를 반복하지 않습니다.",
        "- 0으로 들어온 바이탈 값은 사망/위험 수치가 아니라 미측정 또는 미전송 값으로 간주합니다.",
        "- SpO2 95~100%는 위험 소견으로 쓰지 않습니다.",
        "- ChromaDB RAG와 Obsidian MCP Markdown 근거는 내부 판단에만 사용하고 화면 출력에는 원문을 복사하지 않습니다.",
        "- Markdown 표, 파일명, source, score, distance, DB 컬럼 정의는 출력하지 않습니다.",
        "- 데이터셋명, Kaggle 경로, 모델 학습 정보, 우선순위 문서, 개발 문서, 프로젝트 문서 조각은 절대 출력하지 않습니다.",
        "- 응급 상태 질문에는 악화 징후 확인 방법과 즉시 확인할 행동만 답변합니다.",
        "- 중국어, 일본어, 한자 문자를 절대 출력하지 않습니다. 답변은 한글, 영문 약어, 숫자만 사용합니다.",
        "- 근거가 부족하면 '확인 필요'라고 명시하고 추정 사실을 만들지 않습니다.",
        "",
        "[출력 규칙]",
        "1) 일반 텍스트만 사용합니다. 별표, Markdown 표, 불릿 기호를 쓰지 않습니다.",
        "2) 2~4개 문장으로 짧게 작성합니다.",
        "3) 각 문장은 '판단:', '근거:', '조치:', '재확인:' 중 하나로 시작합니다.",
        "4) 같은 문장 반복, 질문과 무관한 바이탈 반복, 의미 없는 수치 계산은 금지합니다.",
    ]
    prompt = "\n".join(prompt_parts)

    data = {
        "model": "llama3.2:1b",
        "messages": [
            {
                "role": "system",
                "content": (
                    "당신은 의료 보조 AI입니다. 출력은 존중된 사실 기반으로만 작성하며, "
                    "질문 의도, RAG 근거, Obsidian MCP 근거, DB 수치 순으로 판단합니다. "
                    "질문과 무관한 바이탈 요약을 반복하지 않습니다. "
                    "데이터셋명, Kaggle, 모델 학습 정보, 개발 문서명, 우선순위 문서 조각은 출력하지 않습니다. "
                    "중국어, 일본어, 한자 문자는 절대 출력하지 않고 한글 문장으로만 답변합니다."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 320,
        "stream": False,
        "keep_alive": "10s",
        "options": {"num_ctx": 1024, "num_predict": 192, "num_batch": 64},
    }

    try:
        response = requests.post(llm_handler.url, json=data, timeout=60)
        if response.status_code == 200:
            payload = response.json()
            ai_reply = ""
            if "choices" in payload and payload["choices"]:
                ai_reply = payload["choices"][0].get("message", {}).get("content", "")
            if "message" in payload and isinstance(payload["message"], dict):
                ai_reply = payload["message"].get("content", "")
            if not ai_reply and "response" in payload:
                ai_reply = payload.get("response", "")

            if ai_reply:
                return {
                    "reply": _format_dashboard_reply(
                        patient_name=patient_name,
                        query_intent=query_intent,
                        overall_status=overall_status,
                        vital_issues=vital_issues,
                        merged_vitals=merged_vitals,
                        medical_history=medical_history,
                        ai_reply=ai_reply,
                    )
                }
        return {"reply": AI_OFFLINE_REPLY}
    except Exception as exc:
        print(f"[Ollama Exception] {exc}")
        return {"reply": AI_OFFLINE_REPLY}


@app.post("/rag/reload")
async def reload_knowledge(source_dir: str = Form(""), mode: str = Form("obsidian")):
    if mode != "obsidian":
        return {"status": "skip", "reason": "지원되지 않는 모드"}

    directory = source_dir or os.getenv("MDTS_OBSIDIAN_DIR", "")
    if not directory:
        return {"status": "error", "reason": "MDTS_OBSIDIAN_DIR이 비어 있습니다."}

    try:
        result = knowledge_engine.sync_obsidian_once(directory)
        return {"status": "ok", "count": result.get("count", 0), "source": result.get("source", directory)}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


@app.on_event("shutdown")
def shutdown_event() -> None:
    try:
        knowledge_engine.stop()
    except Exception:
        pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
