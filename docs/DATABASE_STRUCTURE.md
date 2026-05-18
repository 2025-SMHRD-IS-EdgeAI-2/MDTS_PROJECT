# MDTS Database Structure

## TL;DR

공개 공유본에는 실제 DB 접속정보를 포함하지 않는다. 아래 내용은 MDTS에서 사용하는 주요 테이블과 용도만 정리한 구조 문서다.

## 주요 테이블

| 테이블 | 용도 |
| --- | --- |
| `tb_crew` | 선원 기본 정보, 혈액형, 알레르기, 기저질환 등 |
| `tb_vital` | 심박수, 산소포화도, 호흡수, 혈압, 체온 등 바이탈 측정값 |
| `tb_analysis` | 외상/상태 분석 결과, 진단 보조 결과 |
| `tb_firstaid` | 응급처치 가이드 및 처치 기록 |
| `tb_patient_history` | 환자 차트 지난 기록, 응급처치 세션 종료 보고 |
| `vital_logs` | Raspberry Pi 로컬 센서 로그 |

## 개념 ERD

```text
tb_crew
  1 ─── N tb_vital
  1 ─── N tb_analysis
  1 ─── N tb_firstaid
  1 ─── N tb_patient_history
```

## 예시 스키마

```sql
CREATE TABLE tb_crew (
    crew_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    bloodtype VARCHAR(20),
    allergy TEXT,
    underlying_disease TEXT,
    department VARCHAR(100),
    role VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tb_vital (
    vital_id INT AUTO_INCREMENT PRIMARY KEY,
    crew_id INT NOT NULL,
    heart_rate INT,
    spo2 INT,
    respiration_rate INT,
    blood_pressure VARCHAR(20),
    temperature DECIMAL(4, 1),
    measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vital_crew_measured (crew_id, measured_at)
);

CREATE TABLE tb_analysis (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    crew_id INT NOT NULL,
    vital_id INT NULL,
    analysis_result TEXT,
    diagnosis TEXT,
    risk_level VARCHAR(50),
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analysis_crew_time (crew_id, analyzed_at)
);

CREATE TABLE tb_firstaid (
    firstaid_id INT AUTO_INCREMENT PRIMARY KEY,
    crew_id INT NOT NULL,
    analysis_id INT NULL,
    guide_text TEXT,
    action_taken TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_firstaid_crew_time (crew_id, created_at)
);

CREATE TABLE tb_patient_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    crew_id INT NOT NULL,
    title VARCHAR(200),
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_history_crew_time (crew_id, created_at)
);
```

## 운영 주의

- 공개 저장소에 DB host, user, password를 직접 기록하지 않는다.
- 실제 운영 계정은 읽기/쓰기 권한을 최소화한다.
- 의료정보와 개인정보는 마스킹 정책을 적용한다.
- 로그에 환자명, 연락처, 상세 의료정보가 과다 저장되지 않도록 필터링한다.
