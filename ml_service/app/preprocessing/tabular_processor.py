"""
Tabular Processor — z-score normalization of clinical features.
Handles both complete (clinician mode) and partial (patient mode) inputs.
"""
import torch
import numpy as np


class TabularProcessor:
    # TCGA-BRCA approximate normalization statistics
    CONTINUOUS_STATS = {
        'age':         {'mean': 58.5,  'std': 13.2},
        'tumor_size':  {'mean': 27.8,  'std': 20.1},
        'lymph_nodes': {'mean': 2.1,   'std': 4.3},
        'ki67':        {'mean': 22.3,  'std': 19.8},
    }

    FEATURE_ORDER = [
        'age', 'tumor_size', 'lymph_nodes', 'er_status', 'pr_status',
        'her2_status', 'grade', 'ki67', 'tp53_mutation', 'brca1_mutation',
    ]

    def process(self, clinical_data: dict) -> torch.Tensor:
        """
        Convert a clinical data dict to a normalised float32 tensor (1, 10).

        Missing/None values are handled gracefully:
          - Continuous features: zero after z-score (= population mean)
          - Binary/ordinal features: 0 (most conservative assumption)
        This is the FALLBACK only — caller should pre-fill with
        ClinicalEstimator values before calling this method.
        """
        values = []
        for feat in self.FEATURE_ORDER:
            raw = clinical_data.get(feat, None)
            # Treat None / NaN as missing → use normalised 0 for continuous
            if raw is None or (isinstance(raw, float) and np.isnan(raw)):
                if feat in self.CONTINUOUS_STATS:
                    val = 0.0   # z-score of mean = 0
                else:
                    val = 0.0   # conservative binary default
            else:
                val = float(raw)
                if feat in self.CONTINUOUS_STATS:
                    mean = self.CONTINUOUS_STATS[feat]['mean']
                    std  = self.CONTINUOUS_STATS[feat]['std']
                    val  = (val - mean) / (std + 1e-8)

            values.append(val)

        tensor = torch.tensor(values, dtype=torch.float32).unsqueeze(0)
        tensor = torch.clamp(tensor, -3.0, 3.0)
        return tensor
