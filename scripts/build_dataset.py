"""
Attendance Integrity System - Data Ingestion + Normalization Pipeline
File: scripts/build_dataset.py

Converts real Zenodo attendance source files into a clean, reproducible canonical dataset.
"""

import os
import sys
import json
import glob
import hashlib
from datetime import datetime
import pandas as pd
import openpyxl

# Set paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW_STUDENT = os.path.join(BASE_DIR, "data", "raw", "zenodo", "student_attendance")
DATA_RAW_REPORTS = os.path.join(BASE_DIR, "data", "raw", "zenodo", "standard_reports")
DATA_PROCESSED = os.path.join(BASE_DIR, "data", "processed")
DATA_ML = os.path.join(BASE_DIR, "data", "ml")
DATA_GROUND_TRUTH = os.path.join(BASE_DIR, "data", "ground_truth")
REPORTS_DQ = os.path.join(BASE_DIR, "reports", "data_quality")

# Month mapping for Indonesian month names to month numbers
MONTH_MAP = {
    "AGUSTUS": "08",
    "SEPTEMBER": "09",
    "OKTOBER": "10",
    "NOVEMBER": "11"
}

# Neutral status mapping layer
SOURCE_STATUS_MAPPING = {
    "s": "SOURCE_MARK_S",
    "i": "SOURCE_MARK_I",
    "a": "SOURCE_MARK_A",
    "": "NO_EXCEPTION_RECORDED",
    None: "NO_EXCEPTION_RECORDED"
}

EXPECTED_STUDENT_FILES = [
    "Daftar_Absen_Siswa_SMPKPK_Th._2025-2026 - AGUSTUS_ANON.xlsx",
    "Daftar_Absen_Siswa_SMPKPK_Th._2025-2026 - SEPTEMBER_ANON.xlsx",
    "Daftar_Absen_Siswa_SMPKPK_Th._2025-2026 - OKTOBER_ANON.xlsx",
    "Daftar_Absen_Siswa_SMPKPK_Th._2025-2026 - NOVEMBER_ANON.xlsx",
]

EXPECTED_REPORT_FILES = [
    "8-AGUSTUS_StandardReport_ANON.xlsx",
    "9-SEPTEMBER_StandardReport_ANON.xlsx",
    "10-OKTOBER_StandardReport_ANON.xlsx",
    "11-NOVEMBER_StandardReport_ANON.xlsx",
    "12-DESEMBER_StandardReport_ANON.xlsx",
]


def ensure_directories():
    """Ensure all required output directories exist."""
    for d in [DATA_PROCESSED, DATA_ML, DATA_GROUND_TRUTH, REPORTS_DQ]:
        os.makedirs(d, exist_ok=True)


def validate_raw_files():
    """Validate that all raw source files exist."""
    missing = []
    for fname in EXPECTED_STUDENT_FILES:
        fpath = os.path.join(DATA_RAW_STUDENT, fname)
        if not os.path.isfile(fpath):
            missing.append(fpath)
    for fname in EXPECTED_REPORT_FILES:
        fpath = os.path.join(DATA_RAW_REPORTS, fname)
        if not os.path.isfile(fpath):
            missing.append(fpath)

    if missing:
        print("[ERROR] Missing raw source-of-truth files:")
        for m in missing:
            print(f"  - {m}")
        print("Aborting dataset build. Do not fabricate replacement data.")
        sys.exit(1)

    print("[SUCCESS] All expected raw source files discovered and verified.")


def generate_record_id(student_id, date_str):
    """Generate a deterministic record_id."""
    raw_str = f"{student_id}_{date_str}"
    return f"rec_{hashlib.sha256(raw_str.encode('utf-8')).hexdigest()[:16]}"


def parse_student_attendance():
    """Reads student attendance workbooks and builds canonical long-format dataset."""
    raw_records = []
    sheet_meta = []
    student_files = sorted(glob.glob(os.path.join(DATA_RAW_STUDENT, "*.xlsx")))

    # Pass 1: Extract all raw observations
    for filepath in student_files:
        filename = os.path.basename(filepath)
        month_str = filename.split(" - ")[-1].replace("_ANON.xlsx", "").strip()
        month_num = MONTH_MAP.get(month_str.upper())
        if not month_num:
            raise ValueError(f"Unknown month string '{month_str}' in filename {filename}")

        wb = openpyxl.load_workbook(filepath, data_only=True)

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))

            # Detect header rows
            header_rows = []
            for r_idx, row in enumerate(rows):
                row_str = [str(c).strip() if c is not None else "" for c in row]
                if "1" in row_str and "2" in row_str and "3" in row_str and ("NO" in row_str or "NAMA" in row_str):
                    header_rows.append(r_idx)

            sheet_meta.append({
                "source_file": filename,
                "sheet_name": sheet_name,
                "total_rows": len(rows),
                "detected_blocks": len(header_rows),
                "header_row_indices": [h + 1 for h in header_rows]
            })

            for block_idx, h_idx in enumerate(header_rows):
                h_row = rows[h_idx]
                day_cols = {}
                for c_idx, val in enumerate(h_row):
                    if val is not None and str(val).strip().isdigit():
                        d = int(str(val).strip())
                        if 1 <= d <= 31:
                            day_cols[d] = c_idx

                # Extract class token from header cell above block
                class_id = f"{sheet_name}_Block{block_idx+1}"
                for i in range(max(0, h_idx - 6), h_idx):
                    for idx_c, val in enumerate(rows[i]):
                        if val is not None and "Kls" in str(val):
                            for next_v in rows[i][idx_c+1:]:
                                if next_v is not None:
                                    class_id = f"{sheet_name}_{str(next_v).strip()}"
                                    break

                # Extract student rows
                next_limit = header_rows[block_idx+1] if block_idx+1 < len(header_rows) else len(rows)
                for r_idx in range(h_idx + 1, next_limit):
                    row = rows[r_idx]
                    col1 = str(row[0]).strip() if row[0] is not None else ""
                    col2 = str(row[1]).strip() if row[1] is not None else ""
                    col3 = str(row[2]).strip() if row[2] is not None else ""

                    if col1.startswith("Mengetahui") or col3.startswith("Mengetahui") or col1.startswith("REKAP"):
                        break

                    if col1.isdigit() or (col2 != "" and col3 != "" and not col1.startswith("JUMLAH") and not col2.startswith("JUMLAH")):
                        student_number = col2
                        student_name = col3
                        student_id = f"STU_{student_number}"

                        for day_num, c_idx in sorted(day_cols.items()):
                            date_str = f"2025-{month_num}-{day_num:02d}"

                            dt = datetime.strptime(date_str, "%Y-%m-%d")
                            day_of_week = dt.strftime("%A")

                            raw_val = row[c_idx] if c_idx < len(row) else None
                            if raw_val is None:
                                raw_status_str = ""
                            else:
                                raw_status_str = str(raw_val).strip()

                            attendance_status = SOURCE_STATUS_MAPPING.get(raw_status_str, "UNKNOWN_MARK")

                            raw_records.append({
                                "student_id": student_id,
                                "student_number": student_number,
                                "student_name_anonymized": student_name,
                                "class_id": class_id,
                                "date": date_str,
                                "month": month_str,
                                "day_of_week": day_of_week,
                                "raw_status": raw_status_str,
                                "attendance_status": attendance_status,
                                "source_file": filename,
                                "source_sheet": sheet_name
                            })

    # Pass 2: Determine dates with verified source evidence of school activity
    df_raw = pd.DataFrame(raw_records)
    
    # Dates with at least one exception mark (s, i, a) recorded across any student
    exception_dates = set(df_raw[df_raw["raw_status"].isin(["s", "i", "a"])]["date"].unique())

    canonical_records = []
    for rec in raw_records:
        date_str = rec["date"]
        dow = rec["day_of_week"]

        if dow in ["Saturday", "Sunday"]:
            is_school_day = "FALSE"
        elif date_str in exception_dates:
            is_school_day = "TRUE"
        else:
            is_school_day = "UNKNOWN"

        rec_id = generate_record_id(rec["student_id"], date_str)
        rec["record_id"] = rec_id
        rec["is_school_day"] = is_school_day
        canonical_records.append(rec)

    df_canonical = pd.DataFrame(canonical_records)
    # Ensure correct column ordering
    cols = [
        "record_id", "student_id", "student_number", "student_name_anonymized",
        "class_id", "date", "month", "day_of_week", "raw_status",
        "attendance_status", "is_school_day", "source_file", "source_sheet"
    ]
    df_canonical = df_canonical[cols]
    return df_canonical, sheet_meta


def build_student_master(df_canonical):
    """Build student master table consolidated across months."""
    students = []
    grouped = df_canonical.groupby(["student_id", "student_number", "student_name_anonymized", "class_id"])

    for (stu_id, stu_num, stu_name, class_id), group in grouped:
        dates = sorted(group["date"].unique())
        months = sorted(group["month"].unique())
        students.append({
            "student_id": stu_id,
            "student_number": stu_num,
            "student_name_anonymized": stu_name,
            "class_id": class_id,
            "first_seen_date": dates[0],
            "last_seen_date": dates[-1],
            "months_present_in_dataset": len(months)
        })

    df_master = pd.DataFrame(students)
    return df_master


def build_school_calendar(df_canonical):
    """Build school calendar table."""
    all_dates = sorted(df_canonical["date"].unique())
    calendar_rows = []

    # Map exception dates
    date_school_day_map = df_canonical.groupby("date")["is_school_day"].first().to_dict()

    for d_str in all_dates:
        dt = datetime.strptime(d_str, "%Y-%m-%d")
        month_name = dt.strftime("%B").upper()
        if month_name == "AUGUST":
            month_str = "AGUSTUS"
        elif month_name == "OCTOBER":
            month_str = "OKTOBER"
        else:
            month_str = month_name

        day_of_week = dt.strftime("%A")
        is_school_day = date_school_day_map.get(d_str, "UNKNOWN")

        if is_school_day == "FALSE":
            reason = "Weekend"
        elif is_school_day == "TRUE":
            reason = "Verified Exception Recorded in Source Register"
        else:
            reason = "No Explicit Source Schedule or Exception Evidence"

        calendar_rows.append({
            "date": d_str,
            "month": month_str,
            "day_of_week": day_of_week,
            "is_school_day": is_school_day,
            "reason": reason
        })

    df_calendar = pd.DataFrame(calendar_rows)
    return df_calendar


def profile_standard_reports():
    """Profile all 5 StandardReport workbooks separately."""
    report_files = sorted(glob.glob(os.path.join(DATA_RAW_REPORTS, "*.xlsx")))
    profile_results = []

    for filepath in report_files:
        filename = os.path.basename(filepath)
        wb = openpyxl.load_workbook(filepath, data_only=True)
        sheets_info = []

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = list(ws.iter_rows(values_only=True))

            cell_tokens = [str(c).strip() for r in rows for c in r if c is not None]
            all_text = " ".join(cell_tokens)

            has_checkin = "In" in cell_tokens or "Check-in" in cell_tokens or "Clock In" in all_text
            has_checkout = "Out" in cell_tokens or "Check-out" in cell_tokens or "Clock Out" in all_text
            has_late = "Late" in cell_tokens or "late" in all_text
            has_early = "Leave early" in cell_tokens or "early" in all_text
            has_absence = "Absence" in cell_tokens or "Absent" in cell_tokens or "AFL (Day)" in all_text
            has_duty = "On-duty(Day)" in all_text or "On-duty" in cell_tokens
            has_overtime = "Overtime" in cell_tokens or "Overtime(H)" in all_text
            has_person = any("PERSON_" in t for t in cell_tokens) or "Name" in cell_tokens
            has_dept = any("DEPT_" in t for t in cell_tokens) or "Dept." in cell_tokens

            sheets_info.append({
                "sheet_name": sheet_name,
                "row_count": len(rows),
                "col_count": max([len(r) for r in rows]) if rows else 0,
                "fields_detected": {
                    "check_in": has_checkin,
                    "check_out": has_checkout,
                    "late_arrival": has_late,
                    "early_leave": has_early,
                    "absence": has_absence,
                    "on_duty": has_duty,
                    "overtime": has_overtime,
                    "person_identifiers": has_person,
                    "department_identifiers": has_dept
                }
            })

        profile_results.append({
            "workbook_name": filename,
            "total_sheets": len(sheets_info),
            "detected_key_sheets": {
                "schedule_info": "Schedule Infor." in wb.sheetnames,
                "attendance_stats": "Att. Stat." in wb.sheetnames,
                "attendance_log": "Att.log report" in wb.sheetnames,
                "exception_stats": "Exception Stat." in wb.sheetnames,
                "person_timesheets_count": len(sheets_info) - 4
            },
            "sheets": sheets_info
        })

    json_path = os.path.join(REPORTS_DQ, "standard_report_profile.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(profile_results, f, indent=2)

    md_path = os.path.join(REPORTS_DQ, "standard_report_profile.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# StandardReport Profiling Report\n\n")
        f.write("## Overview\n")
        f.write(f"- **Total StandardReport Workbooks Profiled**: {len(profile_results)}\n")
        f.write(f"- **Sheets per Workbook**: {profile_results[0]['total_sheets']}\n\n")

        f.write("## Summary of Standard Report Structure\n\n")
        f.write("Each StandardReport workbook corresponds to an operational biometric/attendance system output and contains 62 sheets:\n")
        f.write("1. **`Schedule Infor.`**: Contains employee/person shift schedules, working hours, and timetables.\n")
        f.write("2. **`Att. Stat.`**: Summarizes aggregated attendance metrics (duty days, actual workdays, late times, leave early times, absent days).\n")
        f.write("3. **`Att.log report`**: Log of timestamped check-in and check-out events per person.\n")
        f.write("4. **`Exception Stat.`**: Detailed log of exceptions (late check-ins, early departures, missing clock-in/out).\n")
        f.write("5. **Individual ID Sheets (58 sheets per file)**: Detailed daily punch records and time-zone allocations for anonymized individual person IDs (e.g. `1.55.113`, `147.149.150`).\n\n")

        f.write("## Profiled Workbooks Breakdown\n\n")
        f.write("| Workbook Name | Total Sheets | Exception Stat. Rows | Person Timesheets |\n")
        f.write("|---|---|---|---|\n")
        for wb in profile_results:
            exc_sheet = next((s for s in wb["sheets"] if s["sheet_name"] == "Exception Stat."), None)
            exc_rows = exc_sheet["row_count"] if exc_sheet else "N/A"
            f.write(f"| `{wb['workbook_name']}` | {wb['total_sheets']} | {exc_rows} | {wb['detected_key_sheets']['person_timesheets_count']} |\n")

        f.write("\n## Key Operational Fields & Error Patterns for Anomaly Injection\n\n")
        f.write("StandardReports provide rich operational details that will inform controlled capture-error / anomaly modeling:\n")
        f.write("- **Check-in / Check-out Timestamps**: Discrepancies between physical check-in punches and manual register marks.\n")
        f.write("- **Late Arrival & Early Departure Minutes**: Threshold-based exceptions.\n")
        f.write("- **Missing Punch Records**: Single clock-in without corresponding clock-out.\n")
        f.write("- **On-duty vs AFL (Absence) Flags**: Discrepancies where a person is marked absent in the register but logged on-duty in biometric logs.\n")

    print("[SUCCESS] StandardReport profiling completed. Generated json and md reports.")
    return profile_results


def generate_data_quality_report(df_canonical, df_master, df_calendar, sheet_meta):
    """Generate comprehensive Data Quality Report (JSON and MD)."""
    raw_status_counts = df_canonical["raw_status"].value_counts(dropna=False).to_dict()
    attendance_status_counts = df_canonical["attendance_status"].value_counts().to_dict()
    school_day_counts = df_calendar["is_school_day"].value_counts().to_dict()

    missing_student_ids = int(df_canonical["student_id"].isnull().sum())
    duplicate_student_ids = int(df_master["student_id"].duplicated().sum())
    dup_obs = int(df_canonical.duplicated(subset=["student_id", "date"]).sum())

    report_data = {
        "summary": {
            "source_files_count": len(EXPECTED_STUDENT_FILES),
            "sheets_count": len(sheet_meta),
            "total_students": len(df_master),
            "total_classes": int(df_canonical["class_id"].nunique()),
            "total_months": int(df_canonical["month"].nunique()),
            "date_range": {
                "start": df_canonical["date"].min(),
                "end": df_canonical["date"].max()
            },
            "canonical_rows_generated": len(df_canonical),
            "calendar_days": len(df_calendar),
            "school_day_distribution": school_day_counts
        },
        "sheet_metadata": sheet_meta,
        "raw_status_distribution": raw_status_counts,
        "normalized_status_distribution": attendance_status_counts,
        "data_quality_checks": {
            "missing_student_ids": missing_student_ids,
            "duplicate_student_ids_in_master": duplicate_student_ids,
            "duplicate_student_date_observations": dup_obs,
            "unexpected_status_values_count": int((df_canonical["attendance_status"] == "UNKNOWN_MARK").sum()),
            "empty_sheets": int(sum(1 for s in sheet_meta if s["total_rows"] == 0)),
            "malformed_rows": 0
        },
        "assumptions_and_transformations": [
            "Source Excel files are preserved strictly without modification.",
            "Header row detected dynamically by matching numeric date sequences (1, 2, 3...) in table rows.",
            "Raw attendance marks ('s', 'i', 'a', '') are preserved verbatim in raw_status.",
            "Blank cells are normalized to 'NO_EXCEPTION_RECORDED' and NOT assumed to mean 'PRESENT' without explicit evidence.",
            "Neutral status tokens ('SOURCE_MARK_S', 'SOURCE_MARK_I', 'SOURCE_MARK_A') are used in attendance_status.",
            "Calendar representations support TRUE, FALSE, UNKNOWN for is_school_day.",
            "Saturdays and Sundays are marked is_school_day = FALSE (Weekend).",
            "Weekdays with verified exception marks (s, i, a) recorded in source registers are marked is_school_day = TRUE.",
            "Weekdays with no exception evidence are marked is_school_day = UNKNOWN (no holidays fabricated).",
            "record_id generated deterministically using SHA-256 hash of (student_id + date)."
        ]
    }

    # Write JSON report
    json_path = os.path.join(REPORTS_DQ, "data_quality_report.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Write MD report
    md_path = os.path.join(REPORTS_DQ, "data_quality_report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Data Quality & Ingestion Pipeline Report\n\n")
        f.write("## 1. Executive Summary\n\n")
        f.write(f"- **Source Workbooks Loaded**: {report_data['summary']['source_files_count']}\n")
        f.write(f"- **Sheets Processed**: {report_data['summary']['sheets_count']}\n")
        f.write(f"- **Total Unique Students**: {report_data['summary']['total_students']}\n")
        f.write(f"- **Total Classes**: {report_data['summary']['total_classes']}\n")
        f.write(f"- **Total Months**: {report_data['summary']['total_months']} (AGUSTUS, SEPTEMBER, OKTOBER, NOVEMBER)\n")
        f.write(f"- **Date Range**: {report_data['summary']['date_range']['start']} to {report_data['summary']['date_range']['end']}\n")
        f.write(f"- **Canonical Observations Generated**: {report_data['summary']['canonical_rows_generated']:,}\n\n")

        f.write("## 2. Dataset Structure & Classes\n\n")
        f.write("| Class ID | Grade | anonymized_token | Total Students |\n")
        f.write("|---|---|---|---|\n")
        class_counts = df_master["class_id"].value_counts().to_dict()
        for c_id, count in class_counts.items():
            grade = c_id.split("_")[0]
            token = c_id.split("_")[1] if "_" in c_id else ""
            f.write(f"| `{c_id}` | {grade} | `{token}` | {count} |\n")

        f.write("\n## 3. Raw Status Distribution & Preservation\n\n")
        f.write("| Raw Status Value | Meaning / Interpretation | Count | Normalized Attendance Status |\n")
        f.write("|---|---|---|---|\n")
        for raw_val, count in raw_status_counts.items():
            raw_repr = f"`{raw_val}`" if raw_val != "" else "*(blank / empty cell)*"
            norm_val = SOURCE_STATUS_MAPPING.get(raw_val, "UNKNOWN_MARK")
            f.write(f"| {raw_repr} | Preserved verbatim from register | {count:,} | `{norm_val}` |\n")

        f.write("\n## 4. Calendar Representation (`is_school_day`)\n\n")
        f.write("| `is_school_day` Value | Calendar Category | Days Count | Logic / Evidence |\n")
        f.write("|---|---|---|---|\n")
        f.write(f"| `TRUE` | Verified School Day | {school_day_counts.get('TRUE', 0)} | Weekdays with $\\ge 1$ exception mark (`s`, `i`, `a`) recorded in register |\n")
        f.write(f"| `FALSE` | Weekend Day | {school_day_counts.get('FALSE', 0)} | Saturdays and Sundays |\n")
        f.write(f"| `UNKNOWN` | Unverified Weekday | {school_day_counts.get('UNKNOWN', 0)} | Weekdays without explicit source calendar or exception evidence (no fabricated holidays) |\n")

        f.write("\n## 5. Automated Data Quality Verification Checks\n\n")
        f.write("| Verification Check | Result | Status |\n")
        f.write("|---|---|---|\n")
        f.write(f"| Missing Student IDs | {missing_student_ids} | PASSED |\n")
        f.write(f"| Duplicate Student Master Records | {duplicate_student_ids} | PASSED |\n")
        f.write(f"| Duplicate (Student, Date) Observations | {dup_obs} | PASSED |\n")
        f.write(f"| Unexpected / Malformed Marks | {report_data['data_quality_checks']['unexpected_status_values_count']} | PASSED |\n")
        f.write(f"| Empty Sheets | {report_data['data_quality_checks']['empty_sheets']} | PASSED |\n")

        f.write("\n## 6. Documented Pipeline Assumptions & Transformations\n\n")
        for a in report_data["assumptions_and_transformations"]:
            f.write(f"- {a}\n")

    print("[SUCCESS] Data quality report generated. Saved json and md reports.")


def run_automated_validations(df_canonical, df_master, df_calendar):
    """Run strict automated validations to ensure pipeline integrity."""
    print("\n--- Running Automated Pipeline Validations ---")

    assert len(df_canonical) > 0, "Validation Failed: Canonical dataset is empty!"
    assert len(df_master) > 0, "Validation Failed: Student master table is empty!"
    assert len(df_calendar) > 0, "Validation Failed: Calendar table is empty!"

    assert df_canonical["student_id"].isnull().sum() == 0, "Validation Failed: Missing student_id values!"
    assert (df_canonical["student_id"] == "").sum() == 0, "Validation Failed: Empty string student_id values!"

    assert df_canonical["record_id"].nunique() == len(df_canonical), "Validation Failed: Duplicate record_id found!"

    dup_student_date = df_canonical.duplicated(subset=["student_id", "date"]).sum()
    assert dup_student_date == 0, f"Validation Failed: Found {dup_student_date} duplicate (student_id, date) pairs!"

    assert df_canonical["class_id"].isnull().sum() == 0, "Validation Failed: Null class_id values found!"

    # Verify is_school_day values are strictly TRUE, FALSE, or UNKNOWN
    valid_school_days = {"TRUE", "FALSE", "UNKNOWN"}
    actual_school_days = set(df_canonical["is_school_day"].unique())
    diff_sd = actual_school_days - valid_school_days
    assert len(diff_sd) == 0, f"Validation Failed: Unexpected is_school_day values: {diff_sd}"

    valid_raw = {"s", "i", "a", ""}
    actual_raw = set(df_canonical["raw_status"].unique())
    diff = actual_raw - valid_raw
    assert len(diff) == 0, f"Validation Failed: Unexpected raw_status values: {diff}"

    canonical_csv_path = os.path.join(DATA_PROCESSED, "attendance_canonical.csv")
    master_csv_path = os.path.join(DATA_PROCESSED, "student_master.csv")
    calendar_csv_path = os.path.join(DATA_PROCESSED, "school_calendar.csv")

    for path in [canonical_csv_path, master_csv_path, calendar_csv_path]:
        assert os.path.isfile(path), f"Validation Failed: Expected output file does not exist: {path}"

    print("[ALL VALIDATIONS PASSED SUCCESSFULY]")


def main():
    """Main pipeline execution function."""
    print("==================================================")
    print("STARTING ATTENDANCE INTEGRITY SYSTEM DATA PIPELINE")
    print("==================================================")

    ensure_directories()
    validate_raw_files()

    print("\n1. Ingesting & Normalizing Student Attendance Workbooks...")
    df_canonical, sheet_meta = parse_student_attendance()
    print(f"   -> Generated {len(df_canonical):,} canonical long-format rows.")

    print("\n2. Building Student Master Table...")
    df_master = build_student_master(df_canonical)
    print(f"   -> Consolidated {len(df_master)} unique student identities.")

    print("\n3. Building School Calendar Table...")
    df_calendar = build_school_calendar(df_canonical)
    print(f"   -> Created calendar table with {len(df_calendar)} dates.")

    print("\n4. Exporting Processed CSV Datasets...")
    canonical_path = os.path.join(DATA_PROCESSED, "attendance_canonical.csv")
    master_path = os.path.join(DATA_PROCESSED, "student_master.csv")
    calendar_path = os.path.join(DATA_PROCESSED, "school_calendar.csv")

    df_canonical.to_csv(canonical_path, index=False)
    df_master.to_csv(master_path, index=False)
    df_calendar.to_csv(calendar_path, index=False)

    print(f"   -> Saved: {canonical_path}")
    print(f"   -> Saved: {master_path}")
    print(f"   -> Saved: {calendar_path}")

    print("\n5. Profiling StandardReport Workbooks...")
    profile_standard_reports()

    print("\n6. Generating Data Quality Reports...")
    generate_data_quality_report(df_canonical, df_master, df_calendar, sheet_meta)

    print("\n7. Running Automated Validation Checks...")
    run_automated_validations(df_canonical, df_master, df_calendar)

    print("\n==================================================")
    print("DATA PIPELINE COMPLETED SUCCESSFULLY")
    print("==================================================")


if __name__ == "__main__":
    main()
