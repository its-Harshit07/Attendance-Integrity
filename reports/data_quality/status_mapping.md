# Status Mapping & Attendance Interpretation Principles

## 1. Source Status Mapping Layer (`SOURCE_STATUS_MAPPING`)

The source Excel workbooks use single-letter lower-case characters (`s`, `i`, `a`) and blank cells (`""`). To prevent domain assumptions or false claims regarding the semantic meaning of these abbreviations, the pipeline enforces a neutral, configurable normalization layer:

| Raw Value | Current Normalized Value | Confirmed Meaning | Confidence | Source of Interpretation |
|---|---|---|---|---|
| `""` *(blank)* | `NO_EXCEPTION_RECORDED` | Unmarked cell in attendance register; no exception entry recorded | **Unverified** *(Neutral)* | Primary register cell format; NOT automatically assumed to mean 'PRESENT' without explicit source evidence |
| `"s"` | `SOURCE_MARK_S` | Suspected 'Sakit' (Sick), but unverified | **Unverified** | Source workbook mark `s`; semantic interpretation unconfirmed by source documentation |
| `"i"` | `SOURCE_MARK_I` | Suspected 'Izin' (Permitted Absence), but unverified | **Unverified** | Source workbook mark `i`; semantic interpretation unconfirmed by source documentation |
| `"a"` | `SOURCE_MARK_A` | Suspected 'Alpha' (Unexcused Absence), but unverified | **Unverified** | Source workbook mark `a`; semantic interpretation unconfirmed by source documentation |

> [!IMPORTANT]
> **Preservation Rule**: The original mark is preserved verbatim in `raw_status`. The `attendance_status` field holds the neutral normalized token. No semantic labels (e.g. `SICK`, `PRESENT`, `UNEXCUSED_ABSENCE`) are assigned until authoritative source metadata is provided.

---

## 2. Core Attendance & Anomaly Principles

### An Absence Is NOT an Anomaly

An ordinary absence is a legitimate operational and behavioral event. Distinguishing legitimate absence from system integrity failures is a core design requirement of the Attendance Integrity System.

The system enforces a strict taxonomy distinguishing two distinct anomaly classes:

### Category A: Data-Integrity Anomalies (System / Capture Errors)
Data-integrity anomalies represent failures of the data collection or ingestion process:
- **Duplicate Observations**: Multiple conflicting records for the same student on the same date.
- **Conflicting Records**: Discrepancies between physical biometric punch logs (`Att.log report`) and manual classroom registers (`attendance_canonical.csv`).
- **Invalid Observations**: Impossible dates, unknown class IDs, or illegal status codes.
- **Missing Expected Records**: A student active on the roster whose daily attendance record is entirely absent from the canonical dataset.

### Category B: Behavioral Anomalies (Statistical / Pattern Deviations)
Behavioral anomalies represent legitimate attendance events that deviate significantly from historical or group patterns:
- **Sudden Absence Spikes**: Uncharacteristic surge in absences within a short lookback window (7d/14d).
- **Unusual Consecutive Absences**: Prolonged streaks of exception marks.
- **Personal Historical Deviation**: Significant divergence between a student's recent exception rate and their baseline historical rate.
- **Class-Relative Deviation**: Individual exception rates that diverge sharply from class-wide peer averages.
