<div align="center">

# OncoSight
### Multimodal Explainable Deep Learning for Breast Cancer Diagnosis and Prognosis

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.1-red?style=flat-square&logo=pytorch)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**Test AUC: 0.9886 | Accuracy: 96.88% | F1: 0.9724**

[Overview](#overview) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Model Details](#model-details) · [API Reference](#api-reference) · [Results](#results)

</div>

---

## Overview

OncoSight is a full-stack clinical decision support system that fuses **histopathology image analysis** with **structured patient clinical data** to deliver breast cancer diagnosis and 5-year survival prognosis — with built-in explainability via Grad-CAM and SHAP.

### What Makes This Different

| Feature | Typical Systems | OncoSight |
|---|---|---|
| Input | Image only OR clinical data only | Both fused via Cross-Attention |
| Output | Diagnosis only | Diagnosis + 5-year survival prognosis |
| Explainability | Black box | Grad-CAM (visual) + SHAP (features) |
| Missing data | Fails | Patient Mode estimates missing parameters from image |
| Interface | Jupyter notebook | Full clinical web application |
| Users | Researchers only | Clinician Mode + Patient Mode |
| AUC | 0.88-0.94 (published avg) | **0.9886** |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              React Frontend  (port 5173)                 │
│     Clinical Dashboard · Case Management · XAI Views     │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────┐
│            Express.js Backend  (port 5000)               │
│     JWT Auth · RBAC · MongoDB · Case Lifecycle           │
└──────────────┬──────────────────────┬───────────────────┘
               │ Mongoose ODM         │ Axios (internal HTTP)
   ┌───────────▼──────────┐  ┌────────▼──────────────────┐
   │  MongoDB  (port 27017)│  │  FastAPI ML  (port 8000)  │
   │  Users · Cases        │  │  ResNet50 + MLP +         │
   │  InferenceResults     │  │  Cross-Attention Fusion   │
   └───────────────────────┘  │  Grad-CAM · SHAP · Prognosis│
                               └───────────────────────────┘
```

### ML Model Architecture

```
Histopathology Image (224×224)          10 Clinical Biomarkers
         │                                        │
  ┌──────▼──────┐                       ┌─────────▼────────┐
  │  ResNet50   │                       │   MLP (Tabular)  │
  │  (50 layers)│                       │  10→256→128→64   │
  │  7 frozen   │                       │  BatchNorm+Drop  │
  └──────┬──────┘                       └─────────┬────────┘
         │ 512-dim embedding                       │ 64-dim embedding
         └──────────────┬──────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │  Cross-Attention   │
              │  Fusion Module     │
              │  (4 heads, 128-dim)│
              │  Q=image, K/V=clin │
              └─────┬──────────┬───┘
                    │          │
           ┌────────▼──┐  ┌────▼──────────┐
           │ Diagnosis │  │  Prognosis    │
           │ Softmax   │  │  Sigmoid      │
           │ (2 class) │  │  (0-1 score) │
           └───────────┘  └───────────────┘
```

---

## Quick Start

### Prerequisites

Make sure you have these installed:

| Tool | Version | Download |
|---|---|---|
| Node.js | >= 18 | [nodejs.org](https://nodejs.org) |
| Python | >= 3.10 | [python.org](https://python.org) |
| MongoDB | >= 6.0 | [mongodb.com](https://www.mongodb.com/try/download/community) |
| Git | any | [git-scm.com](https://git-scm.com) |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/noshankjain/Final-Year-Project.git
cd Final-Year-Project
```

---

### Step 2 — Set Up the ML Service (FastAPI + PyTorch)

```bash
cd ml_service

# Create and activate a virtual environment (recommended)
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

> **Note:** The trained model weights (`multimodal_best.pth`) are not included in the repository due to file size (~99 MB). The system will automatically run in **DEMO MODE** if weights are not found — demo mode returns realistic randomized predictions based on input hash.

**To use the real trained model:**
- Download weights from the [Releases page](https://github.com/noshankjain/Final-Year-Project/releases) (if published)
- Or train your own — see [Training the Model](#training-the-model)
- Place the file at: `ml_service/weights/multimodal_best.pth`

**Start the ML service:**
```bash
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Model loaded successfully / DEMO_MODE=True
```

---

### Step 3 — Set Up the Backend (Express.js + MongoDB)

**First, start MongoDB** (in a separate terminal):
```bash
# On Windows (if installed as service, it may already be running)
# Check: open MongoDB Compass or run:
mongosh --eval "db.runCommand({ connectionStatus: 1 })"

# If not running, start it:
mongod --dbpath "C:\data\db"   # Windows
# or
mongod                          # macOS/Linux (if in PATH)
```

**Initialize the database with seed users:**
```bash
# From the project root:
mongosh cancer_diagnosis < database/mongo_init.js
```

**Set up the backend:**
```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and verify:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cancer_diagnosis
JWT_SECRET=change_this_to_a_long_random_secret_string
JWT_EXPIRES_IN=8h
ML_SERVICE_URL=http://localhost:8000
```

**Start the backend:**
```bash
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB connected successfully
```

---

### Step 4 — Set Up the Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open your browser at: **http://localhost:5173**

---

### One-Command Start (Windows)

If all prerequisites are installed, you can use the included batch script:

```bash
# From the project root:
START_PROJECT.bat
```

This opens separate terminal windows for each service automatically.

---

## Demo Credentials

Once the system is running, log in with:

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@hospital.com` | `admin123` | Full access — create users, delete cases, view all |
| **Physician** | `dr.smith@hospital.com` | `physician123` | Submit cases, view own results |
| **Auditor** | `auditor@hospital.com` | `auditor123` | Read-only — view all cases and results |

---

## Training the Model

### Datasets Used

| Dataset | Images | Source |
|---|---|---|
| **BreakHis** | 7,909 histopathology images (40x, 100x, 200x, 400x) | [Kaggle - BreakHis](https://www.kaggle.com/datasets/ambarish/breakhis) |
| **Multi-Modal Breast Cancer** | 780 patients (image + clinical CSV + biomarker CSV) | [Kaggle - Multimodal](https://www.kaggle.com/datasets) |

### Download Datasets

1. Download **BreakHis** from Kaggle and place at:
   ```
   ml_service/data/breakhis/
   ├── benign/
   │   ├── 40X/
   │   ├── 100X/
   │   ├── 200X/
   │   └── 400X/
   └── malignant/
       ├── 40X/
       ├── 100X/
       ├── 200X/
       └── 400X/
   ```

2. Download **Multi-Modal dataset** from Kaggle and place at:
   ```
   ml_service/data/multimodal/
   ├── dataset1/
   ├── dataset2/
   └── dataset3/
   ```

### Run Training

```bash
cd ml_service

# Activate virtual environment first
venv\Scripts\activate   # Windows
source venv/bin/activate # macOS/Linux

# Train the model
python -m training.train \
  --data_root ./data \
  --epochs 15 \
  --batch_size 16 \
  --lr 3e-4 \
  --device cpu \
  --save_dir ./weights
```

**Training output example:**
```
Epoch 1/15 | Train Loss: 0.4821 | Val AUC: 0.9234
Epoch 5/15 | Train Loss: 0.2103 | Val AUC: 0.9712
Epoch 7/15 | Train Loss: 0.1456 | Val AUC: 0.9951 ← Best model saved
Epoch 15/15 | Early stopping triggered
Training complete. Best Val AUC: 0.9951 at epoch 7
```

Training takes approximately **60 minutes on CPU** (4 min/epoch × 15 epochs).

---

## Model Details

### Architecture

| Component | Details |
|---|---|
| **Image Branch** | ResNet50 (ImageNet pretrained, first 7 layers frozen) → 512-dim |
| **Tabular Branch** | MLP: 10→256→128→64 with BatchNorm + Dropout(0.3) |
| **Fusion** | Cross-Attention: Q=image(512→128), K/V=clinical(64→128), 4 heads |
| **Diagnosis Head** | Linear(128→2) → Softmax |
| **Prognosis Head** | Linear(128→1) → Sigmoid |
| **Loss** | Focal Loss (diagnosis) + 0.2 × MSE (prognosis) |
| **Optimizer** | AdamW (lr=3e-4, weight_decay=1e-4) |

### Clinical Input Features (10 Biomarkers)

| Feature | Type | Range | Clinical Meaning |
|---|---|---|---|
| Age | Continuous | 20-90 | Patient age at diagnosis |
| Tumor Size | Continuous (mm) | 1-200 | Maximum tumor diameter |
| Lymph Nodes | Integer | 0-30 | Number of positive lymph nodes |
| ER Status | Binary | 0/1 | Estrogen receptor positive/negative |
| PR Status | Binary | 0/1 | Progesterone receptor positive/negative |
| HER2 Status | Binary | 0/1 | HER2/neu receptor positive/negative |
| Grade | Ordinal | 1/2/3 | Histological tumor grade (1=low, 3=high) |
| KI67 | Continuous (%) | 0-100 | Cell proliferation index |
| TP53 Mutation | Binary | 0/1 | TP53 tumor suppressor gene mutation |
| BRCA1 Mutation | Binary | 0/1 | BRCA1 gene mutation status |

### Explainability

| Method | What it answers | Library |
|---|---|---|
| **Grad-CAM** | WHERE in the tissue is the model seeing cancer? | `captum.attr.LayerGradCam` on ResNet50 `layer4` |
| **SHAP** | WHICH biomarker drove this specific prediction? | `shap.DeepExplainer` on tabular branch |

---

## Results

### Test Set Performance (354 held-out images, never seen during training)

| Metric | Score |
|---|---|
| **AUC (ROC)** | **0.9886** |
| **Accuracy** | **96.88%** |
| **F1 Score** | **0.9724** |
| Best Val AUC | 0.9951 (epoch 7) |

### Per-Class Results

| Class | Precision | Recall | F1 |
|---|---|---|---|
| Benign | 96% | 97% | 96.5% |
| Malignant | 98% | 97% | 97.5% |

### Comparison with Literature

| Method | Typical AUC |
|---|---|
| Traditional ML (SVM, Random Forest) | 0.78-0.86 |
| CNN image-only | 0.85-0.92 |
| Published multimodal approaches | 0.88-0.94 |
| **OncoSight (ours)** | **0.9886** |

### Training Configuration

| Setting | Value |
|---|---|
| Dataset split | 70% train / 15% val / 15% test (stratified) |
| Training images | 1,651 |
| Validation images | 354 |
| Test images | 354 |
| Best epoch | 7 of 15 |
| Training time (CPU) | ~60 minutes |
| Early stopping patience | 8 epochs |

---

## Project Structure

```
Final-Year-Project/
│
├── frontend/                    # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/               # LoginPage, Dashboard, NewCase, Results
│   │   ├── components/
│   │   │   ├── shared/          # Sidebar, Navbar, StatusBadge
│   │   │   ├── dashboard/       # StatsCard, CasesTable
│   │   │   └── inference/       # DiagnosisCard, PrognosisCard, GradCAMViewer, SHAPChart
│   │   ├── context/             # AuthContext (JWT management)
│   │   └── services/            # Axios API client
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                     # Express.js + MongoDB
│   └── src/
│       ├── models/              # User, Case, InferenceResult (Mongoose schemas)
│       ├── controllers/         # auth, case, inference controllers
│       ├── routes/              # auth, case, inference, health routes
│       ├── middleware/          # JWT auth, RBAC, multer upload, error handler
│       └── server.js
│
├── ml_service/                  # FastAPI + PyTorch
│   ├── app/
│   │   ├── main.py              # FastAPI app, model loading, startup
│   │   ├── routers/
│   │   │   └── predict.py       # /api/v1/predict endpoint
│   │   ├── models/
│   │   │   ├── image_branch.py  # ResNet50 feature extractor
│   │   │   ├── tabular_branch.py# MLP for clinical data
│   │   │   └── fusion.py        # Cross-Attention + output heads
│   │   ├── preprocessing/
│   │   │   └── clinical_estimator.py # Patient mode: estimates missing biomarkers
│   │   └── schemas/
│   │       └── predict.py       # Pydantic request/response schemas
│   ├── training/
│   │   └── train.py             # Full training pipeline
│   ├── weights/                 # Model weights (not committed — see note above)
│   └── requirements.txt
│
├── database/
│   └── mongo_init.js            # Creates seed users (Admin, Physician, Auditor)
│
├── docker-compose.yml           # Full stack Docker deployment
├── START_PROJECT.bat            # Windows one-click start script
└── .env.example                 # Environment variable template
```

---

## API Reference

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| POST | `/api/auth/logout` | - | Clear session |
| GET | `/api/auth/me` | - | Get current user |

### Cases

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/cases` | Physician/Admin | Upload image + clinical data |
| GET | `/api/cases` | All roles | List cases (paginated) |
| GET | `/api/cases/:id` | All roles | Get single case |
| DELETE | `/api/cases/:id` | Admin only | Delete case |

### Inference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/cases/:id/analyze` | Physician/Admin | Trigger ML analysis |
| GET | `/api/cases/:id/results` | All roles | Get diagnosis + SHAP + Grad-CAM |

### ML Service (internal)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/predict` | Multipart: image file + clinical JSON |
| GET | `/health` | Service health check |

---

## Docker Deployment

For production-style deployment using Docker:

```bash
# Build and start all services
docker-compose up --build

# Services:
# Frontend  → http://localhost:5173
# Backend   → http://localhost:5000
# ML API    → http://localhost:8000
# MongoDB   → localhost:27017
```

---

## Security

- **Authentication**: JWT (8h expiry) via httpOnly cookies + Bearer tokens
- **Rate limiting**: Login capped at 10 attempts per 15 minutes
- **Password hashing**: bcrypt with 12 salt rounds
- **RBAC**: Admin / Physician / Auditor enforced at route level
- **Patient privacy**: UUID-based case anonymization, no PII in ML pipeline
- **File validation**: MIME type + extension whitelist on upload
- **Secrets**: Never committed — use `.env` (see `.env.example`)

---

## Dual User Modes

### Clinician Mode
- Upload histopathology image
- Enter all 10 clinical biomarkers manually
- Receive: Diagnosis + Confidence Interval + Prognosis Score + Grad-CAM + SHAP

### Patient Mode
- Upload image + age only
- System uses **ClinicalEstimator**: extracts 14 radiomic features from image → predicts 9 missing biomarkers
- Receive: Early Warning Score with per-parameter confidence labels

---

## Base Paper

This project is inspired by and extends:

> **Rashedi, S., Rashedi, A., Otroshi Shahreza, B., Tabatabaeian, M., & Abedi, I. (2026).**
> *Multimodal deep learning frameworks for breast cancer detection using ultrasound, mammography, and clinical data.*
> ScienceDirect. [DOI link](https://www.sciencedirect.com/science/article/pii/S2352914826000316)

**Key extensions beyond the base paper:**
1. Cross-Attention fusion instead of simple feature concatenation
2. Integrated Grad-CAM + SHAP explainability pipeline
3. Patient Mode with radiomic-based clinical estimation
4. Full end-to-end web application with RBAC

---

## Academic Context

**Project Title**: Multimodal Explainable Deep Learning Framework for Early Breast Cancer Diagnosis and Prognosis

**Key Contributions**:
1. Cross-Attention fusion of histopathology images and clinical biomarkers (AUC 0.9886)
2. Dual-output model — simultaneous diagnosis and 5-year survival prognosis
3. ClinicalEstimator — radiomic-based imputation of missing biomarkers (Patient Mode)
4. Integrated XAI pipeline (Grad-CAM + SHAP) on every prediction
5. Production-grade clinical web application with role-based access control

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Model not found` / DEMO MODE | Place `multimodal_best.pth` in `ml_service/weights/` |
| MongoDB connection error | Ensure MongoDB is running on port 27017 |
| `Port 5000 already in use` | Change `PORT` in `backend/.env` |
| `Port 8000 already in use` | Change port in `uvicorn` command and `backend/.env` ML_SERVICE_URL |
| Frontend blank screen | Check browser console — usually a CORS or backend connection issue |
| Slow inference | Normal on CPU — typical image takes 15-45 seconds |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built as a Final Year Engineering Project.
Trained on BreakHis + Kaggle Multi-Modal Breast Cancer Dataset.

</div>
