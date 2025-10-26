# 📱 Testing Guide - Real Python Processing

## What You'll See Now (Different from Before!)

### ✅ SUCCESS - Real Processing Working

When you process an RGB circle image, you should now see:

```
Calibration Complete! ✨

Camera spectral response calibrated successfully!

✓ Sampled 72 color points
✓ Calculated 33 correction factors
✓ Circle detected at (250, 250)
✓ Radius: 195px

Using real Python-based image processing!
```

**Key Differences:**
- Circle position will match actual image
- Radius will be accurate
- Each image produces **different values**
- Processing takes ~700ms (real work happening!)

### ❌ ERROR - Server Not Running

If Python server isn't started, you'll see:

```
Python Server Not Running

The Python processing server is not running.

To start it:
1. Open terminal/PowerShell
2. cd to project python/ folder
3. Run: pip install flask flask-cors opencv-python numpy
4. Run: python spectral_server.py
5. Make sure phone and computer are on same WiFi
6. Update server URL in code if needed

Current URL: http://172.16.1.232:5000/process
```

**Solution**: Start the Python server!

---

## Step-by-Step Testing

### 1. Start Python Server

```powershell
# In PowerShell
cd "c:\Users\Muthu Manoj L\Downloads\ColorUpdate-main\ColorUpdate-main\python"
python spectral_server.py
```

**Expected Output:**
```
============================================================
Spectral Processing Server
============================================================

Endpoints:
  GET  /health         - Health check
  POST /process        - Process base64 image
  POST /process-file   - Process uploaded file

Starting server on http://0.0.0.0:5000
============================================================

 * Running on http://127.0.0.1:5000
 * Running on http://172.16.1.232:5000
```

**✓ Server is ready when you see these lines**

### 2. Test Server Health (Optional)

Open browser and go to: `http://localhost:5000/health`

Should see:
```json
{
  "status": "healthy",
  "service": "spectral_processor",
  "version": "1.0.0"
}
```

### 3. Open App on Phone

- Make sure phone is on **same WiFi** as computer
- Open the ColorUpdate app
- Go to **Dashboard** → Tap **Calibration** widget

### 4. Capture RGB Circle Image

You need an RGB color wheel image. You can:

**Option A: Take photo of a physical RGB wheel**
- Print this: https://www.color-hex.com/color-wheel/
- Use black background
- Good, even lighting
- Hold camera steady

**Option B: Screenshot from computer**
- Search "RGB color wheel" on Google Images
- Use one with pure colors and black background
- Save to phone

**Option C: Use camera to capture from screen**
- Display RGB wheel on computer monitor
- Use phone camera to capture it
- Make sure it's centered and clear

### 5. Process Calibration

1. In app, tap **"Capture Image"** or **"Choose from Gallery"**
2. Select/capture your RGB circle image
3. Image appears on screen
4. Tap **"Process Calibration"** button
5. Wait ~1 second (processing happening!)

### 6. Check Results

**GOOD RESULT** ✅:
```
Calibration Complete! ✨

✓ Sampled 72 color points
✓ Calculated 33 correction factors
✓ Circle detected at (245, 252)
✓ Radius: 198px

Using real Python-based image processing!
```

**Check Python Server Terminal:**
```
Received image (format: jpg)
Decoded image: (500, 500, 3)
Detected circle: center=(250, 250), radius=200
Sampling 72 colors...
Calculating spectral response...
Analysis complete: 72 samples, 33 correction factors
Processing complete
127.0.0.1 - - [23/Oct/2025 04:30:45] "POST /process HTTP/1.1" 200 -
```

### 7. Test with Different Images

**This is the key test!**

1. Process first RGB circle image → Note the results
2. Choose a **different** RGB circle image
3. Tap **"Recalibrate"** (orange button)
4. Process the new image
5. **Results should be DIFFERENT!**

**Example:**
- Image 1: Circle at (250, 250), radius 200px
- Image 2: Circle at (310, 285), radius 175px
- ✅ Different values = Real processing working!

---

## Troubleshooting

### "Network request failed"

**Problem**: Can't reach Python server

**Solutions:**
1. Check Python server is running (see terminal)
2. Verify phone and computer on **same WiFi**
3. Check firewall isn't blocking port 5000
4. Try computer's IP in browser from phone
5. Update server URL in code if IP changed

### "Failed to decode image"

**Problem**: Image format not supported or corrupted

**Solutions:**
1. Try different image format (JPG instead of PNG)
2. Ensure image isn't corrupted
3. Try capturing new image
4. Check image size (not too large)

### "Failed to detect RGB circle"

**Problem**: Circle detection algorithm couldn't find circle

**Solutions:**
1. Ensure RGB circle is **clearly visible**
2. Use image with **black background**
3. Circle should be **reasonably centered**
4. Try **better lighting**
5. Increase image quality/resolution

### Same results for different images

**Problem**: Still using old JavaScript code

**Solutions:**
1. Restart Metro bundler
2. Reload app on phone
3. Check server URL is correct
4. Verify Python server is actually running
5. Check network connection

---

## What to Look For

### ✅ Signs Real Processing is Working

1. **Processing takes time** (~1 second)
2. **Server logs show activity** in terminal
3. **Different images → different results**
4. **Circle detection values vary**
5. **Detailed success message** with circle info

### ❌ Signs Still Using Old Code

1. **Instant results** (< 100ms)
2. **No server logs**
3. **Same results for all images**
4. **Generic success message**
5. **No circle detection info**

---

## Server Status

Current Status: **✅ RUNNING**
- URL: `http://172.16.1.232:5000`
- Port: `5000`
- Endpoints: `/health`, `/process`, `/process-file`

Keep the PowerShell window open while testing!

---

## Next Steps After Successful Testing

Once you confirm real processing is working:

1. ✅ **Celebrate!** You have real spectral analysis!
2. 📸 **Collect more RGB circle images** for testing
3. 🔬 **Move to Phase 2**: Sample Analysis UI
4. 📊 **Start analyzing real samples** with ROI selection
5. 🚀 **Build the full spectrometry system!**

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start server | `python spectral_server.py` |
| Stop server | `Ctrl+C` in PowerShell |
| Test health | `http://localhost:5000/health` |
| Test processor | `python test_processor.py image.jpg` |
| Install packages | `pip install -r requirements.txt` |
| Check IP | `ipconfig` (Windows) |

---

**Ready to test? Let's go! 🚀**

1. Python server running? ✓
2. Phone on same WiFi? ✓
3. RGB circle image ready? ✓
4. App open? ✓

**GO PROCESS SOME IMAGES!** 🎨📊✨
