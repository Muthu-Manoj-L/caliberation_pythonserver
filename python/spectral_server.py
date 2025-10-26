#!/usr/bin/env python3
"""
Flask Server for Spectral Processing

This provides an HTTP API for the spectral processor,
making it easy to integrate with React Native without native modules.

Usage:
    pip install flask flask-cors
    python spectral_server.py

API Endpoints:
    POST /process - Process RGB circle image
    GET /health - Health check
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import sys
import traceback
import tempfile
import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

# Import our spectral processor
from spectral_processor import SpectralProcessor

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'spectral_processor',
        'version': '1.0.0'
    })


@app.route('/process', methods=['POST'])
def process_image():
    """
    Process RGB circle image
    
    Request Body:
        {
            "image": "base64_encoded_image_data",
            "format": "jpg" or "png"
        }
    
    Response:
        {
            "success": true,
            "timestamp": 1234567890,
            "image_info": {...},
            "color_samples": [...],
            "spectral_response": {...},
            "statistics": {...}
        }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400
        
        # Decode base64 image
        image_base64 = data['image']
        image_format = data.get('format', 'jpg')
        force_analysis = data.get('force_analysis', False)  # Force analysis mode (no calibration)
        
        print(f"Received image (format: {image_format})", file=sys.stderr)
        
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(image_base64)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({
                'success': False,
                'error': 'Failed to decode image'
            }), 400
        
        print(f"Decoded image: {image.shape}", file=sys.stderr)
        
        # Convert image back to bytes for SpectralProcessor
        # SpectralProcessor expects bytes, not a file path
        success, encoded_image = cv2.imencode('.jpg', image)
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to encode image'
            }), 400
        
        image_bytes_processed = encoded_image.tobytes()
        print(f"Converted to bytes: {len(image_bytes_processed)} bytes", file=sys.stderr)
        
        # Process with SpectralProcessor (pass bytes, not file path)
        processor = SpectralProcessor(image_bytes_processed)
        result = processor.process(force_analysis=force_analysis)
        
        print("Processing complete", file=sys.stderr)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500


@app.route('/process-file', methods=['POST'])
def process_file():
    """
    Process RGB circle image from file upload
    
    Form Data:
        image: File upload
    
    Response: Same as /process endpoint
    """
    try:
        # Check if file was uploaded
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400
        
        # Save to temporary file (cross-platform)
        temp_fd, temp_path = tempfile.mkstemp(suffix='.jpg', prefix='spectral_upload_')
        os.close(temp_fd)  # Close the file descriptor
        
        file.save(temp_path)
        print(f"Saved upload to: {temp_path}", file=sys.stderr)
        
        # Process with SpectralProcessor
        processor = SpectralProcessor(temp_path)
        result = processor.process()
        
        # Clean up
        try:
            os.unlink(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error processing file: {e}", file=sys.stderr)
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Spectral Processing Server")
    print("=" * 60)
    print()
    print("Endpoints:")
    print("  GET  /health         - Health check")
    print("  POST /process        - Process base64 image")
    print("  POST /process-file   - Process uploaded file")
    print()
    print("Starting server on http://0.0.0.0:5000")
    print("=" * 60)
    print()
    
    # Run server
    # Use 0.0.0.0 to allow connections from phone
    app.run(host='0.0.0.0', port=5000, debug=True)
