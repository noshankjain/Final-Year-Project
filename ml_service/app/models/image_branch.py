import torch
import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights

class ImageFeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        resnet = resnet50(weights=ResNet50_Weights.DEFAULT)
        # Freeze first 7 layers (up to layer2 roughly) for transfer learning efficiency
        for name, child in list(resnet.named_children())[:7]:
            for param in child.parameters():
                param.requires_grad = False
                
        self.features = nn.Sequential(*list(resnet.children())[:-2])
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.flatten = nn.Flatten()
        self.fc = nn.Sequential(
            nn.Linear(2048, 512),
            nn.ReLU(),
            nn.Dropout(0.3)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x)
        x = self.flatten(x)
        return self.fc(x)
