# Multi-Modal Cancer Diagnosis System

This is a complete FastAPI + PyTorch microservice.

## Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Configure `.env`: Copy `.env.example` to `.env`
3. Run the app: `uvicorn app.main:app --reload --port 8000`

## Demo Mode

If the model weights are not found at `weights/multimodal_best.pth`, the system automatically runs in DEMO MODE, generating realistic random outputs based on input clinical factors.

## Training

```bash
python -m training.download_data --output_dir ./data --mode synthetic
python -m training.train --data_root ./data --epochs 50 --batch_size 16
python -m training.evaluate --model_path ./weights/multimodal_best.pth --data_root ./data
```
