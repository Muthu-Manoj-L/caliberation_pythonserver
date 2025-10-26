# Python Environment for Spectral Processing

## Required Packages

```bash
pip install opencv-python numpy pillow
```

## Package Versions
- opencv-python>=4.5.0 - Image processing and circle detection
- numpy>=1.19.0 - Numerical operations
- pillow>=8.0.0 - Additional image format support

## Installation

### Windows
```powershell
python -m pip install opencv-python numpy pillow
```

### Check Installation
```bash
python -c "import cv2; import numpy; print('OpenCV:', cv2.__version__); print('NumPy:', numpy.__version__)"
```

## Usage

The spectral_processor.py script is called from React Native:

```bash
python python/spectral_processor.py <input_image_path> <output_json_path>
```

### Input
- RGB color wheel image (JPG, PNG)
- Should have black background
- Circle should be reasonably centered

### Output
JSON file with:
- 72 color samples (every 5 degrees)
- Spectral response correction factors (380-700nm)
- Circle detection results
- Statistics and metadata
