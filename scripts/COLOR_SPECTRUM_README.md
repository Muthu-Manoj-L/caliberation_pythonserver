# Color Spectrum Analysis Service

This Python service analyzes images to extract color spectrum data, including dominant colors, color distribution, and color temperature.

## Features

- Extract dominant colors from images using k-means clustering
- Calculate color distribution percentages
- Analyze color temperature (warm/cool/neutral)
- Support for both file paths and base64 encoded images
- JSON output for easy integration

## Requirements

```bash
pip install pillow numpy opencv-python scikit-learn
```

### Minimum Requirements (without sklearn):
```bash
pip install pillow numpy
```

## Usage

### Command Line

```bash
# Basic usage - analyze image with 5 dominant colors
python color_spectrum_service.py path/to/image.jpg

# Specify number of colors to extract
python color_spectrum_service.py path/to/image.jpg 8

# Analyze image from camera_images directory
python color_spectrum_service.py camera_images/IMG_1234567890.jpg
```

### Python API

```python
from color_spectrum_service import analyze_image

# Analyze an image
result = analyze_image('path/to/image.jpg', num_colors=5)

print(result)
# Output:
# {
#   "colors": [
#     {
#       "color": "#FF6B6B",
#       "rgb": [255, 107, 107],
#       "percentage": 35.5,
#       "label": "Primary Spectrum"
#     },
#     ...
#   ],
#   "dominantColor": "#FF6B6B",
#   "temperature": "warm",
#   "analyzed": true,
#   "colorCount": 5
# }
```

### Integration with React Native App

The service is designed to work with the ColorUpdate mobile app. Images captured through the app's camera feature are stored locally and can be analyzed using this service.

#### Option 1: Local Analysis (Development)
Run the Python service on your development machine and expose it via a local API server.

#### Option 2: Backend Integration (Production)
Deploy the Python service as part of your backend infrastructure:
- Flask/FastAPI endpoint
- AWS Lambda function
- Google Cloud Function
- Azure Function

### Example Flask API Integration

```python
from flask import Flask, request, jsonify
from color_spectrum_service import analyze_image
import base64

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    image_data = data.get('image')  # base64 encoded
    num_colors = data.get('numColors', 5)
    
    result = analyze_image(image_data, num_colors)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Output Format

The service returns a JSON object with the following structure:

```json
{
  "colors": [
    {
      "color": "#FF6B6B",
      "rgb": [255, 107, 107],
      "percentage": 35.5,
      "label": "Primary Spectrum"
    }
  ],
  "dominantColor": "#FF6B6B",
  "temperature": "warm",
  "analyzed": true,
  "colorCount": 5
}
```

### Fields Description

- **colors**: Array of dominant color objects
  - **color**: Hex color code
  - **rgb**: RGB values as array [R, G, B]
  - **percentage**: Percentage of image containing this color
  - **label**: Descriptive label for the color spectrum
- **dominantColor**: Hex code of the most prominent color
- **temperature**: Overall color temperature ('warm', 'cool', or 'neutral')
- **analyzed**: Boolean indicating successful analysis
- **colorCount**: Number of colors extracted

## Algorithm

The service uses k-means clustering to identify dominant colors:

1. Load and convert image to RGB
2. Resize to 200x200 for faster processing
3. Apply k-means clustering to group similar colors
4. Calculate percentage distribution
5. Analyze color temperature based on RGB values

## Error Handling

If the service encounters an error, it returns:

```json
{
  "error": "Failed to analyze image",
  "colors": [],
  "dominantColor": "#000000",
  "temperature": "unknown"
}
```

## Notes

- Images are automatically resized to 200x200 for performance
- The service supports JPG, PNG, and other common image formats
- Base64 encoded images are supported for API integration
- Falls back to simple color quantization if scikit-learn is not available

## Performance

- Average processing time: 1-2 seconds per image
- Memory usage: ~50-100 MB depending on image size
- Optimized for mobile device camera images

## License

This service is part of the ColorUpdate application.
