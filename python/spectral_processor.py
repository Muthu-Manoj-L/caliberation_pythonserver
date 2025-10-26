"""
Advanced Spectral Calibration Processor
========================================

This module performs comprehensive spectral calibration for smartphone cameras using:
- 6-color regions (red, green, blue, cyan, magenta, yellow)
- 4 black corner regions for shadow/noise baseline
- Shadow correction via black level subtraction
- Polynomial/spline correction curve fitting
- Calibration data persistence for future use

Author: AI Assistant
Date: 2025-10-24
"""

import cv2
import numpy as np
import sys
import json
from typing import Dict, List, Tuple, Optional
from scipy.interpolate import UnivariateSpline, interp1d
from scipy.optimize import curve_fit
from datetime import datetime


class SpectralProcessor:
    """
    Advanced spectral calibration processor with HSV-based color extraction
    and polynomial correction curve fitting.
    """
    
    # Reference wavelengths for primary and secondary colors (nm)
    COLOR_WAVELENGTHS = {
        'red': 625,
        'yellow': 580,
        'green': 530,
        'cyan': 490,
        'blue': 460,
        'magenta': 570
    }
    
    # HSV ranges for color detection (H: 0-179, S: 0-255, V: 0-255)
    HSV_RANGES = {
        'red': [(0, 100, 100), (10, 255, 255), (170, 100, 100), (180, 255, 255)],  # Red wraps around
        'yellow': [(20, 100, 100), (30, 255, 255)],
        'green': [(40, 50, 50), (80, 255, 255)],
        'cyan': [(80, 50, 50), (100, 255, 255)],
        'blue': [(100, 100, 100), (130, 255, 255)],
        'magenta': [(140, 50, 100), (170, 255, 255)]
    }
    
    def __init__(self, image_data: bytes):
        """
        Initialize processor with image data
        
        Args:
            image_data: Raw image bytes
        """
        self.image_data = image_data
        self.image = None
        self.hsv_image = None
        self.height = 0
        self.width = 0
        self.color_regions = {}
        self.black_regions = {}
        self.raw_intensities = {}
        self.corrected_intensities = {}
        self.correction_curves = {}
        self.calibration_data = {}
        
    def load_image(self) -> bool:
        """Load and preprocess image"""
        try:
            # Decode image
            nparr = np.frombuffer(self.image_data, np.uint8)
            self.image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if self.image is None:
                print("ERROR: Failed to decode image", file=sys.stderr)
                return False
            
            self.height, self.width = self.image.shape[:2]
            print(f"Loaded image: {self.width}x{self.height}", file=sys.stderr)
            
            # Convert to HSV for color detection
            self.hsv_image = cv2.cvtColor(self.image, cv2.COLOR_BGR2HSV)
            
            return True
            
        except Exception as e:
            print(f"ERROR loading image: {e}", file=sys.stderr)
            return False
    
    def extract_color_regions(self) -> bool:
        """
        Extract 6 color regions using HSV thresholding
        
        Returns:
            True if at least 4 colors found, False otherwise
        """
        print("Extracting color regions via HSV thresholding...", file=sys.stderr)
        
        for color_name, wavelength in self.COLOR_WAVELENGTHS.items():
            mask = self._create_color_mask(color_name)
            
            if mask is None or cv2.countNonZero(mask) < 100:
                print(f"WARNING: {color_name} region not found or too small", file=sys.stderr)
                continue
            
            # Find largest contour for this color
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                continue
            
            # Get largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            
            if area < 100:  # Minimum area threshold
                continue
            
            # Get bounding box and center
            x, y, w, h = cv2.boundingRect(largest_contour)
            center_x = x + w // 2
            center_y = y + h // 2
            
            # Extract average RGB from this region
            region_mask = np.zeros(self.image.shape[:2], dtype=np.uint8)
            cv2.drawContours(region_mask, [largest_contour], -1, 255, -1)
            
            avg_color = cv2.mean(self.image, mask=region_mask)[:3]  # BGR
            b, g, r = avg_color
            
            self.color_regions[color_name] = {
                'wavelength': wavelength,
                'rgb': {'r': int(r), 'g': int(g), 'b': int(b)},
                'bgr': {'b': int(b), 'g': int(g), 'r': int(r)},
                'center': {'x': center_x, 'y': center_y},
                'area': int(area),
                'bbox': {'x': x, 'y': y, 'width': w, 'height': h}
            }
            
            print(f"Found {color_name}: RGB({int(r)}, {int(g)}, {int(b)}) at ({center_x}, {center_y})", file=sys.stderr)
        
        num_colors = len(self.color_regions)
        print(f"Extracted {num_colors}/6 color regions", file=sys.stderr)
        
        return num_colors >= 4  # Need at least 4 colors for calibration
    
    def _create_color_mask(self, color_name: str) -> Optional[np.ndarray]:
        """
        Create binary mask for specified color using HSV ranges
        
        Args:
            color_name: Name of color to extract
            
        Returns:
            Binary mask or None if color not defined
        """
        if color_name not in self.HSV_RANGES:
            return None
        
        ranges = self.HSV_RANGES[color_name]
        
        # Handle red which wraps around hue circle
        if color_name == 'red':
            lower1, upper1, lower2, upper2 = ranges
            mask1 = cv2.inRange(self.hsv_image, np.array(lower1), np.array(upper1))
            mask2 = cv2.inRange(self.hsv_image, np.array(lower2), np.array(upper2))
            mask = cv2.bitwise_or(mask1, mask2)
        else:
            lower, upper = ranges
            mask = cv2.inRange(self.hsv_image, np.array(lower), np.array(upper))
        
        # Morphological operations to clean up mask
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        return mask
    
    def extract_black_corners(self) -> bool:
        """
        Extract 4 black corner regions for baseline estimation
        
        Returns:
            True if corners extracted successfully
        """
        print("Extracting black corner regions...", file=sys.stderr)
        
        # Define corner regions (10% of image size)
        corner_size_w = self.width // 10
        corner_size_h = self.height // 10
        
        corners = {
            'top_left': (0, 0, corner_size_w, corner_size_h),
            'top_right': (self.width - corner_size_w, 0, corner_size_w, corner_size_h),
            'bottom_left': (0, self.height - corner_size_h, corner_size_w, corner_size_h),
            'bottom_right': (self.width - corner_size_w, self.height - corner_size_h, corner_size_w, corner_size_h)
        }
        
        for corner_name, (x, y, w, h) in corners.items():
            region = self.image[y:y+h, x:x+w]
            
            # Get average RGB
            avg_color = region.mean(axis=(0, 1))
            b, g, r = avg_color
            
            self.black_regions[corner_name] = {
                'rgb': {'r': float(r), 'g': float(g), 'b': float(b)},
                'bgr': {'b': float(b), 'g': float(g), 'r': float(r)},
                'position': {'x': x, 'y': y, 'width': w, 'height': h}
            }
            
            print(f"Black corner {corner_name}: RGB({r:.1f}, {g:.1f}, {b:.1f})", file=sys.stderr)
        
        return True
    
    def calculate_baseline(self) -> Tuple[float, float, float]:
        """
        Calculate average baseline (shadow/noise) from black corners
        
        Returns:
            Tuple of (R_baseline, G_baseline, B_baseline)
        """
        r_values = [corner['rgb']['r'] for corner in self.black_regions.values()]
        g_values = [corner['rgb']['g'] for corner in self.black_regions.values()]
        b_values = [corner['rgb']['b'] for corner in self.black_regions.values()]
        
        baseline = (
            np.mean(r_values),
            np.mean(g_values),
            np.mean(b_values)
        )
        
        print(f"Calculated baseline: R={baseline[0]:.2f}, G={baseline[1]:.2f}, B={baseline[2]:.2f}", file=sys.stderr)
        
        return baseline
    
    def perform_shadow_correction(self) -> Dict:
        """
        Apply shadow correction by subtracting baseline from color intensities
        
        Returns:
            Dictionary with corrected intensities
        """
        print("Performing shadow correction...", file=sys.stderr)
        
        r_baseline, g_baseline, b_baseline = self.calculate_baseline()
        
        # Extract raw intensities
        for color_name, region in self.color_regions.items():
            wavelength = region['wavelength']
            rgb = region['rgb']
            
            # Store raw intensities
            self.raw_intensities[wavelength] = {
                'r': rgb['r'],
                'g': rgb['g'],
                'b': rgb['b'],
                'color': color_name
            }
            
            # Apply baseline subtraction
            corrected = {
                'r': max(0, rgb['r'] - r_baseline),
                'g': max(0, rgb['g'] - g_baseline),
                'b': max(0, rgb['b'] - b_baseline),
                'color': color_name
            }
            
            self.corrected_intensities[wavelength] = corrected
            
            print(f"{color_name} ({wavelength}nm): Raw=({rgb['r']}, {rgb['g']}, {rgb['b']}) -> "
                  f"Corrected=({corrected['r']:.1f}, {corrected['g']:.1f}, {corrected['b']:.1f})", 
                  file=sys.stderr)
        
        return self.corrected_intensities
    
    def fit_correction_curves(self, reference_data: Optional[Dict] = None) -> Dict:
        """
        Fit polynomial correction curves for R, G, B channels using reference values
        
        Formula: Correction_Factor[channel][λ] = Reference_Value[channel][λ] / Raw_Measured[channel][λ]
        
        Args:
            reference_data: Optional reference spectral data for known colors
                           Format: {wavelength: {'r': val, 'g': val, 'b': val}}
            
        Returns:
            Dictionary with correction curve parameters and corrected values
        """
        print("Fitting correction curves with reference values...", file=sys.stderr)
        
        if not self.corrected_intensities:
            raise ValueError("Must perform shadow correction first")
        
        # Sort by wavelength
        wavelengths = sorted(self.corrected_intensities.keys())
        
        # Extract shadow-corrected intensities (baseline already subtracted)
        r_intensities = [self.corrected_intensities[wl]['r'] for wl in wavelengths]
        g_intensities = [self.corrected_intensities[wl]['g'] for wl in wavelengths]
        b_intensities = [self.corrected_intensities[wl]['b'] for wl in wavelengths]
        
        # Define reference values based on expected spectral response
        # For a calibrated camera, each color should show strong response at its wavelength
        if reference_data:
            # Use provided reference data
            print("Using provided reference data", file=sys.stderr)
        else:
            # Generate ideal reference values
            # Each color should have normalized response of 1.0 at its peak wavelength
            # and proportional response at other wavelengths based on spectral overlap
            reference_data = {}
            for wl in wavelengths:
                # Red channel: peaks at red (625nm), weak at blue/cyan
                if wl >= 580:  # Yellow, Red
                    r_ref = 1.0
                elif wl >= 530:  # Green
                    r_ref = 0.3
                elif wl >= 490:  # Cyan
                    r_ref = 0.1
                else:  # Blue, Magenta
                    r_ref = 0.2
                
                # Green channel: peaks at green (530nm), moderate at yellow/cyan
                if wl == 530:  # Green
                    g_ref = 1.0
                elif wl in [490, 570, 580]:  # Cyan, Magenta, Yellow
                    g_ref = 0.6
                elif wl == 625:  # Red
                    g_ref = 0.2
                else:  # Blue
                    g_ref = 0.3
                
                # Blue channel: peaks at blue/cyan (460-490nm), weak at red
                if wl <= 490:  # Blue, Cyan
                    b_ref = 1.0
                elif wl == 530:  # Green
                    b_ref = 0.4
                elif wl in [570, 580]:  # Magenta, Yellow
                    b_ref = 0.3
                else:  # Red
                    b_ref = 0.1
                
                reference_data[wl] = {'r': r_ref, 'g': g_ref, 'b': b_ref}
                print(f"Reference for {wl}nm: R={r_ref}, G={g_ref}, B={b_ref}", file=sys.stderr)
        
        # Normalize raw intensities to 0-1 range for comparison with reference
        max_r = max(r_intensities) if max(r_intensities) > 0 else 1
        max_g = max(g_intensities) if max(g_intensities) > 0 else 1
        max_b = max(b_intensities) if max(b_intensities) > 0 else 1
        
        r_normalized = [r / max_r for r in r_intensities]
        g_normalized = [g / max_g for g in g_intensities]
        b_normalized = [b / max_b for b in b_intensities]
        
        # Calculate correction factors: Correction = Reference / Normalized_Measured
        # This compares reference (0-1) with normalized raw (0-1)
        MIN_THRESHOLD = 0.01  # Minimum normalized intensity
        
        r_corrections = []
        g_corrections = []
        b_corrections = []
        
        for wl, r_norm, g_norm, b_norm in zip(wavelengths, r_normalized, g_normalized, b_normalized):
            ref = reference_data.get(wl, {'r': 1.0, 'g': 1.0, 'b': 1.0})
            
            # Correction_Factor = Reference / Normalized_Measured
            r_corr = ref['r'] / max(r_norm, MIN_THRESHOLD)
            g_corr = ref['g'] / max(g_norm, MIN_THRESHOLD)
            b_corr = ref['b'] / max(b_norm, MIN_THRESHOLD)
            
            # Clip to reasonable range to avoid extreme corrections
            r_corr = max(0.1, min(10.0, r_corr))
            g_corr = max(0.1, min(10.0, g_corr))
            b_corr = max(0.1, min(10.0, b_corr))
            
            r_corrections.append(r_corr)
            g_corrections.append(g_corr)
            b_corrections.append(b_corr)
            
            print(f"{wl}nm: Normalized=({r_norm:.2f},{g_norm:.2f},{b_norm:.2f}) Ref=({ref['r']:.2f},{ref['g']:.2f},{ref['b']:.2f}) -> "
                  f"Corrections=({r_corr:.2f},{g_corr:.2f},{b_corr:.2f})", file=sys.stderr)
        
        # Calculate final corrected values: Corrected = Normalized × Correction_Factor
        r_corrected_final = [r * c for r, c in zip(r_normalized, r_corrections)]
        g_corrected_final = [g * c for g, c in zip(g_normalized, g_corrections)]
        b_corrected_final = [b * c for b, c in zip(b_normalized, b_corrections)]
        
        # Fit polynomial curves (degree 3)
        try:
            r_poly = np.polyfit(wavelengths, r_corrections, deg=3)
            g_poly = np.polyfit(wavelengths, g_corrections, deg=3)
            b_poly = np.polyfit(wavelengths, b_corrections, deg=3)
            
            # Also fit splines for smoother interpolation
            r_spline = UnivariateSpline(wavelengths, r_corrections, s=0.1, k=3)
            g_spline = UnivariateSpline(wavelengths, g_corrections, s=0.1, k=3)
            b_spline = UnivariateSpline(wavelengths, b_corrections, s=0.1, k=3)
            
            self.correction_curves = {
                'polynomial': {
                    'r': r_poly.tolist(),
                    'g': g_poly.tolist(),
                    'b': b_poly.tolist()
                },
                'data_points': {
                    'wavelengths': wavelengths,
                    'r_corrections': r_corrections,
                    'g_corrections': g_corrections,
                    'b_corrections': b_corrections
                },
                'raw_normalized': {
                    'wavelengths': wavelengths,
                    'r': r_normalized,
                    'g': g_normalized,
                    'b': b_normalized
                },
                'final_corrected': {
                    'wavelengths': wavelengths,
                    'r': r_corrected_final,
                    'g': g_corrected_final,
                    'b': b_corrected_final
                },
                'reference_values': reference_data
            }
            
            print(f"✅ Fitted correction curves for {len(wavelengths)} wavelength points", file=sys.stderr)
            print(f"Final corrected values - R: {r_corrected_final}, G: {g_corrected_final}, B: {b_corrected_final}", file=sys.stderr)
            
        except Exception as e:
            print(f"ERROR fitting curves: {e}", file=sys.stderr)
            raise
        
        return self.correction_curves
    
    def apply_correction_to_value(self, wavelength: float, channel: str, value: float) -> float:
        """
        Apply correction curve to a single value
        
        Args:
            wavelength: Wavelength in nm
            channel: 'r', 'g', or 'b'
            value: Raw intensity value
            
        Returns:
            Corrected intensity value
        """
        if 'polynomial' not in self.correction_curves:
            raise ValueError("Correction curves not fitted yet")
        
        poly_coeffs = self.correction_curves['polynomial'][channel]
        correction_factor = np.polyval(poly_coeffs, wavelength)
        
        return value * correction_factor
    
    def save_calibration(self, filename: str = 'calibration_data.json'):
        """
        Save calibration data to file for future reuse
        
        Args:
            filename: Output filename
        """
        calibration = {
            'timestamp': datetime.now().isoformat(),
            'image_size': {'width': self.width, 'height': self.height},
            'color_regions': self.color_regions,
            'black_regions': self.black_regions,
            'raw_intensities': {str(k): v for k, v in self.raw_intensities.items()},
            'corrected_intensities': {str(k): v for k, v in self.corrected_intensities.items()},
            'correction_curves': self.correction_curves,
            'baseline': self.calculate_baseline()
        }
        
        with open(filename, 'w') as f:
            json.dump(calibration, f, indent=2)
        
        print(f"Calibration data saved to {filename}", file=sys.stderr)
    
    def process(self, force_analysis: bool = False) -> Dict:
        """
        Main processing pipeline
        
        Args:
            force_analysis: If True, always return analysis_only mode (never calibration)
        
        Returns:
            Complete calibration results or analysis results
        """
        # Load image
        if not self.load_image():
            return {'success': False, 'error': 'Failed to load image'}
        
        # Extract color regions
        has_enough_colors = self.extract_color_regions()
        
        # If force_analysis is True, always use analysis mode regardless of color count
        if force_analysis and len(self.color_regions) > 0:
            print(f"🔍 Force analysis mode: returning {len(self.color_regions)} color(s) for analysis", file=sys.stderr)
            return {
                'success': True,
                'mode': 'analysis_only',
                'color_regions': self.color_regions,
                'num_colors_detected': len(self.color_regions),
                'message': f'Analysis mode: detected {len(self.color_regions)} color region(s)'
            }
        
        # If we have at least 1 color but less than 4, return analysis_only mode
        if not has_enough_colors:
            if len(self.color_regions) > 0:
                print(f"⚠️ Only {len(self.color_regions)} color(s) detected - returning for analysis only", file=sys.stderr)
                return {
                    'success': True,
                    'mode': 'analysis_only',
                    'color_regions': self.color_regions,
                    'num_colors_detected': len(self.color_regions),
                    'message': f'Detected {len(self.color_regions)} color region(s) - insufficient for calibration but available for analysis'
                }
            else:
                print("⚠️ No distinct colors found in image", file=sys.stderr)
                return {
                    'success': False, 
                    'error': 'No distinct colors detected. This system looks for red, yellow, green, cyan, blue, or magenta colors. Try taking a photo of a colorful object like a phone case, book cover, or printed color chart.'
                }
        
        # We have 4+ colors, proceed with full calibration
        # Extract black corners
        if not self.extract_black_corners():
            return {'success': False, 'error': 'Failed to extract black corner regions'}
        
        # Perform shadow correction
        corrected = self.perform_shadow_correction()
        
        # Fit correction curves
        try:
            self.fit_correction_curves()
        except Exception as e:
            return {'success': False, 'error': f'Failed to fit correction curves: {str(e)}'}
        
        # Build result
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'image_info': {
                'width': self.width,
                'height': self.height
            },
            'color_regions': self.color_regions,
            'black_corners': self.black_regions,
            'baseline': {
                'r': float(self.calculate_baseline()[0]),
                'g': float(self.calculate_baseline()[1]),
                'b': float(self.calculate_baseline()[2])
            },
            'raw_intensities': {str(k): v for k, v in self.raw_intensities.items()},
            'corrected_intensities': {str(k): v for k, v in self.corrected_intensities.items()},
            'correction_curves': self.correction_curves,
            'statistics': {
                'num_colors_detected': len(self.color_regions),
                'num_black_corners': len(self.black_regions),
                'wavelength_range': [
                    min(self.corrected_intensities.keys()),
                    max(self.corrected_intensities.keys())
                ] if self.corrected_intensities else [0, 0]
            }
        }
        
        # Convert numpy types to native Python types
        result = self.convert_to_json_serializable(result)
        
        print(f"✅ Advanced calibration complete: {len(self.color_regions)} colors, baseline correction applied", 
              file=sys.stderr)
        
        return result
    
    @staticmethod
    def convert_to_json_serializable(obj):
        """Convert NumPy types to native Python types for JSON serialization"""
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {key: SpectralProcessor.convert_to_json_serializable(value) 
                    for key, value in obj.items()}
        elif isinstance(obj, list):
            return [SpectralProcessor.convert_to_json_serializable(item) 
                    for item in obj]
        return obj
