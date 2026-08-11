import cv2
import numpy as np
from PIL import Image
import torch
from torchvision import transforms

class WSIProcessor:
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]
    
    def __init__(self, patch_size=256, target_size=(224, 224)):
        self.patch_size = patch_size
        self.transform = transforms.Compose([
            transforms.Resize(target_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.IMAGENET_MEAN, std=self.IMAGENET_STD)
        ])
    
    def load_image(self, file_path: str) -> Image.Image:
        try:
            return Image.open(file_path).convert('RGB')
        except Exception as e:
            raise ValueError(f"Could not load image: {e}")
    
    def detect_tissue_mask(self, image: Image.Image) -> np.ndarray:
        img_cv = np.array(image)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_RGB2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        return mask
    
    def extract_patches(self, image: Image.Image, n_patches: int = 5) -> list:
        img_w, img_h = image.size
        if img_w <= self.patch_size or img_h <= self.patch_size:
            return [image]
            
        mask = self.detect_tissue_mask(image)
        patches = []
        
        for y in range(0, img_h - self.patch_size, self.patch_size // 2):
            for x in range(0, img_w - self.patch_size, self.patch_size // 2):
                patch_mask = mask[y:y+self.patch_size, x:x+self.patch_size]
                tissue_ratio = np.count_nonzero(patch_mask) / (self.patch_size ** 2)
                
                if tissue_ratio > 0.5:
                    patch = image.crop((x, y, x + self.patch_size, y + self.patch_size))
                    patches.append((tissue_ratio, patch))
                    
        patches.sort(key=lambda p: p[0], reverse=True)
        return [p[1] for p in patches[:n_patches]]
    
    def preprocess_patch(self, patch: Image.Image) -> torch.Tensor:
        tensor = self.transform(patch)
        return tensor.unsqueeze(0)
    
    def get_representative_patch(self, image: Image.Image) -> tuple:
        patches = self.extract_patches(image, 1)
        if not patches:
            patch = image.resize((224, 224))
        else:
            patch = patches[0]
            
        tensor = self.preprocess_patch(patch)
        return tensor, patch
