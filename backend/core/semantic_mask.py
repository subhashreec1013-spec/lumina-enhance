"""
Semantic Protection Module
Detects faces and salient regions to prevent over-enhancement artifacts.
"""

import cv2
import numpy as np
from typing import List, Tuple


# Load OpenCV's built-in Haar cascade for face detection (no model download needed)
_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
_eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')


def detect_faces(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Detect face bounding boxes in image.
    
    Returns:
        List of (x, y, w, h) bounding boxes
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = _face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) == 0:
        return []
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]


def build_semantic_mask(
    image: np.ndarray,
    face_protection: float = 0.4,
    feather_radius: int = 30
) -> np.ndarray:
    """
    Build a semantic protection mask.
    Regions with faces get lower enhancement (closer to original).
    Background regions get full enhancement.
    
    Args:
        image: BGR input image
        face_protection: How much to protect faces (0=no protection, 1=fully protect)
        feather_radius: Gaussian feathering for soft transitions
    
    Returns:
        mask: HxW float32 in [0,1], 1=full enhancement, lower=protected
    """
    h, w = image.shape[:2]
    mask = np.ones((h, w), dtype=np.float32)

    faces = detect_faces(image)

    for (x, y, fw, fh) in faces:
        # Expand face region slightly for natural look
        pad = int(min(fw, fh) * 0.15)
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(w, x + fw + pad)
        y2 = min(h, y + fh + pad)

        # Create protection region
        protection_value = 1.0 - face_protection
        face_region = np.full((y2 - y1, x2 - x1), protection_value, dtype=np.float32)
        mask[y1:y2, x1:x2] = np.minimum(mask[y1:y2, x1:x2], face_region)

    # Feather the mask for smooth transitions
    ksize = feather_radius * 2 + 1
    mask = cv2.GaussianBlur(mask, (ksize, ksize), feather_radius / 2.0)

    return mask.astype(np.float32)


def apply_semantic_protection(
    enhanced: np.ndarray,
    original: np.ndarray,
    semantic_mask: np.ndarray
) -> np.ndarray:
    """
    Blend enhanced and original images using semantic mask.
    Protected regions (face) retain more of the original.
    
    Args:
        enhanced: Enhanced BGR image
        original: Original BGR image  
        semantic_mask: HxW protection mask, 1=use enhanced, 0=use original
    
    Returns:
        protected: Blended result
    """
    mask_3ch = np.stack([semantic_mask] * 3, axis=-1)
    enhanced_f = enhanced.astype(np.float32)
    original_f = original.astype(np.float32)

    result = enhanced_f * mask_3ch + original_f * (1.0 - mask_3ch)
    return np.clip(result, 0, 255).astype(np.uint8)


def compute_saliency_mask(image: np.ndarray) -> np.ndarray:
    """
    Compute a simple saliency mask based on local contrast.
    High-contrast / edge regions are marked as salient.
    
    Returns:
        saliency: HxW float32 [0,1]
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # Fine scale edges
    fine = cv2.GaussianBlur(gray, (3, 3), 0)
    # Coarse scale
    coarse = cv2.GaussianBlur(gray, (21, 21), 0)

    saliency = np.abs(fine - coarse)
    saliency = cv2.GaussianBlur(saliency, (11, 11), 0)

    # Normalize
    min_val, max_val = saliency.min(), saliency.max()
    if max_val > min_val:
        saliency = (saliency - min_val) / (max_val - min_val)
    else:
        saliency = np.zeros_like(saliency)

    return saliency.astype(np.float32)
