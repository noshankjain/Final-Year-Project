"""
Full Training Pipeline — MultiModal Breast Cancer Model
=======================================================
Trains the MultiModalCancerModel on:
  1. Kaggle Multi-Modal Dataset (images + clinical CSVs)
  2. BreakHis Histopathology Dataset (images only)

Usage:
  cd ml_service
  python -m training.train_real                          # fresh start
  python -m training.train_real --resume                 # resume from best checkpoint

Output:
  weights/multimodal_best.pth   ← Best model by validation AUC
  weights/multimodal_last.pth   ← Last epoch checkpoint
  weights/training_log.json     ← Full training history
"""

import os
import sys
import json
import time
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import DataLoader, WeightedRandomSampler
from tqdm import tqdm
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score, classification_report

# Ensure UTF-8 output on Windows so progress symbols don't crash
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from training.dataset import build_datasets, get_class_weights
from app.models.multimodal import MultiModalCancerModel

# ─── Portable Paths (relative to project root) ───────────────────────────────
# Resolves correctly on any machine regardless of username/drive.
_ML_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ml_service/
_PROJECT_DIR = os.path.dirname(_ML_DIR)                                     # Final Year Project/
_DATASETS    = os.path.join(_PROJECT_DIR, 'Datasets')

KAGGLE_ROOT   = os.path.join(
    _DATASETS,
    'Multi-Modal Breast Cancer Dataset(kaggle)',
    'dataset'
)
BREAKHIS_ROOT = os.path.join(
    _DATASETS,
    'BreakHis - Breast Cancer Histopathological Database',
    'dataset_cancer_v1'
)
WEIGHTS_DIR   = os.path.join(_ML_DIR, 'weights')

# ─── Hyperparameters ──────────────────────────────────────────────────────────
EPOCHS        = 30       # Sufficient for convergence on this dataset size
BATCH_SIZE    = 16       # Fits in ~4GB RAM (CPU)
LR            = 3e-4     # AdamW learning rate
WEIGHT_DECAY  = 1e-4
PATIENCE      = 8        # Early stopping patience
DIAG_WEIGHT   = 1.0      # Loss weight for diagnosis task
PROG_WEIGHT   = 0.2      # Loss weight for prognosis task (secondary)


def train_epoch(model, loader, optimizer, scaler, criterion_diag, criterion_prog, device, use_amp=False):
    model.train()
    total_loss = 0.0
    all_probs, all_labels = [], []

    pbar = tqdm(loader, desc='  Training', leave=False, ncols=100)
    for batch in pbar:
        imgs  = batch['image'].to(device)
        tabs  = batch['tabular'].to(device)
        dlabs = batch['diagnosis'].to(device)
        plabs = batch['prognosis'].float().to(device).unsqueeze(1)

        optimizer.zero_grad()
        # autocast only on CUDA — CPU autocast uses BFloat16 which breaks numpy
        if use_amp:
            with torch.amp.autocast('cuda'):
                diag_logits, prog_preds = model(imgs, tabs)
                loss = (DIAG_WEIGHT * criterion_diag(diag_logits, dlabs) +
                        PROG_WEIGHT * criterion_prog(prog_preds, plabs))
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            diag_logits, prog_preds = model(imgs, tabs)
            loss = (DIAG_WEIGHT * criterion_diag(diag_logits, dlabs) +
                    PROG_WEIGHT * criterion_prog(prog_preds, plabs))
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total_loss += loss.item()
        # Cast to float32 before numpy (guards against any future dtype issues)
        probs = torch.softmax(diag_logits.float(), dim=1)[:, 1].detach().cpu().numpy()
        all_probs.extend(probs.tolist())
        all_labels.extend(dlabs.cpu().numpy().tolist())
        pbar.set_postfix({'loss': f'{loss.item():.3f}'})

    avg_loss = total_loss / len(loader)
    try:
        train_auc = roc_auc_score(all_labels, all_probs)
    except Exception:
        train_auc = 0.5
    return avg_loss, train_auc


@torch.no_grad()
def val_epoch(model, loader, criterion_diag, criterion_prog, device):
    model.eval()
    total_loss = 0.0
    all_probs, all_labels = [], []

    for batch in tqdm(loader, desc='  Validation', leave=False, ncols=100):
        imgs  = batch['image'].to(device)
        tabs  = batch['tabular'].to(device)
        dlabs = batch['diagnosis'].to(device)
        plabs = batch['prognosis'].float().to(device).unsqueeze(1)

        diag_logits, prog_preds = model(imgs, tabs)
        loss = (DIAG_WEIGHT * criterion_diag(diag_logits, dlabs) +
                PROG_WEIGHT * criterion_prog(prog_preds, plabs))

        total_loss += loss.item()
        probs = torch.softmax(diag_logits.float(), dim=1)[:, 1].cpu().numpy()
        all_probs.extend(probs.tolist())
        all_labels.extend(dlabs.cpu().numpy().tolist())

    avg_loss = total_loss / len(loader)
    preds_bin = [1 if p >= 0.5 else 0 for p in all_probs]
    try:
        auc = roc_auc_score(all_labels, all_probs)
    except Exception:
        auc = 0.5
    f1  = f1_score(all_labels, preds_bin, zero_division=0)
    acc = accuracy_score(all_labels, preds_bin)

    return avg_loss, auc, f1, acc, all_labels, all_probs


def _save_log(weights_dir, log, best_epoch, best_auc, current_epoch):
    summary = {
        'best_epoch':   best_epoch,
        'best_val_auc': round(best_auc, 4),
        'total_epochs': current_epoch,
        'datasets_used': [
            'Multi-Modal Breast Cancer (Kaggle) -- images + clinical CSV + molecular CSV',
            'BreakHis Histopathology (40X) -- images',
        ],
        'history': log,
    }
    with open(os.path.join(weights_dir, 'training_log.json'), 'w') as f:
        json.dump(summary, f, indent=2)


def main():
    resume = '--resume' in sys.argv
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'\n{"="*60}')
    print(f'  CancerDx AI -- Real Model Training')
    print(f'  Device: {device}')
    print(f'  Epochs: {EPOCHS} | Batch: {BATCH_SIZE} | LR: {LR}')
    print(f'  Resume:  {resume}')
    print(f'{"="*60}\n')

    os.makedirs(WEIGHTS_DIR, exist_ok=True)

    # ── Load Datasets ──────────────────────────────────────────────────────────
    print('Loading datasets...')
    train_ds = build_datasets(KAGGLE_ROOT, BREAKHIS_ROOT, split='train')
    val_ds   = build_datasets(KAGGLE_ROOT, BREAKHIS_ROOT, split='val')
    test_ds  = build_datasets(KAGGLE_ROOT, BREAKHIS_ROOT, split='test')

    print(f'\nDataset sizes: Train={len(train_ds)} | Val={len(val_ds)} | Test={len(test_ds)}\n')

    # Weighted sampler to handle class imbalance
    class_weights = get_class_weights(train_ds)
    sample_weights = []
    for ds in train_ds.datasets:
        for r in ds.records:
            sample_weights.append(float(class_weights[r['diagnosis']]))
    sampler = WeightedRandomSampler(sample_weights, len(sample_weights), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,
                              num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False,
                              num_workers=0, pin_memory=False)
    test_loader  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False,
                              num_workers=0, pin_memory=False)

    # ── Build Model ────────────────────────────────────────────────────────────
    print('Building MultiModalCancerModel...')
    model = MultiModalCancerModel().to(device)
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f'Trainable parameters: {total_params:,}\n')

    # ── Optimiser + Scheduler ──────────────────────────────────────────────────
    optimizer  = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler  = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)
    # GradScaler only useful on CUDA; on CPU we skip it
    use_amp    = (device.type == 'cuda')
    scaler     = torch.amp.GradScaler('cuda') if use_amp else None

    # Class-weighted loss (handles benign/malignant imbalance)
    pos_weight = torch.tensor([class_weights[1] / class_weights[0]]).to(device)
    criterion_diag = nn.CrossEntropyLoss(weight=class_weights.to(device))
    criterion_prog = nn.MSELoss()

    # ── Resume from checkpoint ─────────────────────────────────────────────────
    best_auc   = 0.0
    patience   = 0
    log        = []
    best_epoch = 0
    start_epoch = 1

    best_ckpt  = os.path.join(WEIGHTS_DIR, 'multimodal_best.pth')
    log_path   = os.path.join(WEIGHTS_DIR, 'training_log.json')

    if resume and os.path.exists(best_ckpt):
        print(f'Loading checkpoint: {best_ckpt}')
        model.load_state_dict(torch.load(best_ckpt, map_location=device))
        # Read previous best AUC from log so we don't overwrite a better model
        if os.path.exists(log_path):
            with open(log_path) as f:
                prev = json.load(f)
            best_auc   = prev.get('best_val_auc', 0.0)
            start_epoch = prev.get('best_epoch', 1) + 1
            log        = prev.get('history', [])
            best_epoch = prev.get('best_epoch', 1)
            print(f'Resuming from epoch {start_epoch}  (prev best AUC={best_auc:.4f})')
        print()

    # ── Training Loop ──────────────────────────────────────────────────────────
    print(f'{"Epoch":>6} {"Train Loss":>11} {"Train AUC":>10} {"Val Loss":>10} {"Val AUC":>9} {"Val F1":>8} {"Val Acc":>8}')
    print('-' * 70)

    for epoch in range(start_epoch, EPOCHS + 1):
        t0 = time.time()

        train_loss, train_auc = train_epoch(
            model, train_loader, optimizer, scaler, criterion_diag, criterion_prog, device, use_amp
        )
        val_loss, val_auc, val_f1, val_acc, _, _ = val_epoch(
            model, val_loader, criterion_diag, criterion_prog, device
        )
        scheduler.step()

        elapsed = time.time() - t0
        print(f'{epoch:>6} {train_loss:>11.4f} {train_auc:>10.4f} {val_loss:>10.4f} '
              f'{val_auc:>9.4f} {val_f1:>8.4f} {val_acc:>8.4f}  ({elapsed:.0f}s)')

        log.append({
            'epoch': epoch, 'train_loss': round(train_loss, 4),
            'train_auc': round(train_auc, 4), 'val_loss': round(val_loss, 4),
            'val_auc': round(val_auc, 4), 'val_f1': round(val_f1, 4),
            'val_acc': round(val_acc, 4),
        })

        # Save last checkpoint
        torch.save(model.state_dict(), os.path.join(WEIGHTS_DIR, 'multimodal_last.pth'))

        # Save best model
        if val_auc > best_auc:
            best_auc   = val_auc
            best_epoch = epoch
            patience   = 0
            torch.save(model.state_dict(), os.path.join(WEIGHTS_DIR, 'multimodal_best.pth'))
            print(f'       ** NEW BEST saved (AUC={best_auc:.4f})')
            # Write log immediately so resume is safe even if training is killed
            _save_log(WEIGHTS_DIR, log, best_epoch, best_auc, epoch)
        else:
            patience += 1
            if patience >= PATIENCE:
                print(f'\nEarly stopping at epoch {epoch} (best epoch={best_epoch})')
                break

    # ── Final Test Evaluation ──────────────────────────────────────────────────
    print(f'\n{"="*60}')
    print(f'  Final Evaluation on Test Set')
    print(f'{"="*60}')
    model.load_state_dict(torch.load(os.path.join(WEIGHTS_DIR, 'multimodal_best.pth')))
    test_loss, test_auc, test_f1, test_acc, all_labels, all_probs = val_epoch(
        model, test_loader, criterion_diag, criterion_prog, device
    )
    preds_bin = [1 if p >= 0.5 else 0 for p in all_probs]
    print(f'Test AUC:      {test_auc:.4f}')
    print(f'Test F1:       {test_f1:.4f}')
    print(f'Test Accuracy: {test_acc:.4f}')
    print()
    print(classification_report(all_labels, preds_bin, target_names=['Benign', 'Malignant']))

    # Save training log
    summary = {
        'best_epoch': best_epoch,
        'best_val_auc': best_auc,
        'test_auc': round(test_auc, 4),
        'test_f1': round(test_f1, 4),
        'test_accuracy': round(test_acc, 4),
        'total_epochs': epoch,
        'datasets_used': [
            'Multi-Modal Breast Cancer (Kaggle) — images + clinical CSV + molecular CSV',
            'BreakHis Histopathology (40X) — images',
        ],
        'history': log,
    }
    log_path = os.path.join(WEIGHTS_DIR, 'training_log.json')
    with open(log_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f'\nTraining complete!')
    print(f'  Best model:    {os.path.join(WEIGHTS_DIR, "multimodal_best.pth")}')
    print(f'  Training log:  {log_path}')
    print(f'  Best AUC:      {best_auc:.4f}')
    print(f'\nRestart the ML service — it will auto-detect the weights and exit DEMO_MODE.')


if __name__ == '__main__':
    main()
