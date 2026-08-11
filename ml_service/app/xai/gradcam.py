import torch
import numpy as np
from PIL import Image
import cv2
from captum.attr import LayerGradCam
from captum.attr import LayerAttribution

class GradCAMExplainer:
    def __init__(self, model):
        self.model = model
        self.tabular_placeholder = None
        # image_branch stores ResNet layers as self.features (nn.Sequential)
        # features[-1] is layer4 — the deepest convolutional block
        target_layer = model.image_branch.features[-1]
        self.layer_gradcam = LayerGradCam(self._forward_fn, target_layer)

    def _forward_fn(self, image_tensor, tabular_tensor=None):
        """Forward function for captum — returns only diagnosis logits."""
        if tabular_tensor is None and self.tabular_placeholder is not None:
            tabular_tensor = self.tabular_placeholder
        diagnosis_logits, _ = self.model(image_tensor, tabular_tensor)
        return diagnosis_logits

    def generate(self, image_tensor, tabular_tensor, target_class=1) -> np.ndarray:
        """Compute Grad-CAM attribution and return normalized heatmap (224×224)."""
        self.tabular_placeholder = tabular_tensor
        attr = self.layer_gradcam.attribute(
            image_tensor, target=target_class,
            additional_forward_args=(tabular_tensor,)
        )
        upsampled = LayerAttribution.interpolate(attr, (224, 224))
        heatmap = upsampled.squeeze().cpu().detach().numpy()
        heatmap = np.maximum(heatmap, 0)
        if heatmap.max() > 0:
            heatmap /= heatmap.max()
        return heatmap

    def overlay_on_image(self, original_pil: Image.Image, heatmap: np.ndarray, alpha=0.4) -> Image.Image:
        """Blend Grad-CAM heatmap with original image using JET colormap."""
        orig = np.array(original_pil.resize((224, 224)).convert('RGB'))
        heatmap_cv = np.uint8(255 * heatmap)
        colormap = cv2.applyColorMap(heatmap_cv, cv2.COLORMAP_JET)
        colormap = cv2.cvtColor(colormap, cv2.COLOR_BGR2RGB)  # Fix: correct constant name
        blended = cv2.addWeighted(orig, 1 - alpha, colormap, alpha, 0)
        return Image.fromarray(blended)

