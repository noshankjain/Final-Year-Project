"""
FastAPI application entry point.
Loads trained model weights at startup and exports `model` for use in routers.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import logging
import torch
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from app.routers import predict, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Multi-Modal Cancer Diagnosis API",
    version="1.0.0",
    description="Multimodal breast cancer diagnosis using ResNet50 + MLP + Cross-Attention fusion.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})

os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.getenv("UPLOAD_DIR", "./uploads")), name="uploads")

app.include_router(predict.router, prefix="/api/v1")
app.include_router(health.router)

# ── Module-level model variable exported for use in predict.py / gradcam.py ──
model: Optional[object] = None


@app.on_event("startup")
async def startup_event():
    global model
    weights_path = os.getenv("MODEL_WEIGHTS_PATH", "./weights/multimodal_best.pth")

    if not os.path.exists(weights_path):
        logger.warning(f"Model weights not found at '{weights_path}'. Starting in DEMO_MODE.")
        os.environ["DEMO_MODE"] = "True"
        return

    try:
        from app.models.multimodal import MultiModalCancerModel
        _model = MultiModalCancerModel()
        _model.load_state_dict(
            torch.load(weights_path, map_location=torch.device("cpu"))
        )
        _model.eval()
        model = _model
        os.environ["DEMO_MODE"] = "False"
        logger.info(f"** Model loaded from '{weights_path}' — DEMO_MODE = False **")
        logger.info(f"   Trainable params: {sum(p.numel() for p in _model.parameters() if p.requires_grad):,}")
    except Exception as e:
        logger.error(f"Failed to load model weights: {e}")
        logger.warning("Falling back to DEMO_MODE = True")
        os.environ["DEMO_MODE"] = "True"
