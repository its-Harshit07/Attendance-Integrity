# StandardReport Profiling Report

## Overview
- **Total StandardReport Workbooks Profiled**: 5
- **Sheets per Workbook**: 62

## Summary of Standard Report Structure

Each StandardReport workbook corresponds to an operational biometric/attendance system output and contains 62 sheets:
1. **`Schedule Infor.`**: Contains employee/person shift schedules, working hours, and timetables.
2. **`Att. Stat.`**: Summarizes aggregated attendance metrics (duty days, actual workdays, late times, leave early times, absent days).
3. **`Att.log report`**: Log of timestamped check-in and check-out events per person.
4. **`Exception Stat.`**: Detailed log of exceptions (late check-ins, early departures, missing clock-in/out).
5. **Individual ID Sheets (58 sheets per file)**: Detailed daily punch records and time-zone allocations for anonymized individual person IDs (e.g. `1.55.113`, `147.149.150`).

## Profiled Workbooks Breakdown

| Workbook Name | Total Sheets | Exception Stat. Rows | Person Timesheets |
|---|---|---|---|
| `10-OKTOBER_StandardReport_ANON.xlsx` | 62 | 2821 | 58 |
| `11-NOVEMBER_StandardReport_ANON.xlsx` | 62 | 2478 | 58 |
| `12-DESEMBER_StandardReport_ANON.xlsx` | 62 | 1879 | 58 |
| `8-AGUSTUS_StandardReport_ANON.xlsx` | 62 | 2504 | 58 |
| `9-SEPTEMBER_StandardReport_ANON.xlsx` | 62 | 2602 | 58 |

## Key Operational Fields & Error Patterns for Anomaly Injection

StandardReports provide rich operational details that will inform controlled capture-error / anomaly modeling:
- **Check-in / Check-out Timestamps**: Discrepancies between physical check-in punches and manual register marks.
- **Late Arrival & Early Departure Minutes**: Threshold-based exceptions.
- **Missing Punch Records**: Single clock-in without corresponding clock-out.
- **On-duty vs AFL (Absence) Flags**: Discrepancies where a person is marked absent in the register but logged on-duty in biometric logs.
