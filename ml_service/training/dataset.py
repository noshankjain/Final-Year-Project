"""
Real Dataset Loader for Multi-Modal Breast Cancer Training
==========================================================
Combines:
  1. Multi-Modal Kaggle Dataset  → Images (PNG) + Clinical CSV + Molecular CSV
  2. BreakHis Dataset            → Histopathology images (100X magnification, binary)

The loader produces (image_tensor, tabular_tensor, diagnosis_label, prognosis_value)
for every sample, which is exactly what MultiModalCancerModel expects.

Dataset statistics:
  Kaggle Multi-Modal:  780 patients  (437 benign, 210 malignant, 133 normal→benign)
  BreakHis 100X:       2081 images   (644 benign, 1437 malignant) — histopathology
  TOTAL:               ~2861 samples (after merge + augmentation)
"""

import os
import glob
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, ConcatDataset
from torchvision import transforms
from PIL import Image
from sklearn.model_selection import train_test_split


# ─────────────────────────────────────────────────────────────────────────────
# Column name mapping  (raw CSV names → our model feature names)
# ─────────────────────────────────────────────────────────────────────────────
CLINICAL_COL_MAP = {
    'Age at Diagnosis':          'age',
    'Tumor Size':                'tumor_size',
    'Lymph nodes examined positive': 'lymph_nodes',
    'ER Status':                 'er_status_raw',   # will convert 'Positive'→1
    'HER2 Status':               'her2_status_raw',
    'Neoplasm Histologic Grade': 'grade',
    'Overall Survival (Months)': 'survival_months',
    'class':                     'diagnosis_raw',
    'Patient ID':                'patient_id',
}

# Molecular CSV adds PR status
MOLECULAR_COL_MAP = {
    'Patient ID':  'patient_id',
    'PR Status':   'pr_status_raw',
}

# Our model's 10 tabular features + their default fill values (TCGA-BRCA medians)
MODEL_FEATURES = ['age', 'tumor_size', 'lymph_nodes', 'er_status',
                  'pr_status', 'her2_status', 'grade', 'ki67',
                  'tp53_mutation', 'brca1_mutation']

FEATURE_DEFAULTS = {
    'age':           58.5,
    'tumor_size':    27.8,
    'lymph_nodes':   2.0,
    'er_status':     1.0,
    'pr_status':     1.0,
    'her2_status':   0.0,
    'grade':         2.0,
    'ki67':          22.3,
    'tp53_mutation': 0.0,
    'brca1_mutation':0.0,
}

CONTINUOUS_STATS = {
    'age':         {'mean': 58.5,  'std': 13.2},
    'tumor_size':  {'mean': 27.8,  'std': 20.1},
    'lymph_nodes': {'mean': 2.1,   'std': 4.3},
    'ki67':        {'mean': 22.3,  'std': 19.8},
}


def _get_transforms(split: str):
    if split == 'train':
        return transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15, hue=0.05),
            transforms.RandomRotation(20),
            transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
    else:
        return transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])


def _normalize_tabular(values: dict) -> np.ndarray:
    """Z-score normalize the 10 model features."""
    arr = []
    for feat in MODEL_FEATURES:
        val = float(values.get(feat, FEATURE_DEFAULTS[feat]))
        if feat in CONTINUOUS_STATS:
            val = (val - CONTINUOUS_STATS[feat]['mean']) / (CONTINUOUS_STATS[feat]['std'] + 1e-8)
        arr.append(val)
    return np.array(arr, dtype=np.float32)


def _binary_status(raw) -> float:
    """Convert 'Positive'/'Negative'/'Yes'/'No' to 1.0/0.0."""
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip().lower()
    return 1.0 if s in ('positive', 'yes', '1', 'positve') else 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Dataset 1: Multi-Modal Kaggle Dataset
# Images in dataset1/{benign,malignant,normal}/images/
# Clinical CSV in dataset2/patient_history_dataset.csv
# Molecular CSV in dataset3/molecular_biomarker_dataset.csv
# ─────────────────────────────────────────────────────────────────────────────

class MultiModalKaggleDataset(Dataset):
    """
    780 patients with PNG images + clinical + molecular data.
    patient_id (e.g. MB-0002) links images ↔ CSV rows.
    'normal' class mapped to benign (0). 'malignant' → 1.
    """

    def __init__(self, dataset_root: str, split: str = 'train', random_seed: int = 42):
        self.transform = _get_transforms(split)

        # ── Load and merge CSVs ──
        csv2 = pd.read_csv(os.path.join(dataset_root, 'dataset2', 'patient_history_dataset.csv'))
        csv3 = pd.read_csv(os.path.join(dataset_root, 'dataset3', 'molecular_biomarker_dataset.csv'))

        csv2 = csv2.rename(columns={'Patient ID': 'patient_id'})
        csv3 = csv3.rename(columns={'Patient ID': 'patient_id'})[['patient_id', 'PR Status']]
        df   = csv2.merge(csv3, on='patient_id', how='left')

        # ── Build image_path → patient_id map ──
        img_dir = os.path.join(dataset_root, 'dataset1')
        records = []
        for cls_folder in ['benign', 'malignant', 'normal']:
            cls_path = os.path.join(img_dir, cls_folder, 'images')
            if not os.path.isdir(cls_path):
                continue
            for img_file in sorted(glob.glob(os.path.join(cls_path, '*.png'))):
                pid = os.path.splitext(os.path.basename(img_file))[0]   # e.g. MB-0002
                row = df[df['patient_id'] == pid]
                if row.empty:
                    continue
                row = row.iloc[0]

                # Diagnosis label
                raw_cls = str(row['class']).strip().lower()
                diagnosis = 1 if raw_cls == 'malignant' else 0

                # Tabular features
                tabular = {
                    'age':            row.get('Age at Diagnosis', FEATURE_DEFAULTS['age']),
                    'tumor_size':     row.get('Tumor Size', FEATURE_DEFAULTS['tumor_size']),
                    'lymph_nodes':    row.get('Lymph nodes examined positive', FEATURE_DEFAULTS['lymph_nodes']),
                    'er_status':      _binary_status(row.get('ER Status', 'Positive')),
                    'pr_status':      _binary_status(row.get('PR Status', 'Positive')),
                    'her2_status':    _binary_status(row.get('HER2 Status', 'Negative')),
                    'grade':          float(row.get('Neoplasm Histologic Grade', 2.0)),
                    'ki67':           FEATURE_DEFAULTS['ki67'],   # not in this dataset → median
                    'tp53_mutation':  FEATURE_DEFAULTS['tp53_mutation'],
                    'brca1_mutation': FEATURE_DEFAULTS['brca1_mutation'],
                }

                # Prognosis: normalise survival months → 0-1 (120 months = 10 years)
                surv = float(row.get('Overall Survival (Months)', 60.0))
                prognosis = float(np.clip(surv / 120.0, 0.0, 1.0))

                records.append({
                    'img_path':  img_file,
                    'tabular':   _normalize_tabular(tabular),
                    'diagnosis': diagnosis,
                    'prognosis': prognosis,
                    'patient_id': pid,
                })

        if not records:
            raise RuntimeError(f'No matching images found in {dataset_root}')

        # ── Stratified train/val/test split ──
        labels = [r['diagnosis'] for r in records]
        train_idx, temp_idx = train_test_split(range(len(records)), test_size=0.30,
                                               stratify=labels, random_state=random_seed)
        temp_labels = [labels[i] for i in temp_idx]
        val_idx, test_idx = train_test_split(temp_idx, test_size=0.50,
                                             stratify=temp_labels, random_state=random_seed)

        if split == 'train':
            self.records = [records[i] for i in train_idx]
        elif split == 'val':
            self.records = [records[i] for i in val_idx]
        else:
            self.records = [records[i] for i in test_idx]

        print(f'[MultiModalKaggle] {split}: {len(self.records)} samples '
              f'({sum(r["diagnosis"] for r in self.records)} malignant)')

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        r = self.records[idx]
        img = Image.open(r['img_path']).convert('RGB')
        img = self.transform(img)
        return {
            'image':     img,
            'tabular':   torch.tensor(r['tabular'], dtype=torch.float32),
            'diagnosis': r['diagnosis'],
            'prognosis': r['prognosis'],
        }


# ─────────────────────────────────────────────────────────────────────────────
# Dataset 2: BreakHis Histopathology Dataset
# Images in classificacao_binaria/{40X,100X,200X,400X}/{benign,malignant}/
# No clinical tabular data → use TCGA-BRCA population medians (filled as 0 after z-score)
# We use 40X magnification (closest to WSI tile extraction)
# ─────────────────────────────────────────────────────────────────────────────

class BreakHisDataset(Dataset):
    """
    7,909 histopathology images across 4 magnifications (40X, 100X, 200X, 400X).
    We use ALL magnifications from classificacao_binaria for maximum training coverage.
    Binary labels: benign=0, malignant=1.
    No per-patient clinical data -> tabular tensor = zeros (normalised means).

    Folder layout expected:
      breakhis_root/
        classificacao_binaria/
          40X/{benign,malignant}/
          100X/{benign,malignant}/
          200X/{benign,malignant}/
          400X/{benign,malignant}/
    """

    MAGNIFICATIONS = ['40X', '100X', '200X', '400X']

    def __init__(self, breakhis_root: str, split: str = 'train', random_seed: int = 42):
        self.transform = _get_transforms(split)

        records = []
        for mag in self.MAGNIFICATIONS:
            for cls_name, label in [('benign', 0), ('malignant', 1)]:
                img_dir = os.path.join(
                    breakhis_root, 'classificacao_binaria', mag, cls_name
                )
                if not os.path.isdir(img_dir):
                    continue
                for img_path in sorted(
                    glob.glob(os.path.join(img_dir, '*.png')) +
                    glob.glob(os.path.join(img_dir, '*.jpg'))
                ):
                    records.append({
                        'img_path':  img_path,
                        'diagnosis': label,
                        'mag':       mag,
                    })

        if not records:
            raise RuntimeError(
                f'No BreakHis images found in {breakhis_root}/classificacao_binaria/. '
                f'Expected folders: 40X/benign, 40X/malignant, 100X/benign, ...'
            )

        # Split
        labels = [r['diagnosis'] for r in records]
        train_idx, temp_idx = train_test_split(
            range(len(records)), test_size=0.30, stratify=labels, random_state=random_seed
        )
        temp_labels = [labels[i] for i in temp_idx]
        val_idx, test_idx = train_test_split(
            temp_idx, test_size=0.50, stratify=temp_labels, random_state=random_seed
        )

        if split == 'train':
            self.records = [records[i] for i in train_idx]
        elif split == 'val':
            self.records = [records[i] for i in val_idx]
        else:
            self.records = [records[i] for i in test_idx]

        # Default tabular tensor -- zeros after z-score = population mean
        self._default_tabular = torch.zeros(10, dtype=torch.float32)

        n_mal = sum(r['diagnosis'] for r in self.records)
        print(f'[BreakHis all-mag] {split}: {len(self.records)} samples '
              f'({n_mal} malignant, {len(self.records)-n_mal} benign)')

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        r = self.records[idx]
        img = Image.open(r['img_path']).convert('RGB')
        img = self.transform(img)
        return {
            'image':     img,
            'tabular':   self._default_tabular,
            'diagnosis': r['diagnosis'],
            'prognosis': 0.5,   # unknown survival → neutral value
        }


# ─────────────────────────────────────────────────────────────────────────────
# Combined Dataset Factory
# ─────────────────────────────────────────────────────────────────────────────

def build_datasets(kaggle_root: str, breakhis_root: str, split: str = 'train'):
    """
    Returns a ConcatDataset of Kaggle Multi-Modal + BreakHis.
    Falls back gracefully if either source is unavailable.
    """
    datasets = []

    try:
        ds_kaggle = MultiModalKaggleDataset(kaggle_root, split=split)
        datasets.append(ds_kaggle)
    except Exception as e:
        print(f'[WARNING] Could not load Kaggle dataset: {e}')

    try:
        ds_breakhis = BreakHisDataset(breakhis_root, split=split)
        datasets.append(ds_breakhis)
    except Exception as e:
        print(f'[WARNING] Could not load BreakHis dataset: {e}')

    if not datasets:
        raise RuntimeError('No datasets could be loaded. Check your paths.')

    combined = ConcatDataset(datasets)
    print(f'[Combined] {split}: {len(combined)} total samples')
    return combined


def get_class_weights(combined_dataset) -> torch.Tensor:
    """
    Compute inverse-frequency class weights for WeightedRandomSampler.
    Handles ConcatDataset containing multiple dataset types.
    """
    labels = []
    for ds in combined_dataset.datasets:
        labels.extend([r['diagnosis'] for r in ds.records])
    counts = np.bincount(labels)
    weights = 1.0 / (counts + 1e-6)
    return torch.tensor(weights, dtype=torch.float32)
