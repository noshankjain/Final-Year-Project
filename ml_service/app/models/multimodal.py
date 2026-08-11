import torch.nn as nn
from app.models.image_branch import ImageFeatureExtractor
from app.models.tabular_branch import TabularFeatureExtractor
from app.models.fusion import CrossAttentionFusion

class MultiModalCancerModel(nn.Module):
    MODEL_VERSION = '1.0.0'
    
    def __init__(self):
        super().__init__()
        self.image_branch = ImageFeatureExtractor()
        self.tabular_branch = TabularFeatureExtractor()
        self.fusion = CrossAttentionFusion()
        self.diagnosis_head = nn.Sequential(nn.Dropout(0.3), nn.Linear(128, 2))
        self.prognosis_head = nn.Sequential(nn.Dropout(0.3), nn.Linear(128, 1), nn.Sigmoid())
    
    def forward(self, image_tensor, tabular_tensor):
        img_emb = self.image_branch(image_tensor)
        tab_emb = self.tabular_branch(tabular_tensor)
        fused = self.fusion(img_emb, tab_emb)
        diagnosis_logits = self.diagnosis_head(fused)
        prognosis_score = self.prognosis_head(fused)
        return diagnosis_logits, prognosis_score
