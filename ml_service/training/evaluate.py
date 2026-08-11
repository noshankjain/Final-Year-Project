import argparse
import os
import json
import torch
import numpy as np
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from lifelines.utils import concordance_index

from app.models.multimodal import MultiModalCancerModel
from training.dataset import TCGABRCADataset

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model_path', type=str, required=True)
    parser.add_argument('--data_root', type=str, default='./data')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu')
    args = parser.parse_args()

    dataset = TCGABRCADataset(args.data_root, split='test')
    if len(dataset) == 0:
        print("No test data found.")
        return
        
    loader = DataLoader(dataset, batch_size=16, shuffle=False)
    
    model = MultiModalCancerModel().to(args.device)
    model.load_state_dict(torch.load(args.model_path, map_location=args.device))
    model.eval()
    
    all_labels = []
    all_probs = []
    all_preds = []
    
    all_prog_true = []
    all_prog_pred = []
    
    with torch.no_grad():
        for batch in loader:
            imgs = batch['image'].to(args.device)
            tabs = batch['tabular'].to(args.device)
            labels = batch['diagnosis'].numpy()
            prog_true = batch['prognosis'].numpy()
            
            diag_logits, prog_preds = model(imgs, tabs)
            probs = torch.softmax(diag_logits, dim=1)[:, 1].cpu().numpy()
            preds = (probs >= 0.5).astype(int)
            
            all_labels.extend(labels)
            all_probs.extend(probs)
            all_preds.extend(preds)
            all_prog_true.extend(prog_true)
            all_prog_pred.extend(prog_preds.cpu().numpy().flatten())
            
    auc = roc_auc_score(all_labels, all_probs)
    report = classification_report(all_labels, all_preds, output_dict=True)
    c_index = concordance_index(all_prog_true, all_prog_pred)
    
    cm = confusion_matrix(all_labels, all_preds)
    plt.figure(figsize=(6,5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.xlabel('Predicted')
    plt.ylabel('True')
    plt.title('Confusion Matrix')
    plt.savefig('confusion_matrix.png')
    
    results = {
        'auc_roc': auc,
        'c_index': c_index,
        'classification_report': report
    }
    
    with open('evaluation_results.json', 'w') as f:
        json.dump(results, f, indent=4)
        
    print(json.dumps(results, indent=4))

if __name__ == '__main__':
    main()
