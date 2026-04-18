"""
Enhancement Pipeline — complete rewrite for correct low-light enhancement.

Root causes of previous static/noise artifact fixed:
1. Denoising now runs BEFORE exposure fusion (not after amplification)
2. Fusion uses only well-exposedness weights (no Laplacian on noisy input)
3. CLAHE applied gently only in luminance channel
4. No saturation boost on very dark / noisy images
5. Final blend always pulls back toward original to prevent hallucination
"""

import cv2
import numpy as np
from typing import List, Optional, Callable

from core.scene_analysis import SceneMetadata, analyze_scene, estimate_motion
from core.adaptive_controller import AdaptiveController, EnhancementParams
from pipeline.fusion import generate_exposure_brackets, fuse_exposures


class EnhancementPipeline:

    def __init__(self):
        self.controller = AdaptiveController()

    # ------------------------------------------------------------------ #
    #  Public entry point
    # ------------------------------------------------------------------ #

    def enhance(
        self,
        frames: List[np.ndarray],
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> dict:

        def report(pct, msg):
            if progress_callback:
                progress_callback(pct, msg)

        if not frames:
            raise ValueError("No frames provided")

        primary  = frames[0].copy()
        original = primary.copy()

        # ── 1. Scene analysis ──────────────────────────────────────────
        report(8, "Analysing scene...")
        meta   = analyze_scene(primary)
        motion = estimate_motion(frames) if len(frames) > 1 else 0.0
        params = self.controller.compute_params(meta, motion)

        # ── 2. Denoise FIRST — before any amplification ────────────────
        report(20, "Removing noise...")
        denoised = self._denoise_early(primary, meta.noise_level, meta.brightness)

        # ── 3. Gentle gamma lift ───────────────────────────────────────
        report(32, "Lifting brightness...")
        lifted = self._apply_gamma(denoised, params.gamma)

        # ── 4. Multi-exposure fusion ───────────────────────────────────
        report(46, "Fusing exposures...")
        brackets = generate_exposure_brackets(
            lifted,
            num_brackets=params.num_exposure_brackets,
            ev_range=(-0.8, 0.8)      # narrow range — safer for dark images
        )
        fused = fuse_exposures(brackets)

        # ── 5. CLAHE — luminance only, conservative clip ───────────────
        report(58, "Enhancing contrast...")
        fused = self._apply_clahe(fused, params.clahe_clip, params.clahe_tile)

        # ── 6. Shadow lift curve ───────────────────────────────────────
        report(66, "Lifting shadows...")
        fused = self._lift_shadows(fused, meta.shadow_fraction)

        # ── 7. Light sharpening (only if image is clean enough) ────────
        report(74, "Sharpening details...")
        if meta.noise_level < 0.35:
            fused = self._sharpen(fused, params.sharpen_strength * 0.6)

        # ── 8. Gentle colour correction (white balance) ────────────────
        report(82, "Colour correction...")
        fused = self._correct_colour(fused, meta)

        # ── 9. Final blend — always pull back toward original ──────────
        report(92, "Final blend...")
        fused = self._final_blend(fused, original, params.blend_strength, meta)

        report(100, "Done!")

        return {
            "enhanced": fused,
            "original": original,
            "metadata": {
                "brightness":        round(float(meta.brightness),        4),
                "noise_level":       round(float(meta.noise_level),       4),
                "contrast":          round(float(meta.contrast),          4),
                "dynamic_range":     round(float(meta.dynamic_range),     4),
                "shadow_fraction":   round(float(meta.shadow_fraction),   4),
                "highlight_fraction":round(float(meta.highlight_fraction),4),
                "scene_category":    meta.scene_category,
                "motion":            round(float(motion),                 4),
                "histogram_entropy": round(float(meta.histogram_entropy), 4),
            },
            "params": {
                "gamma":                params.gamma,
                "clahe_clip":           round(params.clahe_clip, 2),
                "clahe_tile":           params.clahe_tile,
                "denoise_strength":     params.denoise_strength,
                "num_exposure_brackets":params.num_exposure_brackets,
                "shadow_boost":         round(params.shadow_boost, 3),
                "sharpen_strength":     round(float(params.sharpen_strength), 3),
                "blend_strength":       round(params.blend_strength, 3),
                "saturation_boost":     round(params.saturation_boost, 3),
            }
        }

    # ------------------------------------------------------------------ #
    #  Step implementations
    # ------------------------------------------------------------------ #

    def _denoise_early(self, image: np.ndarray,
                       noise_level: float, brightness: float) -> np.ndarray:
        """
        Denoise BEFORE any amplification.
        Strength scales with both noise and how dark the image is
        (darker → more quantum noise).
        """
        # h parameter for fastNlMeansDenoisingColored
        h_lum   = float(np.interp(noise_level, [0.0, 0.2, 0.5, 1.0], [4, 7, 11, 16]))
        dark_add = float(np.interp(brightness,  [0.0, 0.15, 0.4],     [5, 3,  0]))
        h_lum   = float(np.clip(h_lum + dark_add, 4, 20))
        h_col   = float(h_lum * 0.75)

        try:
            return cv2.fastNlMeansDenoisingColored(
                image, None,
                h=h_lum, hColor=h_col,
                templateWindowSize=7,
                searchWindowSize=21
            )
        except Exception:
            return cv2.GaussianBlur(image, (5, 5), 0)

    def _apply_gamma(self, image: np.ndarray, gamma: float) -> np.ndarray:
        """LUT-based gamma correction."""
        gamma = float(np.clip(gamma, 1.0, 3.0))
        inv_g = 1.0 / gamma
        lut   = np.array([
            min(255, int((i / 255.0) ** inv_g * 255))
            for i in range(256)
        ], dtype=np.uint8)
        return cv2.LUT(image, lut)

    def _apply_clahe(self, image: np.ndarray,
                     clip: float, tile: int) -> np.ndarray:
        """CLAHE on L channel only — preserves colour."""
        clip = float(np.clip(clip, 1.0, 3.0))   # hard cap
        lab  = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip,
                                 tileGridSize=(int(tile), int(tile)))
        l_eq  = clahe.apply(l)
        return cv2.cvtColor(cv2.merge([l_eq, a, b]), cv2.COLOR_LAB2BGR)

    def _lift_shadows(self, image: np.ndarray,
                      shadow_fraction: float) -> np.ndarray:
        """Soft shadow lift using a power curve on the L channel."""
        if shadow_fraction < 0.1:
            return image

        # How much to lift: scale with shadow fraction, cap at 0.25
        lift = float(np.clip(shadow_fraction * 0.35, 0.0, 0.25))

        lab  = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
        l    = lab[:, :, 0] / 255.0          # [0,1]

        # Soft toe lift: only affects pixels below 0.5, tapers off toward midtones
        mask = np.clip(1.0 - l * 2.0, 0.0, 1.0)
        l    = l + mask * lift * (1.0 - l)
        l    = np.clip(l, 0.0, 1.0)

        lab[:, :, 0] = l * 255.0
        return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    def _sharpen(self, image: np.ndarray, strength: float) -> np.ndarray:
        """Gentle unsharp mask only on luminance to avoid colour fringing."""
        if strength < 0.05:
            return image
        strength = float(np.clip(strength, 0.0, 0.5))

        lab  = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l_f  = l.astype(np.float32)
        blur = cv2.GaussianBlur(l_f, (0, 0), 2.0)
        l_s  = np.clip(l_f + strength * (l_f - blur), 0, 255).astype(np.uint8)
        return cv2.cvtColor(cv2.merge([l_s, a, b]), cv2.COLOR_LAB2BGR)

    def _correct_colour(self, image: np.ndarray,
                         meta: SceneMetadata) -> np.ndarray:
        """
        Very light white-balance correction.
        Only correct if there's a meaningful colour cast AND
        the image isn't too dark (unreliable chroma in near-black).
        """
        if meta.brightness < 0.05:   # too dark to judge colour
            return image

        r_m, g_m, b_m = meta.color_cast   # already (R, G, B) means
        mean_all = (r_m + g_m + b_m) / 3.0 + 1e-6

        # Correction: scale each channel toward the mean
        # Max correction factor: 1.08 — very subtle
        max_correction = 0.08   # 8% max
        r_scale = np.clip(mean_all / (r_m + 1e-6), 1.0 - max_correction, 1.0 + max_correction)
        g_scale = np.clip(mean_all / (g_m + 1e-6), 1.0 - max_correction, 1.0 + max_correction)
        b_scale = np.clip(mean_all / (b_m + 1e-6), 1.0 - max_correction, 1.0 + max_correction)

        img_f = image.astype(np.float32)
        # BGR order
        img_f[:, :, 0] = np.clip(img_f[:, :, 0] * b_scale, 0, 255)
        img_f[:, :, 1] = np.clip(img_f[:, :, 1] * g_scale, 0, 255)
        img_f[:, :, 2] = np.clip(img_f[:, :, 2] * r_scale, 0, 255)
        return img_f.astype(np.uint8)

    def _final_blend(self, enhanced: np.ndarray, original: np.ndarray,
                     blend_strength: float, meta: SceneMetadata) -> np.ndarray:
        """
        Spatially-adaptive final blend.
        - Dark pixels: use more of the enhanced result
        - Bright pixels: use more of the original (preserve highlights)
        - blend_strength caps the maximum effect globally
        """
        enh_f  = enhanced.astype(np.float32)
        orig_f = original.astype(np.float32)

        # Luminance of original tells us how dark each pixel is
        orig_gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        orig_gray = cv2.GaussianBlur(orig_gray, (31, 31), 0)

        # Dark pixels get full blend_strength; bright pixels get less
        local_alpha = blend_strength * np.clip(1.0 - orig_gray * 1.5, 0.1, 1.0)
        local_alpha = local_alpha[:, :, np.newaxis]

        result = enh_f * local_alpha + orig_f * (1.0 - local_alpha)
        return np.clip(result, 0, 255).astype(np.uint8)