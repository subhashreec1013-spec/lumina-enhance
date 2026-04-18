"""
Enhancement Pipeline v4 — Natural tone, warm-shadow grading, scene-aware.

Core philosophy:
- Process ONLY luminance through the brightness pipeline (no colour distortion)
- Apply scene-aware warm shadow grading (cold lifted shadows look artificial)
- Use a natural S-curve tone map instead of linear gamma (avoids flat/washed look)
- Preserve highlight colour exactly (lamps, sky, neon signs)
- Final blend is luminance-weighted so bright areas never get over-processed
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
    def enhance(self, frames: List[np.ndarray],
                progress_callback: Optional[Callable[[int, str], None]] = None) -> dict:

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

        # ── 2. Denoise first (before any amplification) ────────────────
        report(18, "Removing noise...")
        denoised = self._smart_denoise(primary, meta)

        # ── 3. Natural S-curve tone mapping (luminance only) ───────────
        report(32, "Applying tone curve...")
        tone_mapped = self._natural_tone_curve(denoised, params, meta)

        # ── 4. CLAHE on luminance only ─────────────────────────────────
        report(46, "Enhancing local contrast...")
        contrasted = self._clahe_luma(tone_mapped, params.clahe_clip, params.clahe_tile)

        # ── 5. Scene-aware colour grading ─────────────────────────────
        report(58, "Colour grading...")
        graded = self._scene_colour_grade(contrasted, original, meta)

        # ── 6. Gentle sharpening (only if clean enough) ────────────────
        report(70, "Sharpening...")
        if meta.noise_level < 0.35:
            sharpened = self._sharpen_luma(graded, float(params.sharpen_strength) * 0.45)
        else:
            sharpened = graded

        # ── 7. Highlight recovery (protect lamps/sky from blowout) ─────
        report(80, "Protecting highlights...")
        recovered = self._recover_highlights(sharpened, original)

        # ── 8. Final natural blend ─────────────────────────────────────
        report(92, "Final blend...")
        final = self._natural_blend(recovered, original, params.blend_strength, meta)

        report(100, "Done!")

        return {
            "enhanced": final,
            "original": original,
            "metadata": {
                "brightness":         round(float(meta.brightness),         4),
                "noise_level":        round(float(meta.noise_level),        4),
                "contrast":           round(float(meta.contrast),           4),
                "dynamic_range":      round(float(meta.dynamic_range),      4),
                "shadow_fraction":    round(float(meta.shadow_fraction),    4),
                "highlight_fraction": round(float(meta.highlight_fraction), 4),
                "scene_category":     meta.scene_category,
                "motion":             round(float(motion),                  4),
                "histogram_entropy":  round(float(meta.histogram_entropy),  4),
            },
            "params": {
                "gamma":                 round(params.gamma, 3),
                "clahe_clip":            round(params.clahe_clip, 2),
                "clahe_tile":            params.clahe_tile,
                "denoise_strength":      params.denoise_strength,
                "num_exposure_brackets": params.num_exposure_brackets,
                "shadow_boost":          round(params.shadow_boost, 3),
                "sharpen_strength":      round(float(params.sharpen_strength), 3),
                "blend_strength":        round(params.blend_strength, 3),
                "saturation_boost":      round(params.saturation_boost, 3),
            }
        }

    # ------------------------------------------------------------------ #
    #  Step implementations
    # ------------------------------------------------------------------ #

    def _smart_denoise(self, image: np.ndarray, meta: SceneMetadata) -> np.ndarray:
        """Denoise scaled to actual noise + darkness level."""
        h_lum    = float(np.interp(meta.noise_level, [0.0, 0.2, 0.5, 1.0], [3, 6, 9, 13]))
        dark_add = float(np.interp(meta.brightness,  [0.0, 0.15, 0.4],     [3, 2,  0]))
        h_lum    = float(np.clip(h_lum + dark_add, 3, 16))
        h_col    = float(h_lum * 0.5)   # conservative colour smoothing

        try:
            return cv2.fastNlMeansDenoisingColored(
                image, None,
                h=h_lum, hColor=h_col,
                templateWindowSize=7, searchWindowSize=21)
        except Exception:
            return cv2.GaussianBlur(image, (5, 5), 0)

    def _natural_tone_curve(self, image: np.ndarray,
                             params: EnhancementParams,
                             meta: SceneMetadata) -> np.ndarray:
        """
        Apply a natural S-curve to the luminance channel only.
        - Lifts shadows (toe up)
        - Preserves midtone contrast
        - Rolls off highlights naturally (no clipping / no washing)

        This replaces gamma + exposure fusion which caused the flat artificial look.
        """
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
        L   = lab[:, :, 0] / 255.0   # [0, 1]

        gamma = float(np.clip(params.gamma, 1.0, 2.6))

        # Build a perceptual S-curve:
        # 1) Toe lift: raise shadow floor (prevents pure black shadows = unnatural)
        # 2) Gamma lift: brighten midtones
        # 3) Shoulder rolloff: compress highlights softly

        # Shadow floor lift (makes shadows feel like ambient light, not void)
        shadow_lift = float(np.interp(meta.brightness,
                                       [0.0, 0.12, 0.25, 0.5],
                                       [0.04, 0.03, 0.02, 0.0]))
        L_lifted = shadow_lift + L * (1.0 - shadow_lift)

        # Gamma lift on lifted L
        L_gamma = np.power(np.clip(L_lifted, 1e-6, 1.0), 1.0 / gamma)

        # Shoulder rolloff: soft highlight compression using Reinhard per-pixel
        # Only activates above 0.7 — dark and midtone pixels are unaffected
        shoulder_start = 0.72
        blend_shoulder = np.clip((L_gamma - shoulder_start) / (1.0 - shoulder_start), 0.0, 1.0)
        L_reinhard     = L_gamma / (1.0 + L_gamma * 0.5)  # soft ceiling
        L_final        = L_gamma * (1.0 - blend_shoulder) + L_reinhard * blend_shoulder

        # Exposure fusion on L channel for multi-bracket naturalness
        L_uint8   = np.clip(L_final * 255, 0, 255).astype(np.uint8)
        L_3ch     = cv2.cvtColor(L_uint8, cv2.COLOR_GRAY2BGR)
        brackets  = generate_exposure_brackets(L_3ch, num_brackets=3, ev_range=(-0.5, 0.5))
        brackets_L = [cv2.cvtColor(b, cv2.COLOR_BGR2GRAY) for b in brackets]
        L_fused   = self._fuse_luma(brackets_L)

        lab[:, :, 0] = L_fused.astype(np.float32)
        # Keep A/B exactly from original (NO colour modification)
        return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)

    def _fuse_luma(self, brackets: List[np.ndarray]) -> np.ndarray:
        """Well-exposedness fusion on single-channel L brackets."""
        h, w = brackets[0].shape
        weights = []
        for b in brackets:
            f = b.astype(np.float32) / 255.0
            w_map = np.exp(-((f - 0.5) ** 2) / (2 * 0.18 ** 2))
            w_map = cv2.GaussianBlur(w_map, (21, 21), 7.0)
            weights.append(w_map)
        stack = np.stack(weights, axis=0)
        stack = stack / (stack.sum(axis=0, keepdims=True) + 1e-8)
        fused = sum(b.astype(np.float32) * stack[i] for i, b in enumerate(brackets))
        return np.clip(fused, 0, 255).astype(np.uint8)

    def _clahe_luma(self, image: np.ndarray, clip: float, tile: int) -> np.ndarray:
        """CLAHE strictly on L channel — hard cap at 2.0."""
        clip = float(np.clip(clip, 1.0, 2.0))
        lab  = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        L, A, B = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(int(tile), int(tile)))
        L_eq  = clahe.apply(L)
        return cv2.cvtColor(cv2.merge([L_eq, A, B]), cv2.COLOR_LAB2BGR)

    def _scene_colour_grade(self, image: np.ndarray,
                             original: np.ndarray,
                             meta: SceneMetadata) -> np.ndarray:
        """
        Scene-aware colour grading that produces natural-looking results.

        For night/dark scenes (the main use case):
        - Shadows get a very subtle warm push (ambient lamplight spill)
          This removes the cold-grey artificial look of uniformly lifted shadows
        - Midtones stay neutral
        - Highlights preserve original colour completely

        The warm-shadow push is the key fix for the 'white cast' complaint:
        cold grey lifted shadows → warm natural shadows.
        """
        img_f  = image.astype(np.float32)
        orig_f = original.astype(np.float32)

        # Luminance map from original (not enhanced) for accurate masking
        lum = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        lum = cv2.GaussianBlur(lum, (21, 21), 0)

        # Detect if scene is overall cold/blue (blue channel dominant)
        orig_b = original[:, :, 0].mean()
        orig_r = original[:, :, 2].mean()
        is_cold_scene = orig_b > orig_r   # blue dominant = cold/night scene

        if is_cold_scene and meta.brightness < 0.40:
            # Shadow region mask: dark areas get warmth, bright areas get none
            shadow_mask = np.clip(1.0 - lum * 4.0, 0.0, 1.0)
            shadow_mask = cv2.GaussianBlur(shadow_mask, (41, 41), 0)[:, :, np.newaxis]

            # Warm push strength: scales with darkness
            warm_str = float(np.interp(meta.brightness,
                                        [0.0, 0.12, 0.25, 0.40],
                                        [10,  8,    5,    2]))

            img_f[:, :, 2] = np.clip(img_f[:, :, 2] + shadow_mask[:,:,0] * warm_str,       0, 255)  # +R
            img_f[:, :, 1] = np.clip(img_f[:, :, 1] + shadow_mask[:,:,0] * warm_str * 0.4, 0, 255)  # +G (half)
            img_f[:, :, 0] = np.clip(img_f[:, :, 0] - shadow_mask[:,:,0] * warm_str * 0.3, 0, 255)  # -B

        # Subtle vibrance: lift only desaturated pixels, protect vivid ones
        result = img_f.astype(np.uint8)
        if meta.brightness > 0.06 and meta.noise_level < 0.40:
            result = self._vibrance(result, strength=0.10)

        return result

    def _vibrance(self, image: np.ndarray, strength: float = 0.12) -> np.ndarray:
        """Lift muted colours only — leave saturated colours (lamps) alone."""
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
        A   = lab[:, :, 1] - 128.0
        B_c = lab[:, :, 2] - 128.0
        chroma = np.sqrt(A ** 2 + B_c ** 2)
        max_c  = max(chroma.max(), 1.0)
        # Inverse mask: high weight for LOW chroma (dull/grey areas)
        vib_mask = 1.0 - np.clip(chroma / (max_c * 0.6), 0.0, 1.0)
        scale = 1.0 + vib_mask * strength
        lab[:, :, 1] = np.clip(A * scale + 128.0, 0, 255)
        lab[:, :, 2] = np.clip(B_c * scale + 128.0, 0, 255)
        return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    def _sharpen_luma(self, image: np.ndarray, strength: float) -> np.ndarray:
        """Unsharp mask on L channel only — no colour fringing."""
        if strength < 0.04:
            return image
        lab     = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        L, A, B = cv2.split(lab)
        L_f     = L.astype(np.float32)
        blur    = cv2.GaussianBlur(L_f, (0, 0), 1.5)
        L_s     = np.clip(L_f + float(strength) * (L_f - blur), 0, 255).astype(np.uint8)
        return cv2.cvtColor(cv2.merge([L_s, A, B]), cv2.COLOR_LAB2BGR)

    def _recover_highlights(self, enhanced: np.ndarray,
                             original: np.ndarray) -> np.ndarray:
        """
        In bright regions (lamps, sky, windows), blend back toward original.
        This preserves the warm lamp colour and prevents sky from washing out.
        """
        orig_lum = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        orig_lum = cv2.GaussianBlur(orig_lum, (15, 15), 0)

        # Highlight mask: activates above 0.55 luminance in ORIGINAL
        hi_mask = np.clip((orig_lum - 0.45) / 0.35, 0.0, 1.0)[:, :, np.newaxis]

        enh_f  = enhanced.astype(np.float32)
        orig_f = original.astype(np.float32)

        result = enh_f * (1.0 - hi_mask * 0.65) + orig_f * (hi_mask * 0.65)
        return np.clip(result, 0, 255).astype(np.uint8)

    def _natural_blend(self, enhanced: np.ndarray, original: np.ndarray,
                        blend_strength: float, meta: SceneMetadata) -> np.ndarray:
        """
        Spatially adaptive blend.
        Dark areas: use enhanced (lifted) version.
        Bright areas: blend toward original (protect natural colour).
        The ratio ensures the output never looks AI-processed in bright zones.
        """
        enh_f  = enhanced.astype(np.float32)
        orig_f = original.astype(np.float32)

        lum = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        lum = cv2.GaussianBlur(lum, (41, 41), 0)

        # Alpha: dark → blend_strength, bright → tapers to 0.1 (keep original)
        alpha = blend_strength * np.clip(1.0 - lum * 2.2, 0.08, 1.0)
        alpha = alpha[:, :, np.newaxis]

        result = enh_f * alpha + orig_f * (1.0 - alpha)
        return np.clip(result, 0, 255).astype(np.uint8)