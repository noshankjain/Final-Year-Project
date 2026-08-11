from fastapi import APIRouter
import torch
import os

router = APIRouter(tags=['health'])

@router.get('/health')
async def health():
    return {
        "status": "ok",
        "model_loaded": os.getenv("DEMO_MODE", "True").lower() == "false",
        "demo_mode": os.getenv("DEMO_MODE", "True").lower() == "true",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "torch_version": torch.__version__,
        "version": "1.0.0"
    }
