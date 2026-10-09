import os
import sys
from pathlib import Path
import uvicorn

# Ensure the backend directory is in sys.path even when executed from project root
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("RELOAD", "false").lower() in ("true", "1")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=reload)
