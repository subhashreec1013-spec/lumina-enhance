"""
Optical Flow + Motion Mask Module
Detects per-pixel motion between frames and generates soft fusion masks.
"""

import cv2
import numpy as np
from typing import List, Tuple


def compute_optical_flow(frame1: np.ndarray, frame2: np.ndarray) -> np.ndarray:
    """
    Compute dense optical flow using Farneback algorithm.
    
    Returns:
        flow: HxWx2 float32 flow field
    """
    g1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

    flow = cv2.calcOpticalFlowFarneback(
        g1, g2,
        None,
        pyr_scale=0.5,
        levels=3,
        winsize=15,
        iterations=3,
        poly_n=5,
        poly_sigma=1.2,
        flags=0
    )
    return flow


def flow_to_magnitude(flow: np.ndarray) -> np.ndarray:
    """Convert flow field to magnitude map [0, 1]."""
    mag, _ = cv2.cartToPolar(flow[:, :, 0], flow[:, :, 1])
    # Normalize: typical motion < 10px considered low
    mag_norm = np.clip(mag / 15.0, 0.0, 1.0)
    return mag_norm.astype(np.float32)


def generate_motion_mask(
    frames: List[np.ndarray],
    threshold: float = 0.15,
    blur_radius: int = 15
) -> np.ndarray:
    """
    Generate a soft motion mask across all frames.
    Pixels with high motion get weight 0 (discard), static regions weight 1.
    
    Args:
        frames: List of BGR frames
        threshold: Motion magnitude threshold 0-1
        blur_radius: Gaussian blur for soft edges
    
    Returns:
        motion_mask: HxW float32 in [0,1], 1=static, 0=moving
    """
    if len(frames) < 2:
        h, w = frames[0].shape[:2]
        return np.ones((h, w), dtype=np.float32)

    h, w = frames[0].shape[:2]
    cumulative_motion = np.zeros((h, w), dtype=np.float32)

    for i in range(len(frames) - 1):
        flow = compute_optical_flow(frames[i], frames[i + 1])
        mag = flow_to_magnitude(flow)
        cumulative_motion = np.maximum(cumulative_motion, mag)

    # Binarize and invert: moving pixels = 0, static = 1
    motion_mask = 1.0 - np.clip(cumulative_motion / threshold, 0.0, 1.0)

    # Smooth edges for soft blending
    ksize = blur_radius if blur_radius % 2 == 1 else blur_radius + 1
    motion_mask = cv2.GaussianBlur(motion_mask, (ksize, ksize), 0)

    return motion_mask.astype(np.float32)


def warp_frame(frame: np.ndarray, flow: np.ndarray) -> np.ndarray:
    """
    Warp a frame according to optical flow (motion compensation).
    
    Args:
        frame: BGR source frame
        flow: HxWx2 flow field
    
    Returns:
        warped: Motion-compensated frame
    """
    h, w = flow.shape[:2]
    map_x = np.tile(np.arange(w), (h, 1)).astype(np.float32)
    map_y = np.tile(np.arange(h), (w, 1)).T.astype(np.float32)

    map_x += flow[:, :, 0]
    map_y += flow[:, :, 1]

    warped = cv2.remap(frame, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return warped


def align_frames(frames: List[np.ndarray], reference_idx: int = 0) -> List[np.ndarray]:
    """
    Align all frames to a reference using optical flow compensation.
    
    Args:
        frames: List of BGR frames
        reference_idx: Index of reference frame
    
    Returns:
        aligned: List of aligned BGR frames
    """
    if len(frames) < 2:
        return frames

    ref = frames[reference_idx]
    aligned = [None] * len(frames)
    aligned[reference_idx] = ref

    for i, frame in enumerate(frames):
        if i == reference_idx:
            continue
        flow = compute_optical_flow(ref, frame)
        aligned[i] = warp_frame(frame, flow)

    return aligned
