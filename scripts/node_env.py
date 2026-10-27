"""Shared helper: makes sure `node` is available (installing it with winget on Windows)."""
import os
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent


def ensure_node():
    if shutil.which("node") is not None:
        return
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


def run_js(script, *args):
    """Runs scripts/<script> with node and exits with its exit code on failure."""
    ensure_node()
    result = subprocess.run(["node", str(root / "scripts" / script), *args], cwd=root)
    if result.returncode != 0:
        sys.exit(result.returncode)
