#!/usr/bin/env python3
"""
Quick test script to verify calibration consistency
Run this while keeping your calibration chart in the same position
"""

import json
import time

print("=== Calibration Repeatability Test ===\n")
print("Instructions:")
print("1. Place your calibration chart in good lighting")
print("2. Take 3 calibration photos without moving anything")
print("3. Paste the correction factors from each calibration below\n")

# Store results
calibrations = []

for i in range(3):
    print(f"\n--- Calibration #{i+1} ---")
    print("Take a calibration photo now and paste the correction factors:")
    print("Example: 460nm: R=10.00, G=6.93, B=1.29")
    
    input(f"\nPress Enter when ready for calibration {i+1}...")
    
    # In real use, this would capture from the app
    # For now, user will paste results
    
print("\n" + "="*50)
print("ANALYSIS:")
print("="*50)

print("""
Expected results for GOOD calibration:
- Correction factors should be within ±5% across all 3 trials
- Example: If R=1.03 in trial 1, should be 0.98-1.08 in trials 2-3

Expected results for BAD calibration:
- Factors vary wildly (e.g., R=1.0, then R=5.0, then R=0.2)
- Indicates lighting changed or camera moved

Your last calibration factors:
460nm: R=10.00, G=6.93, B=1.29
490nm: R=10.00, G=0.78, B=1.29
530nm: R=10.00, G=1.37, B=10.00
570nm: R=0.31, G=1.81, B=0.30
580nm: R=1.03, G=0.60, B=10.00
625nm: R=1.00, G=0.86, B=2.26

Compare your new calibrations to these values!
""")

print("\n✅ If factors are consistent → Calibration is WORKING")
print("❌ If factors vary a lot → Check lighting/camera position")
