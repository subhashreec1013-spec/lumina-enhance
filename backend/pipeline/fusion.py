"""
Multi-Exposure Fusion Module — noise-safe implementation.
Key fix: contrast weights are computed on PRE-BLURRED images so noise
pixels do NOT get high weight and dominate the fusion output.
"""

import cv2
import numpy as np
from typing import List, Tuple


def generate_exposure_brackets(
    image: np.ndarray,
    num_brackets: int = 3,
    ev_range: Tuple[float, float] = (-1.0, 1.0)
) -> List[np.ndarray]:
    """
    Generate synthetic exposure brackets from a single image.
    Works in linear light space for physically correct EV scaling.
    """
    img_f = image.astype(np.float32) / 255.0
    # Approximate linearise from sRGB gamma
    linear = np.power(np.clip(img_f, 1e-6, 1.0), 2.2)

    ev_steps = np.linspace(ev_range[0], ev_range[1], num_brackets)
    brackets = []

    for ev in ev_steps:
        multiplier = 2.0 ** ev
        exposed = linear * multiplier
        # Soft shoulder rolloff — prevents hard white clipping
        exposed = exposed / (1.0 + exposed)
        # Back to display gamma
        exposed_gamma = np.power(np.clip(exposed, 1e-6, 1.0), 1.0 / 2.2)
        exposed_gamma = np.clip(exposed_gamma * 255.0, 0, 255).astype(np.uint8)
        brackets.append(exposed_gamma)

    return brackets


def _well_exposedness(image: np.ndarray, sigma: float = 0.2) -> np.ndarray:
    """
    Pixels near mid-grey (0.5) get high weight.
    Smoothed heavily so noise pixels don't spike the weights.
    """
    img_f = image.astype(np.float32) / 255.0
    mean_ch = np.mean(img_f, axis=2)
    weight = np.exp(-((mean_ch - 0.5) ** 2) / (2.0 * sigma ** 2))
    weight = cv2.GaussianBlur(weight, (15, 15), 5.0)
    return weight.astype(np.float32)


def fuse_exposures(brackets: List[np.ndarray]) -> np.ndarray:
    """
    Noise-safe exposure fusion using well-exposedness weights only.
    No Laplacian contrast weights — they reward noise in dark images.
    """
    h, w = brackets[0].shape[:2]
    weight_maps = [_well_exposedness(img) for img in brackets]
    stack = np.stack(weight_maps, axis=0)
    stack = stack / (stack.sum(axis=0, keepdims=True) + 1e-8)

    fused = np.zeros((h, w, 3), dtype=np.float32)
    for i, img in enumerate(brackets):
        fused += img.astype(np.float32) * stack[i][:, :, np.newaxis]

    return np.clip(fused, 0, 255).astype(np.uint8)