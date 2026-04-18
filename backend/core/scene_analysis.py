"""
Scene Analysis Module
Analyzes image characteristics to drive adaptive enhancement decisions.
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import Tuple


@dataclass
class SceneMetadata:
    brightness: float        # 0-1, mean luminance
    noise_level: float       # 0-1, estimated noise
    contrast: float          # 0-1, RMS contrast
    dynamic_range: float     # 0-1, tonal range
    sharpness: float         # 0-1, Laplacian variance
    color_cast: Tuple[float, float, float]  # RGB imbalance
    histogram_entropy: float # distribution entropy
    shadow_fraction: float   # fraction of dark pixels
    highlight_fraction: float  # fraction of bright pixels
    scene_category: str      # 'very_dark', 'dark', 'moderate', 'normal'


def analyze_scene(image: np.ndarray) -> SceneMetadata:
    """
    Comprehensive scene analysis for adaptive enhancement.
    
    Args:
        image: BGR uint8 image array
    
    Returns:
        SceneMetadata with all computed metrics
    """
    if image is None or image.size == 0:
        raise ValueError("Invalid image input")

    # Convert to float [0,1]
    img_f = image.astype(np.float32) / 255.0

    # --- Brightness (perceptual luminance) ---
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].astype(np.float32) / 255.0
    brightness = float(np.mean(L))

    # --- Noise estimation (high-freq residual) ---
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    residual = cv2.absdiff(gray, blurred).astype(np.float32)
    noise_level = float(np.std(residual) / 128.0)
    noise_level = np.clip(noise_level, 0.0, 1.0)

    # --- RMS Contrast ---
    gray_f = gray.astype(np.float32) / 255.0
    contrast = float(np.std(gray_f))
    contrast = np.clip(contrast, 0.0, 1.0)

    # --- Dynamic Range ---
    p2 = np.percentile(gray_f, 2)
    p98 = np.percentile(gray_f, 98)
    dynamic_range = float(p98 - p2)

    # --- Sharpness (Laplacian variance) ---
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness = float(np.var(lap))
    sharpness = np.clip(sharpness / 5000.0, 0.0, 1.0)

    # --- Color cast (channel mean imbalance) ---
    b_mean = float(np.mean(img_f[:, :, 0]))
    g_mean = float(np.mean(img_f[:, :, 1]))
    r_mean = float(np.mean(img_f[:, :, 2]))
    color_cast = (r_mean, g_mean, b_mean)

    # --- Histogram entropy ---
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.flatten() / hist.sum()
    hist = hist[hist > 0]
    entropy = float(-np.sum(hist * np.log2(hist + 1e-10)))
    histogram_entropy = np.clip(entropy / 8.0, 0.0, 1.0)

    # --- Shadow / Highlight fractions ---
    shadow_threshold = 50 / 255.0
    highlight_threshold = 220 / 255.0
    shadow_fraction = float(np.mean(gray_f < shadow_threshold))
    highlight_fraction = float(np.mean(gray_f > highlight_threshold))

    # --- Scene category ---
    if brightness < 0.12:
        scene_category = 'very_dark'
    elif brightness < 0.25:
        scene_category = 'dark'
    elif brightness < 0.40:
        scene_category = 'moderate'
    else:
        scene_category = 'normal'

    return SceneMetadata(
        brightness=brightness,
        noise_level=noise_level,
        contrast=contrast,
        dynamic_range=dynamic_range,
        sharpness=sharpness,
        color_cast=color_cast,
        histogram_entropy=histogram_entropy,
        shadow_fraction=shadow_fraction,
        highlight_fraction=highlight_fraction,
        scene_category=scene_category
    )


def estimate_motion(frames: list) -> float:
    """
    Estimate average motion across a list of frames.
    
    Returns:
        float 0-1, where 0 = static, 1 = heavy motion
    """
    if len(frames) < 2:
        return 0.0

    motion_scores = []
    prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)

    for i in range(1, len(frames)):
        curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(prev_gray, curr_gray).astype(np.float32)
        motion_scores.append(float(np.mean(diff) / 255.0))
        prev_gray = curr_gray

    return np.clip(float(np.mean(motion_scores)) * 5.0, 0.0, 1.0)
