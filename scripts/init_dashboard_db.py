"""
Attendance Integrity System - Dashboard DB Initialization Wrapper Script
File: scripts/init_dashboard_db.py

Wraps seed_demo_data() to populate operational database from Phase 4 evaluation data.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from scripts.seed_demo_data import seed_demo_data


def main():
    print("==================================================")
    print("INITIALIZING DASHBOARD DATABASE FROM PHASE 4 DATA")
    print("==================================================")
    seed_demo_data()
    print("==================================================")


if __name__ == "__main__":
    main()
