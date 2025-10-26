#!/usr/bin/env python3
"""
Quick test script for the spectral processor

This tests the Python processing without needing the React Native app.
Useful for debugging and verifying the algorithms work correctly.
"""

import sys
from pathlib import Path
from spectral_processor import SpectralProcessor

def test_processor(image_path: str):
    """Test the spectral processor with an image"""
    
    print("=" * 60)
    print("SPECTRAL PROCESSOR TEST")
    print("=" * 60)
    print()
    
    print(f"Testing with image: {image_path}")
    print()
    
    try:
        # Create processor
        processor = SpectralProcessor(image_path)
        
        # Process image
        result = processor.process()
        
        # Print results
        print("✓ Processing successful!")
        print()
        print("Image Info:")
        print(f"  Size: {result['image_info']['width']}x{result['image_info']['height']}")
        print(f"  Circle center: ({result['image_info']['circle']['center_x']}, {result['image_info']['circle']['center_y']})")
        print(f"  Circle radius: {result['image_info']['circle']['radius']}px")
        print()
        
        print("Color Samples:")
        print(f"  Total samples: {len(result['color_samples'])}")
        print()
        print("  First 5 samples:")
        for sample in result['color_samples'][:5]:
            print(f"    Angle {sample['angle']:6.1f}° -> RGB({sample['rgb']['r']:3d}, {sample['rgb']['g']:3d}, {sample['rgb']['b']:3d}) -> {sample['estimated_wavelength']:.1f}nm")
        print()
        
        print("Spectral Response:")
        print(f"  Correction factors: {len(result['spectral_response'])}")
        print(f"  Wavelength range: {result['statistics']['wavelength_range']}")
        print(f"  Average factor: {result['statistics']['avg_correction_factor']:.3f}")
        print()
        
        print("Sample correction factors:")
        for wl in [380, 450, 520, 590, 660, 700]:
            factor = result['spectral_response'][wl]
            print(f"  {wl}nm: {factor:.3f}")
        
        print()
        print("=" * 60)
        print("TEST PASSED ✓")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print()
        print("=" * 60)
        print("TEST FAILED ✗")
        print("=" * 60)
        print()
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python test_processor.py <image_path>")
        print()
        print("Example:")
        print("  python test_processor.py rgb_circle.jpg")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not Path(image_path).exists():
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)
    
    success = test_processor(image_path)
    sys.exit(0 if success else 1)
