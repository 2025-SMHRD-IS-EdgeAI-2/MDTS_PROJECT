"""
MDTS 양방향 동기화 스크립트
- 선원 목록: 서버 → 라즈베리파이 (서버가 원본)
- 바이탈/분석: 라즈베리파이 → 서버 (센서가 원본)

사용법:
  python3 sync_to_server.py

의존성:
  pip3 install mysql-connector-python
"""

import mysql.connector
import time
import sys

# ─── 라즈베리파이 로컬 DB 설정 ───
LOCAL_DB = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',       # 라즈베리파이 MySQL 비밀번호
    'database': 'mdts',
    'charset': 'utf8mb4',
}

# ─── 원격 서버 DB 설정 ───
REMOTE_DB = {
    'host': 'YOUR_REMOTE_DB_HOST',
    'port': 3307,
    'user': 'MDTS',
    'password': 'YOUR_DB_PASSWORD',
    'database': 'MDTS',
    'charset': 'utf8mb4',
}

# 동기화 간격 (초)
SYNC_INTERVAL = 5

# 선원 동기화 간격 (초) — 선원 목록은 자주 바뀌지 않으므로 길게
CREW_SYNC_INTERVAL = 60


def get_connection(config):
    return mysql.connector.connect(**config)


# ═══════════════════════════════════════════════════
#  서버 → 라즈베리파이: 선원 목록 동기화
# ═══════════════════════════════════════════════════
def sync_crew_from_server(local_conn, remote_conn):
    """서버 DB의 tb_crew를 라즈베리파이 로컬 DB로 동기화 (서버가 원본)"""
    remote_cur = remote_conn.cursor(dictionary=True)
    local_cur = local_conn.cursor(dictionary=True)

    remote_cur.execute("SELECT * FROM tb_crew ORDER BY crew_id")
    server_crews = remote_cur.fetchall()

    local_cur.execute("SELECT crew_id FROM tb_crew")
    local_ids = {row['crew_id'] for row in local_cur.fetchall()}

    synced = 0
    for crew in server_crews:
        if crew['crew_id'] in local_ids:
            # 업데이트
            local_cur.execute("""
                UPDATE tb_crew SET
                    name=%s, photo_path=%s, birthdate=%s, gender=%s, bloodtype=%s,
                    height=%s, weight=%s, department=%s, position=%s, joined_at=%s,
                    underlying_disease=%s, allergy=%s, recent_medication=%s,
                    medical_history=%s, phone=%s, guardian_name=%s, emergency_contact=%s
                WHERE crew_id=%s
            """, (
                crew['name'], crew['photo_path'], crew['birthdate'], crew['gender'],
                crew['bloodtype'], crew['height'], crew['weight'], crew['department'],
                crew['position'], crew['joined_at'], crew['underlying_disease'],
                crew['allergy'], crew['recent_medication'], crew['medical_history'],
                crew['phone'], crew['guardian_name'], crew['emergency_contact'],
                crew['crew_id']
            ))
        else:
            # 신규 삽입
            local_cur.execute("""
                INSERT INTO tb_crew
                    (crew_id, name, photo_path, birthdate, gender, bloodtype,
                     height, weight, department, position, joined_at,
                     underlying_disease, allergy, recent_medication,
                     medical_history, phone, guardian_name, emergency_contact)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                crew['crew_id'], crew['name'], crew['photo_path'], crew['birthdate'],
                crew['gender'], crew['bloodtype'], crew['height'], crew['weight'],
                crew['department'], crew['position'], crew['joined_at'],
                crew['underlying_disease'], crew['allergy'], crew['recent_medication'],
                crew['medical_history'], crew['phone'], crew['guardian_name'],
                crew['emergency_contact']
            ))
        synced += 1

    # 서버에서 삭제된 선원은 로컬에서도 삭제
    server_ids = {c['crew_id'] for c in server_crews}
    deleted_ids = local_ids - server_ids
    for did in deleted_ids:
        local_cur.execute("DELETE FROM tb_crew WHERE crew_id=%s", (did,))

    local_conn.commit()
    remote_cur.close()
    local_cur.close()
    return synced


# ═══════════════════════════════════════════════════
#  라즈베리파이 → 서버: 바이탈 데이터 동기화
# ═══════════════════════════════════════════════════
def sync_vitals(local_conn, remote_conn):
    """tb_vital 테이블의 미동기화 데이터를 원격 서버로 전송"""
    local_cur = local_conn.cursor(dictionary=True)
    remote_cur = remote_conn.cursor()

    try:
        local_cur.execute("""
            SELECT vital_id, crew_id, heart_rate, spo2, respiration_rate,
                   blood_pressure, temperature, measured_at
            FROM tb_vital
            WHERE synced = 0
            ORDER BY measured_at ASC
            LIMIT 100
        """)
    except mysql.connector.Error:
        local_cur.execute("""
            SELECT vital_id, crew_id, heart_rate, spo2, respiration_rate,
                   blood_pressure, temperature, measured_at
            FROM tb_vital
            ORDER BY measured_at DESC
            LIMIT 10
        """)

    rows = local_cur.fetchall()
    if not rows:
        local_cur.close()
        remote_cur.close()
        return 0

    synced_count = 0
    synced_ids = []

    for row in rows:
        try:
            remote_cur.execute("""
                INSERT INTO tb_vital
                    (crew_id, heart_rate, spo2, respiration_rate, blood_pressure, temperature, measured_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                row['crew_id'], row['heart_rate'], row['spo2'],
                row['respiration_rate'], row['blood_pressure'],
                row['temperature'], row['measured_at'],
            ))
            synced_count += 1
            synced_ids.append(row['vital_id'])
        except mysql.connector.Error as e:
            print(f"  [WARN] vital_id={row['vital_id']} 전송 실패: {e}")

    remote_conn.commit()

    if synced_ids:
        try:
            placeholders = ', '.join(['%s'] * len(synced_ids))
            local_cur.execute(
                f"UPDATE tb_vital SET synced = 1 WHERE vital_id IN ({placeholders})",
                synced_ids
            )
            local_conn.commit()
        except mysql.connector.Error:
            pass

    local_cur.close()
    remote_cur.close()
    return synced_count


# ═══════════════════════════════════════════════════
#  라즈베리파이 → 서버: 분석 결과 동기화
# ═══════════════════════════════════════════════════
def sync_analysis(local_conn, remote_conn):
    """tb_analysis 테이블의 미동기화 데이터를 원격 서버로 전송"""
    local_cur = local_conn.cursor(dictionary=True)
    remote_cur = remote_conn.cursor()

    try:
        local_cur.execute("""
            SELECT analysis_id, vital_id, crew_id, analysis_result, diagnosis,
                   file_name, file_size, file_ext, risk_level, analyzed_at
            FROM tb_analysis
            WHERE synced = 0
            ORDER BY analyzed_at ASC
            LIMIT 50
        """)
    except mysql.connector.Error:
        local_cur.execute("""
            SELECT analysis_id, vital_id, crew_id, analysis_result, diagnosis,
                   file_name, file_size, file_ext, risk_level, analyzed_at
            FROM tb_analysis
            ORDER BY analyzed_at DESC
            LIMIT 5
        """)

    rows = local_cur.fetchall()
    if not rows:
        local_cur.close()
        remote_cur.close()
        return 0

    synced_count = 0
    synced_ids = []

    for row in rows:
        try:
            remote_cur.execute("""
                INSERT INTO tb_analysis
                    (vital_id, crew_id, analysis_result, diagnosis,
                     file_name, file_size, file_ext, risk_level, analyzed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                row['vital_id'], row['crew_id'], row['analysis_result'],
                row['diagnosis'], row['file_name'], row['file_size'],
                row['file_ext'], row['risk_level'], row['analyzed_at'],
            ))
            synced_count += 1
            synced_ids.append(row['analysis_id'])
        except mysql.connector.Error as e:
            print(f"  [WARN] analysis_id={row['analysis_id']} 전송 실패: {e}")

    remote_conn.commit()

    if synced_ids:
        try:
            placeholders = ', '.join(['%s'] * len(synced_ids))
            local_cur.execute(
                f"UPDATE tb_analysis SET synced = 1 WHERE analysis_id IN ({placeholders})",
                synced_ids
            )
            local_conn.commit()
        except mysql.connector.Error:
            pass

    local_cur.close()
    remote_cur.close()
    return synced_count


# ═══════════════════════════════════════════════════
#  메인 루프
# ═══════════════════════════════════════════════════
def main():
    print("=" * 55)
    print("  MDTS 양방향 동기화")
    print(f"  로컬 DB: {LOCAL_DB['host']}:{LOCAL_DB['port']}/{LOCAL_DB['database']}")
    print(f"  원격 DB: {REMOTE_DB['host']}:{REMOTE_DB['port']}/{REMOTE_DB['database']}")
    print(f"  바이탈 동기화 간격: {SYNC_INTERVAL}초")
    print(f"  선원 동기화 간격: {CREW_SYNC_INTERVAL}초")
    print("=" * 55)

    loop_count = 0
    crew_sync_every = max(1, CREW_SYNC_INTERVAL // SYNC_INTERVAL)

    while True:
        try:
            local_conn = get_connection(LOCAL_DB)
            remote_conn = get_connection(REMOTE_DB)

            # 바이탈/분석: 라즈베리파이 → 서버 (매 루프)
            v_count = sync_vitals(local_conn, remote_conn)
            a_count = sync_analysis(local_conn, remote_conn)

            if v_count or a_count:
                print(f"[↑ SYNC] vital: {v_count}건, analysis: {a_count}건 → 서버 전송 완료")

            # 선원 목록: 서버 → 라즈베리파이 (crew_sync_every 루프마다)
            if loop_count % crew_sync_every == 0:
                c_count = sync_crew_from_server(local_conn, remote_conn)
                if c_count:
                    print(f"[↓ SYNC] 선원 {c_count}명 ← 서버에서 동기화 완료")

            local_conn.close()
            remote_conn.close()

        except mysql.connector.Error as e:
            print(f"[ERROR] DB 연결 실패: {e}")
        except Exception as e:
            print(f"[ERROR] 예기치 않은 오류: {e}")

        loop_count += 1
        time.sleep(SYNC_INTERVAL)


if __name__ == '__main__':
    main()
