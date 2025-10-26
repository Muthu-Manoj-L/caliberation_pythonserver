# Ambient Light Sensor Debug Guide

## Overview
This guide helps you debug the ambient light sensor integration in the Expo app.

## What We Added
1. **Ambient Light Sensor Library**: `expo-sensors` package
2. **Device Display**: Shows in "No Device Connected" widget on dashboard
3. **Real-Time Widget**: Displays live ambient light readings with graph
4. **Device Connection Screen**: Shows current lux value and light level

## Debug Info Added

### On Dashboard (When No Device Connected)
- **Visual Counter**: Shows "Available: 2 devices" (or more)
- **Device List**: 
  - ☀️ Phone ambient light sensor (with Sun icon)
  - 📻 Phone proximity sensor (with Radio icon)
- **Console Logs**: Check browser/Expo debugger console

### Console Logs to Check

1. **Dashboard Initialization**:
   ```
   Dashboard mounted, availableDevices: [...]
   ```

2. **Available Device Rendering**:
   ```
   Available device rendering: light:local Phone ambient light sensor
   Available device rendering: proximity:local Phone proximity sensor
   ```

3. **Device Connection Screen**:
   ```
   DeviceConnection mounted. Platform: android/ios/web
   Attempting to subscribe to LightSensor...
   Light sensor data received: {illuminance: 750}
   LightSensor subscription successful
   ```

## How to Check Console Logs

### Option 1: Expo Go App Debugger
1. Open your app on the phone (via Expo Go or development build)
2. Shake the phone or press the menu button
3. Select "Debug Remote JS"
4. Browser DevTools will open with console logs

### Option 2: Terminal Logs
1. The Metro bundler terminal shows live logs from the device
2. Look for console.log output

### Option 3: Web Version
1. Open `http://localhost:8082` in browser
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Look for debug messages

## Expected Behavior

### On Mobile (Android/iOS)
```
✅ Platform: android (or ios)
✅ LightSensor subscription successful
✅ Light sensor data received: {illuminance: XXX}
✅ ambientLight state updates with actual lux values
```

### On Web
```
✅ Platform: web
✅ Using demo value: 750 lux
✅ No sensor subscription (web doesn't support native sensors)
```

### Dashboard Widget Should Show
```
No Device Connected

Available: 2 devices

☀️ Phone ambient light sensor          online
📻 Phone proximity sensor             online
```

## Troubleshooting

### Issue: Devices Not Showing
**Solution**: 
1. Check console for errors
2. Verify `availableDevices` array is defined (look for "Available: X devices" text)
3. Reload the app (press `r` in terminal)

### Issue: Ambient Light Value Not Updating
**Solution**:
1. Check device-connection.tsx console logs
2. Verify Platform.OS is not 'web'
3. Check if LightSensor is available on your device
4. Try moving phone in different lighting conditions

### Issue: Icons Not Showing
**Solution**:
1. Verify Sun and Radio icons are imported from lucide-react-native
2. Check `getDeviceIcon()` function is properly detecting device ID
3. Reload the app

## Testing Checklist

- [ ] Dashboard shows "Available: 2 devices" text
- [ ] Ambient light sensor appears with Sun icon (☀️)
- [ ] Proximity sensor appears with Radio icon (📻)
- [ ] Tapping a sensor opens the device picker
- [ ] Selecting ambient light sensor connects to it
- [ ] Real-Time widget shows ambient light graph
- [ ] Lux value updates when light changes
- [ ] Device Connection screen shows current lux value
- [ ] Light level indicator shows correct category (Dark/Dim/Normal/Bright)

## Files Modified

1. **app/(tabs)/index.tsx**
   - Added Sun and Radio icon imports
   - Added `getDeviceIcon()` function
   - Updated device list rendering with debug counter

2. **app/device-connection.tsx**
   - Added Platform import
   - Added LightSensor subscription with error handling
   - Added console logs for debugging
   - Shows ambient light value with light level indicator

3. **components/WidgetModal_NEW.tsx**
   - Added LightSensor import
   - Added ambient light state
   - Added listener for light sensor when widget is active
   - Added UI rendering for ambient light widget

## Next Steps if Issues Persist

1. **Check Terminal Logs**:
   - Look for any error messages in the Expo dev server terminal
   
2. **Clear All Caches**:
   ```bash
   npm start -- --reset-cache
   ```

3. **Restart Dev Server**:
   ```bash
   npm run dev
   ```

4. **Check Permissions**:
   - On Android: Ensure app has sensor permissions
   - On iOS: Check Info.plist for sensor access

5. **Test with Web First**:
   - Press `w` to test on web
   - Web should show demo value of 750 lux
   - This confirms UI components work

## Performance Notes

- Light sensor updates continuously (may impact performance)
- Consider adding sensor update throttling if needed
- Web platform shows static demo value (no real sensor access)

---

Need more help? Check the console logs output and the files mentioned above!
