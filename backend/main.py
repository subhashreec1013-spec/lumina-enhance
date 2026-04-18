"""
Lumina Enhance — FastAPI Backend
Adaptive multi-frame low-light image enhancement API.
"""

import os
import uuid
import asyncio
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from pipeline.enhancement import EnhancementPipeline

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Lumina Enhance API",
    description="Adaptive multi-frame low-light enhancement pipeline",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output directory
OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

# Job store (in-memory for single-server; replace with Redis for prod)
jobs: dict = {}

pipeline = EnhancementPipeline()


# ── Utility helpers ────────────────────────────────────────────────────────

def _read_upload(data: bytes) -> np.ndarray:
    """Decode uploaded bytes to BGR numpy array."""
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Ensure it is a valid JPEG/PNG/WEBP.")
    return img


def _save_image(img: np.ndarray, job_id: str, suffix: str) -> str:
    """Save image to outputs directory, return relative URL path."""
    filename = f"{job_id}_{suffix}.jpg"
    filepath = OUTPUTS_DIR / filename
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
    cv2.imwrite(str(filepath), img, encode_params)
    return f"/outputs/{filename}"


async def _run_enhancement(job_id: str, frames_data: list[bytes]):
    """Background task: run pipeline and update job state."""
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 0
    jobs[job_id]["message"] = "Starting..."

    try:
        # Decode frames
        frames = [_read_upload(d) for d in frames_data]

        def progress_cb(pct: int, msg: str):
            jobs[job_id]["progress"] = pct
            jobs[job_id]["message"] = msg

        # Run pipeline (CPU-bound — run in thread executor)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: pipeline.enhance(frames, progress_callback=progress_cb)
        )

        # Save outputs
        original_url = _save_image(result["original"], job_id, "original")
        enhanced_url = _save_image(result["enhanced"], job_id, "enhanced")

        jobs[job_id].update({
            "status": "done",
            "progress": 100,
            "message": "Enhancement complete!",
            "original_url": original_url,
            "enhanced_url": enhanced_url,
            "metadata": result["metadata"],
            "params": result["params"],
        })

    except Exception as e:
        jobs[job_id].update({
            "status": "error",
            "progress": 0,
            "message": str(e),
        })


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/enhance")
async def enhance_image(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...)
):
    """
    Submit one or more image frames for enhancement.
    Returns a job_id to poll for status.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if len(files) > 8:
        raise HTTPException(status_code=400, detail="Maximum 8 frames allowed")

    # Validate file types
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/tiff"}
    frames_data = []
    for f in files:
        ct = f.content_type or ""
        if ct not in allowed_types and not f.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ct}")
        data = await f.read()
        if len(data) > 20 * 1024 * 1024:  # 20 MB limit per file
            raise HTTPException(status_code=400, detail="File too large (max 20MB per file)")
        frames_data.append(data)

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "Queued...",
        "created_at": time.time(),
        "num_frames": len(frames_data),
    }

    background_tasks.add_task(_run_enhancement, job_id, frames_data)
    return {"job_id": job_id, "status": "queued"}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """Poll job status and progress."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.get("/result/{job_id}")
async def get_result(job_id: str):
    """Retrieve completed enhancement result."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail=f"Job not ready: {job['status']}")

    return job


@app.get("/outputs/{filename}")
async def serve_output(filename: str):
    """Serve processed images."""
    # Security: only alphanumeric + dash + underscore + dot
    import re
    if not re.match(r'^[\w\-\.]+$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = OUTPUTS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(path), media_type="image/jpeg")


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Clean up job and associated files."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs.pop(job_id)
    for key in ("original_url", "enhanced_url"):
        url = job.get(key, "")
        if url:
            filepath = Path(url.lstrip("/"))
            if filepath.exists():
                filepath.unlink(missing_ok=True)

    return {"deleted": job_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
