"""
Adaptive Controller — conservative, safe parameters.
Previous version had values too aggressive for real noisy dark images.
"""

import numpy as np
from dataclasses import dataclass
from core.scene_analysis import SceneMetadata


@dataclass
class EnhancementParams:
    gamma: float
    clahe_clip: float
    clahe_tile: int
    denoise_strength: int
    denoise_template: int
    denoise_search: int
    num_exposure_brackets: int
    shadow_boost: float
    highlight_protect: float
    sharpen_strength: float
    blend_strength: float
    saturation_boost: float
    motion_threshold: float
    tone_map_gamma: float


class AdaptiveController:

    def compute_params(self, meta: SceneMetadata,
                       motion: float = 0.0) -> EnhancementParams:

        b = float(meta.brightness)
        n = float(meta.noise_level)
        c = float(meta.contrast)
        s = float(meta.shadow_fraction)

        # ── Gamma: lift for dark images, gentle for moderate ───────────
        # Max 2.5 — beyond this colours distort badly
        gamma = float(np.clip(
            np.interp(b, [0.0, 0.10, 0.20, 0.35, 0.5],
                         [2.5, 2.2,  1.9,  1.6,  1.2]),
            1.1, 2.5))

        # ── CLAHE: conservative — too high = noise amplification ───────
        # Hard ceiling of 2.5 regardless of darkness
        clahe_base = float(np.interp(b, [0.0, 0.15, 0.35, 0.6],
                                        [2.5, 2.0,  1.8,  1.5]))
        clahe_clip = float(np.clip(clahe_base - n * 0.8, 1.0, 2.5))

        # Tile: coarser grid for noisy images (finer grid amplifies noise)
        if n > 0.3:
            clahe_tile = 12
        elif c > 0.3:
            clahe_tile = 8
        else:
            clahe_tile = 10

        # ── Denoising ──────────────────────────────────────────────────
        denoise_strength = int(np.clip(
            np.interp(n, [0.0, 0.2, 0.5, 1.0], [4, 7, 11, 16])
            + np.interp(b, [0.0, 0.15, 0.4],   [4, 2,  0]),
            4, 20))

        if denoise_strength > 12:
            denoise_template, denoise_search = 7, 21
        else:
            denoise_template, denoise_search = 7, 21

        # ── Exposure brackets: fewer for high-noise or high-motion ─────
        if n > 0.4 or motion > 0.5:
            num_brackets = 2
        elif motion > 0.2:
            num_brackets = 3
        else:
            num_brackets = int(np.interp(b, [0.0, 0.2, 0.5], [3, 3, 2]))

        # ── Shadow boost: gentle ───────────────────────────────────────
        shadow_boost = float(np.clip(
            np.interp(s, [0.0, 0.3, 0.7, 1.0], [0.0, 0.10, 0.20, 0.25]),
            0.0, 0.25))

        # ── Highlight protection ───────────────────────────────────────
        highlight_protect = float(np.clip(
            np.interp(meta.highlight_fraction, [0.0, 0.05, 0.2], [0.0, 0.2, 0.5]),
            0.0, 0.5))

        # ── Sharpening: skip if noisy ──────────────────────────────────
        if n > 0.35:
            sharpen_strength = 0.0
        else:
            sharpen_strength = float(np.clip(
                np.interp(c, [0.0, 0.3, 0.6], [0.15, 0.25, 0.35]),
                0.0, 0.35))

        # ── Blend: how much enhanced vs original in final mix ──────────
        # Very dark → more enhancement; moderate → softer touch
        blend_strength = float(np.interp(b,
            [0.0, 0.10, 0.20, 0.35, 0.5],
            [0.92, 0.88, 0.82, 0.75, 0.65]))

        # ── Saturation: NO boost for dark/noisy images ─────────────────
        # Dark images have unreliable chroma — boosting creates false colour
        if b < 0.15 or n > 0.3:
            saturation_boost = 1.0
        else:
            saturation_boost = float(np.clip(
                np.interp(b, [0.15, 0.35, 0.6], [1.05, 1.08, 1.10]),
                1.0, 1.10))

        tone_map_gamma = float(np.interp(b, [0.0, 0.25, 0.5], [1.5, 1.3, 1.1]))

        return EnhancementParams(
            gamma=gamma,
            clahe_clip=clahe_clip,
            clahe_tile=clahe_tile,
            denoise_strength=denoise_strength,
            denoise_template=denoise_template,
            denoise_search=denoise_search,
            num_exposure_brackets=num_brackets,
            shadow_boost=shadow_boost,
            highlight_protect=highlight_protect,
            sharpen_strength=sharpen_strength,
            blend_strength=blend_strength,
            saturation_boost=saturation_boost,
            motion_threshold=0.15 + motion * 0.1,
            tone_map_gamma=tone_map_gamma,
        )