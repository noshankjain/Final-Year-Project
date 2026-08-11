import argparse
import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torch.utils.tensorboard import SummaryWriter
from tqdm import tqdm
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score

from training.dataset import TCGABRCADataset
from app.models.multimodal import MultiModalCancerModel

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_root', type=str, default='./data')
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--batch_size', type=int, default=16)
    parser.add_argument('--lr', type=float, default=1e-4)
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu')
    parser.add_argument('--save_dir', type=str, default='./weights')
    parser.add_argument('--resume', type=str, default=None)
    args = parser.parse_args()

    os.makedirs(args.save_dir, exist_ok=True)
    
    train_dataset = TCGABRCADataset(args.data_root, split='train')
    val_dataset = TCGABRCADataset(args.data_root, split='val')
    
    if len(train_dataset) == 0:
        print("No training data found. Exiting.")
        return

    weights = train_dataset.get_class_weights(train_dataset)
    sample_weights = [weights[item['diagnosis']] for item in train_dataset.data]
    sampler = WeightedRandomSampler(sample_weights, len(sample_weights))
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    model = MultiModalCancerModel().to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = torch.amp.GradScaler('cpu') if args.device == 'cpu' else torch.amp.GradScaler('cuda')
    
    criterion_diag = nn.CrossEntropyLoss()
    criterion_prog = nn.MSELoss()
    
    writer = SummaryWriter(os.path.join(args.save_dir, 'logs'))
    
    best_val_auc = 0.0
    patience_counter = 0
    
    if args.resume and os.path.exists(args.resume):
        model.load_state_dict(torch.load(args.resume))

    for epoch in range(args.epochs):
        model.train()
        train_loss = 0.0
        pbar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{args.epochs} [Train]")
        
        for batch in pbar:
            imgs = batch['image'].to(args.device)
            tabs = batch['tabular'].to(args.device)
            diag_labels = batch['diagnosis'].to(args.device)
            prog_labels = batch['prognosis'].to(args.device).float().unsqueeze(1)
            
            optimizer.zero_grad()
            with torch.amp.autocast(args.device):
                diag_logits, prog_preds = model(imgs, tabs)
                loss_diag = criterion_diag(diag_logits, diag_labels)
                loss_prog = criterion_prog(prog_preds, prog_labels)
                loss = loss_diag + 0.3 * loss_prog
                
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            
            train_loss += loss.item()
            pbar.set_postfix({'loss': loss.item()})
            
        scheduler.step()
        train_loss /= len(train_loader)
        
        model.eval()
        val_loss = 0.0
        all_diag_preds, all_diag_labels = [], []
        
        with torch.no_grad():
            for batch in tqdm(val_loader, desc=f"Epoch {epoch+1}/{args.epochs} [Val]"):
                imgs = batch['image'].to(args.device)
                tabs = batch['tabular'].to(args.device)
                diag_labels = batch['diagnosis'].to(args.device)
                prog_labels = batch['prognosis'].to(args.device).float().unsqueeze(1)
                
                with torch.amp.autocast(args.device):
                    diag_logits, prog_preds = model(imgs, tabs)
                    loss = criterion_diag(diag_logits, diag_labels) + 0.3 * criterion_prog(prog_preds, prog_labels)
                    
                val_loss += loss.item()
                probs = torch.softmax(diag_logits, dim=1)[:, 1].cpu().numpy()
                all_diag_preds.extend(probs)
                all_diag_labels.extend(diag_labels.cpu().numpy())
                
        val_loss /= len(val_loader)
        val_auc = roc_auc_score(all_diag_labels, all_diag_preds)
        val_preds_bin = [1 if p >= 0.5 else 0 for p in all_diag_preds]
        val_f1 = f1_score(all_diag_labels, val_preds_bin)
        
        print(f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val AUC: {val_auc:.4f} | Val F1: {val_f1:.4f}")
        
        writer.add_scalar('Loss/train', train_loss, epoch)
        writer.add_scalar('Loss/val', val_loss, epoch)
        writer.add_scalar('Metrics/val_auc', val_auc, epoch)
        writer.add_scalar('Metrics/val_f1', val_f1, epoch)
        
        torch.save(model.state_dict(), os.path.join(args.save_dir, 'multimodal_last.pth'))
        
        if val_auc > best_val_auc:
            best_val_auc = val_auc
            torch.save(model.state_dict(), os.path.join(args.save_dir, 'multimodal_best.pth'))
            patience_counter = 0
        else:
            patience_counter += 1
            
        if patience_counter >= 10:
            print("Early stopping triggered")
            break

if __name__ == '__main__':
    main()
