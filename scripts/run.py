"""Starts the emulator and runs the game in it (runs scripts/run-android.js).

Run with `python scripts/run.py` (Windows: `py scripts/run.py`). Add `--offline` for bots only.
"""
import sys

from node_env import run_js

run_js("setup.js")
run_js("run-android.js", *sys.argv[1:])
