"""Installs everything the project needs so F5 in VS Code works.

Run with `python scripts/setup.py` (Windows: `py scripts/setup.py`).
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent

if shutil.which("node") is None:
    if sys.platform == "win32" and shutil.which("winget"):
        print("Node.js לא נמצא. מתקין עם winget...")
        subprocess.run(
            ["winget", "install", "-e", "--id", "OpenJS.NodeJS.LTS",
             "--accept-source-agreements", "--accept-package-agreements"]
        )
    node_dir = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "nodejs"
    if shutil.which("node") is None and (node_dir / "node.exe").exists():
        os.environ["PATH"] = f"{node_dir}{os.pathsep}{os.environ['PATH']}"
    if shutil.which("node") is None:
        sys.exit("Node.js לא מותקן. הורד והתקן מ-https://nodejs.org ואז הרץ שוב.")

# scripts/setup.js skips the install when node_modules is already up to date.
result = subprocess.run(["node", str(root / "scripts" / "setup.js")], cwd=root)
if result.returncode != 0:
    sys.exit(result.returncode)

print("הכל מותקן. פתח את הפרויקט ב-VS Code ולחץ F5.")
