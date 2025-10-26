# Color Spectrum Analysis Service
# This Python script analyzes images to extract color spectrum data
# It can be run as a standalone service or integrated with a backend API

import sys
import json
import base64
from io import BytesIO
from typing import Dict, List, Tuple
import numpy as np
from PIL import Image
from collections import Counter

# Note: Install required packages with:
# pip install pillow numpy opencv-python scikit-learn

def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """Convert RGB tuple to hex color code."""
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])


def get_dominant_colors(image_path: str, num_colors: int = 5) -> List[Dict]:
    """
    Extract dominant colors from an image using k-means clustering.
    
    Args:
        image_path: Path to the image file or base64 encoded image
        num_colors: Number of dominant colors to extract
        
    Returns:
        List of dictionaries containing color information
    """
    try:
        # Try to load image from file or base64
        if image_path.startswith('data:image') or image_path.startswith('base64,'):
            # Handle base64 encoded image
            if 'base64,' in image_path:
                image_data = image_path.split('base64,')[1]
            else:
                image_data = image_path
            img_bytes = base64.b64decode(image_data)
            img = Image.open(BytesIO(img_bytes))
        else:
            # Handle file path
            img = Image.open(image_path)
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize image for faster processing
        img.thumbnail((200, 200))
        
        # Convert to numpy array
        img_array = np.array(img)
        pixels = img_array.reshape(-1, 3)
        
        # Use k-means clustering to find dominant colors
        try:
            from sklearn.cluster import KMeans
            
            kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            # Get cluster centers (dominant colors)
            colors = kmeans.cluster_centers_.astype(int)
            
            # Count pixels in each cluster
            labels = kmeans.labels_
            label_counts = Counter(labels)
            total_pixels = len(labels)
            
            # Create result list
            color_data = []
            color_names = [
                'Primary Spectrum',
                'Secondary Spectrum', 
                'Tertiary Spectrum',
                'Quaternary Spectrum',
                'Quinary Spectrum'
            ]
            
            for i, (label, count) in enumerate(sorted(label_counts.items(), 
                                                      key=lambda x: x[1], 
                                                      reverse=True)):
                color_rgb = tuple(colors[label])
                percentage = round((count / total_pixels) * 100, 1)
                
                color_data.append({
                    'color': rgb_to_hex(color_rgb),
                    'rgb': color_rgb,
                    'percentage': percentage,
                    'label': color_names[i] if i < len(color_names) else f'Color {i+1}'
                })
            
            return color_data
            
        except ImportError:
            # Fallback: Simple color sampling if sklearn is not available
            return simple_color_analysis(pixels, num_colors)
            
    except Exception as e:
        print(f"Error analyzing image: {e}", file=sys.stderr)
        return []


def simple_color_analysis(pixels: np.ndarray, num_colors: int = 5) -> List[Dict]:
    """
    Simple color analysis fallback without sklearn.
    Groups colors by quantization.
    """
    # Quantize colors to reduce variations
    quantized = (pixels // 32) * 32
    
    # Count color frequencies
    unique_colors, counts = np.unique(quantized, axis=0, return_counts=True)
    
    # Sort by frequency
    sorted_indices = np.argsort(counts)[::-1]
    top_colors = unique_colors[sorted_indices][:num_colors]
    top_counts = counts[sorted_indices][:num_colors]
    
    total = np.sum(top_counts)
    
    color_data = []
    color_names = [
        'Primary Spectrum',
        'Secondary Spectrum',
        'Tertiary Spectrum',
        'Quaternary Spectrum',
        'Quinary Spectrum'
    ]
    
    for i, (color, count) in enumerate(zip(top_colors, top_counts)):
        percentage = round((count / total) * 100, 1)
        color_data.append({
            'color': rgb_to_hex(tuple(color)),
            'rgb': tuple(map(int, color)),
            'percentage': percentage,
            'label': color_names[i] if i < len(color_names) else f'Color {i+1}'
        })
    
    return color_data


def analyze_color_temperature(colors: List[Dict]) -> str:
    """
    Analyze the overall color temperature of the image.
    """
    warm_weight = 0
    cool_weight = 0
    
    for color_info in colors:
        r, g, b = color_info['rgb']
        weight = color_info['percentage'] / 100
        
        # Warm colors have more red/yellow
        if r > b:
            warm_weight += weight
        else:
            cool_weight += weight
    
    if warm_weight > cool_weight * 1.2:
        return 'warm'
    elif cool_weight > warm_weight * 1.2:
        return 'cool'
    else:
        return 'neutral'


def analyze_image(image_path: str, num_colors: int = 5) -> Dict:
    """
    Complete image color spectrum analysis.
    
    Args:
        image_path: Path to image file or base64 encoded image
        num_colors: Number of dominant colors to extract
        
    Returns:
        Dictionary containing analysis results
    """
    colors = get_dominant_colors(image_path, num_colors)
    
    if not colors:
        return {
            'error': 'Failed to analyze image',
            'colors': [],
            'dominantColor': '#000000',
            'temperature': 'unknown'
        }
    
    temperature = analyze_color_temperature(colors)
    
    return {
        'colors': colors,
        'dominantColor': colors[0]['color'] if colors else '#000000',
        'temperature': temperature,
        'analyzed': True,
        'colorCount': len(colors)
    }


def main():
    """
    Command line interface for color spectrum analysis.
    Usage: python color_spectrum_service.py <image_path> [num_colors]
    """
    if len(sys.argv) < 2:
        print("Usage: python color_spectrum_service.py <image_path> [num_colors]")
        print("Example: python color_spectrum_service.py image.jpg 5")
        sys.exit(1)
    
    image_path = sys.argv[1]
    num_colors = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    print(f"Analyzing image: {image_path}")
    result = analyze_image(image_path, num_colors)
    
    # Output as JSON
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
