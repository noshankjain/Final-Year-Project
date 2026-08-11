import torch
import torch.nn as nn

class CrossAttentionFusion(nn.Module):
    def __init__(self):
        super().__init__()
        self.image_proj = nn.Linear(512, 128)
        self.tabular_proj = nn.Linear(64, 128)
        self.attention = nn.MultiheadAttention(embed_dim=128, num_heads=4, dropout=0.1, batch_first=True)
        self.norm = nn.LayerNorm(128)
        self.out_proj = nn.Sequential(
            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.ReLU()
        )

    def forward(self, img_emb, tab_emb):
        img_proj = self.image_proj(img_emb).unsqueeze(1)
        tab_proj = self.tabular_proj(tab_emb).unsqueeze(1)
        attended, _ = self.attention(img_proj, tab_proj, tab_proj)
        attended = self.norm(attended.squeeze(1) + img_proj.squeeze(1))
        fused = torch.cat([attended, tab_proj.squeeze(1)], dim=-1)
        return self.out_proj(fused)
