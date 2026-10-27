"""Installs everything the project needs (runs scripts/setup.js).

Run with `python scripts/setup.py` (Windows: `py scripts/setup.py`).
"""
from node_env import run_js

# setup.js installs dependencies, a JDK, the Android SDK and the emulator (all idempotent).
run_js("setup.js")
print("הכל מותקן. הרץ python scripts/run.py או לחץ F5 ב-VS Code.")
