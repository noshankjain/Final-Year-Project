import argparse
import os
import json
import numpy as np
import pandas as pd
from PIL import Image

def generate_synthetic(output_dir):
    os.makedirs(os.path.join(output_dir, 'patches'), exist_ok=True)
    
    n_samples = 1000
    n_malignant = 750
    n_benign = 250
    
    case_ids = [f"TCGA-BRCA-{i:04d}" for i in range(n_samples)]
    labels = [1] * n_malignant + [0] * n_benign
    np.random.shuffle(labels)
    
    clinical_data = []
    labels_data = []
    
    for i, case_id in enumerate(case_ids):
        is_mal = labels[i]
        
        age = np.random.normal(60 if is_mal else 50, 10)
        tumor_size = np.random.normal(35 if is_mal else 15, 15)
        lymph_nodes = np.random.poisson(3 if is_mal else 0)
        er = np.random.choice([0, 1], p=[0.3, 0.7] if is_mal else [0.1, 0.9])
        pr = np.random.choice([0, 1])
        her2 = np.random.choice([0, 1], p=[0.8, 0.2] if is_mal else [0.95, 0.05])
        grade = np.random.choice([1, 2, 3], p=[0.1, 0.4, 0.5] if is_mal else [0.8, 0.15, 0.05])
        ki67 = np.random.normal(30 if is_mal else 10, 15)
        tp53 = np.random.choice([0, 1], p=[0.6, 0.4] if is_mal else [0.9, 0.1])
        brca1 = np.random.choice([0, 1], p=[0.8, 0.2] if is_mal else [0.98, 0.02])
        
        clinical_data.append({
            'case_id': case_id, 'age': max(20, age), 'tumor_size': max(1, tumor_size),
            'lymph_nodes': lymph_nodes, 'er_status': er, 'pr_status': pr,
            'her2_status': her2, 'grade': grade, 'ki67': max(1, min(100, ki67)),
            'tp53_mutation': tp53, 'brca1_mutation': brca1
        })
        
        surv = np.random.exponential(36 if is_mal else 84)
        labels_data.append({
            'case_id': case_id, 'diagnosis': is_mal, 
            'survival_months': surv, 'vital_status': 1 if (is_mal and surv < 60) else 0
        })
        
        color = (200, 100, 100) if is_mal else (200, 200, 250)
        img = Image.new('RGB', (8, 8), color=color)
        img.save(os.path.join(output_dir, 'patches', f"{case_id}.png"))
        
    pd.DataFrame(clinical_data).to_csv(os.path.join(output_dir, 'clinical.csv'), index=False)
    pd.DataFrame(labels_data).to_csv(os.path.join(output_dir, 'labels.csv'), index=False)
    print(f"Generated {n_samples} synthetic samples in {output_dir}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output_dir', type=str, default='./data')
    parser.add_argument('--mode', type=str, choices=['clinical', 'synthetic', 'manifest'], required=True)
    args = parser.parse_args()
    
    if args.mode == 'synthetic':
        generate_synthetic(args.output_dir)
    else:
        print(f"Mode {args.mode} not fully implemented in this demo script.")

if __name__ == '__main__':
    main()
