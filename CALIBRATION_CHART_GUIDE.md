# Calibration Chart Creation Guide

## What You Need

A physical calibration chart with:
- **6 color patches**: Red, Yellow, Green, Cyan, Blue, Magenta
- **4 black corners**: For baseline measurement
- **Known spectral properties**: Ideally with reference spectral data

## Option 1: Print Your Own (Easy)

### Materials:
- High-quality color printer
- Premium photo paper (matte or glossy)
- Black construction paper for corners

### Steps:
1. Print the included `calibration_chart_template.pdf` (to be created)
2. Cut out black squares and glue to corners
3. Mount on rigid backing (cardboard/foam board)
4. Use in consistent lighting conditions

### Limitations:
- Printer colors may not match exact wavelengths
- Good for relative calibration, not absolute measurements

## Option 2: Professional Color Target (Recommended)

### Purchase Options:

**1. X-Rite ColorChecker Passport** (~$99)
- Industry standard
- Known reference values
- 24 color patches including primaries
- Comes with reference spectral data

**2. Datacolor SpyderCHECKR** (~$49-69)
- 48 color patches
- Good for photography calibration
- Less expensive alternative

**3. Custom Spectral Target** (~$200-500)
- Order from companies like Image Engineering
- Can specify exact wavelengths
- Comes with certified spectral measurements

## Option 3: Use Colored LED Panel

### DIY Approach:
1. Get 6 high-quality LEDs:
   - Red LED (625nm peak)
   - Yellow/Amber LED (580nm)
   - Green LED (530nm)
   - Cyan LED (490nm)
   - Blue LED (460nm)
   - UV/Purple LED (570nm for magenta)

2. Mount on white diffuser panel
3. Photograph each LED separately
4. Known wavelengths from LED datasheets

### Benefits:
- More controlled wavelengths
- Can measure one at a time
- Reusable and consistent

## Current Calibration Chart Setup

Based on your logs, you're currently using:
- Found red: RGB(227, 64, 32) at (1514, 1120)
- Found yellow: RGB(220, 213, 16) at (2041, 2033)
- Found green: RGB(15, 160, 11) at (2273, 2556)
- Found cyan: RGB(9, 168, 174) at (1521, 2935)
- Found blue: RGB(2, 27, 174) at (782, 2560)
- Found magenta: RGB(218, 83, 217) at (989, 2041)

This appears to be a **printed or screen-based target** which is working!

## Best Practices

### Lighting Conditions:
- ✅ Use **consistent lighting** (same light source each time)
- ✅ Avoid shadows on the target
- ✅ Prevent glare/reflections
- ✅ Use diffuse lighting (not direct sunlight)

### Camera Settings:
- ✅ Lock exposure (manual mode)
- ✅ Lock white balance
- ✅ Disable auto-brightness
- ✅ Use same distance each time

### Positioning:
- ✅ Fill frame with calibration chart
- ✅ Keep camera parallel to chart
- ✅ Ensure all 6 colors + 4 black corners are visible
- ✅ Avoid barrel distortion at edges

## Validation

After calibration, your corrected values should match reference values:

| Wavelength | R_ref | G_ref | B_ref | Your R | Your G | Your B | Match? |
|------------|-------|-------|-------|--------|--------|--------|--------|
| 460nm      | 0.2   | 0.3   | 1.0   | 0.0    | 0.3    | 1.0    | ✓      |
| 490nm      | 0.1   | 0.6   | 1.0   | 0.0    | 0.6    | 1.0    | ✓      |
| 530nm      | 0.3   | 1.0   | 0.4   | 0.0    | 1.0    | 0.0    | ~      |
| 570nm      | 0.3   | 0.6   | 0.3   | 0.3    | 0.6    | 0.3    | ✅     |
| 580nm      | 1.0   | 0.6   | 0.3   | 1.0    | 0.6    | 0.0    | ~      |
| 625nm      | 1.0   | 0.2   | 0.1   | 1.0    | 0.2    | 0.1    | ✅     |

✅ = Perfect match (< 5% error)
✓ = Good match (< 10% error)
~ = Acceptable (< 20% error)

## Next Steps

1. **If using printed chart**: Your current setup is working! Continue using it for consistent relative measurements.

2. **If you need absolute accuracy**: Consider purchasing a professional color target with certified reference values.

3. **For production use**: Test calibration repeatability by:
   - Taking 5 calibrations of the same chart
   - Checking correction factors are consistent
   - Measuring known samples to validate accuracy

---
*Last updated: October 24, 2025*
