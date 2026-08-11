# 🧬 CancerDx AI — Multi-Modal Explainable Deep Learning Framework for Early Cancer Diagnosis

> **Final Year Project** | Multi-Modal Explainable Deep Learning Framework for Early Cancer Diagnosis and Prognosis

A clinical decision-support dashboard that fuses **Whole Slide Image (WSI)** analysis with **Clinical/Genomic data** to provide breast cancer diagnosis and 5-year survival prognosis, backed by **Grad-CAM** and **SHAP** explainability.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend :5173                       │
│         (Glassmorphism Dark UI + Recharts + OpenSeadragon)   │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST / HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│               Express.js Backend :5000                        │
│           (JWT Auth + RBAC + MongoDB/Mongoose)               │
└──────────────┬────────────────────┬────────────────────────┘
               │ Mongoose ODM        │ Axios (internal)
    ┌──────────▼──────┐    ┌────────▼───────────────────────┐
    │  MongoDB :27017  │    │   FastAPI ML Service :8000      │
    │  (Users, Cases,  │    │   (PyTorch + captum + shap)    │
    │   Results)       │    │   [ResNet50 + MLP + Attention] │
    └──────────────────┘    └────────────────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- MongoDB >= 6.0 (running locally on port 27017)

### 1. Initialize MongoDB
```bash
mongosh cancer_diagnosis < database/mongo_init.js
```

### 2. Start the ML Service
```bash
cd ml_service
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Start the Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI=mongodb://localhost:27017/cancer_diagnosis
npm run dev
```

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital.com` | `admin123` |
| Physician | `dr.smith@hospital.com` | `physician123` |
| Auditor | `auditor@hospital.com` | `physician123` |

---

## 🤖 ML Training Pipeline

### Download Data
```bash
cd ml_service

# Option 1: Download real TCGA-BRCA clinical data from cBioPortal
python -m training.download_data --output_dir ./data --mode clinical

# Option 2: Generate synthetic dataset for testing (no internet required)
python -m training.download_data --output_dir ./data --mode synthetic
```

### Train the Model
```bash
python -m training.train \
  --data_root ./data \
  --epochs 50 \
  --batch_size 16 \
  --lr 1e-4 \
  --device cuda \      # or cpu
  --save_dir ./weights
```

### Evaluate
```bash
python -m training.evaluate \
  --model_path ./weights/multimodal_best.pth \
  --data_root ./data
```

---

## 🔬 Model Architecture

| Component | Details |
|-----------|---------|
| Image Branch | ResNet50 (ImageNet pretrained) → 512-dim embedding |
| Tabular Branch | MLP (10→256→128→64-dim) |
| Fusion | Cross-Attention (Q=image, K/V=tabular) → 128-dim |
| Diagnosis Head | Linear(128,2) → Softmax |
| Prognosis Head | Linear(128,1) → Sigmoid |

**XAI:**
- **Grad-CAM**: via `captum.attr.LayerGradCam` on ResNet50 `layer4`
- **SHAP**: via `shap.DeepExplainer` on tabular branch

---

## 📋 Clinical Features (TCGA-BRCA)

| Feature | Type | Range |
|---------|------|-------|
| Age | Continuous | 20–90 |
| Tumor Size | Continuous (mm) | 1–200 |
| Lymph Nodes | Integer | 0–30 |
| ER Status | Binary | 0/1 |
| PR Status | Binary | 0/1 |
| HER2 Status | Binary | 0/1 |
| Grade | Ordinal | 1/2/3 |
| Ki-67 | Continuous (%) | 0–100 |
| TP53 Mutation | Binary | 0/1 |
| BRCA1 Mutation | Binary | 0/1 |

---

## 🛡️ Security

- **Authentication**: JWT (8h expiry) via httpOnly cookies + Bearer tokens
- **RBAC**: Admin / Physician / Auditor roles enforced at route level
- **Passwords**: bcrypt (12 salt rounds)
- **Patient Privacy**: UUID-based anonymization, no PII in inference pipeline
- **File Validation**: MIME type + extension whitelist

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
# ML API:   http://localhost:8000
# MongoDB:  localhost:27017
```

---

## 📁 Project Structure

```
Final Year Project/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Express.js + MongoDB/Mongoose
├── ml_service/        # FastAPI + PyTorch + Training Pipeline
│   ├── app/           # Inference server
│   └── training/      # TCGA-BRCA dataset + training scripts
├── database/          # MongoDB initialization
└── docker-compose.yml
```

---

## 🎓 Academic Context

**Title**: Multi-Modal Explainable Deep Learning Framework for Early Cancer Diagnosis and Prognosis

**Key Contributions**:
1. Cross-attention fusion of heterogeneous modalities (image + tabular)
2. Integrated XAI pipeline (Grad-CAM + SHAP) for clinical transparency
3. End-to-end clinical decision support interface with RBAC

**Dataset**: TCGA-BRCA (The Cancer Genome Atlas — Breast Invasive Carcinoma)
- Clinical data: [cBioPortal](https://www.cbioportal.org/study/summary?id=brca_tcga)
- WSI images: [GDC Data Portal](https://portal.gdc.cancer.gov/projects/TCGA-BRCA)
