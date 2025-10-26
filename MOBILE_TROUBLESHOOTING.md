# Mobile App Scanning Issues - Troubleshooting

## Problem
When scanning the QR code on mobile, the app loads but:
- No terminal output appears
- No bundling process shows
- App loads directly from cache

## Root Causes

### 1. **Old QR Code or Expired Session**
- QR code changes each time you restart the server
- Old code still works if your phone is still connected
- But won't show new updates

### 2. **Expo Go vs Development Build**
- **Expo Go**: Official app, universal but limited
- **Development Build**: Custom build with your app's native code
- They behave differently and show different logs

### 3. **Cache Issues**
- App may be using cached bundle
- React Native caches JavaScript
- Device might not have fresh code

## Solutions

### Solution 1: Use Web Version First (Immediate Test)
```
✅ This works immediately without mobile setup
1. Open http://localhost:8081 in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Reload the page
5. Check for logs
```

### Solution 2: Force App Reload on Mobile
```
1. Make sure you scanned the LATEST QR code
2. On your phone, shake or press menu
3. Select "Reload" or "Force Reload"
4. Wait for bundling to complete
5. Check terminal for logs
```

### Solution 3: Use Expo Go Instead (Easier)
```
1. On mobile, press menu/shake
2. Select "Switch to Expo Go"
3. Terminal should show switching
4. App will reload in Expo Go
5. Terminal should now show logs
```

### Solution 4: Complete Reset
```
1. Stop the server (Ctrl+C)
2. Clear Metro cache:
   npm start -- --reset-cache
3. Kill the app on mobile
4. Scan the NEW QR code again
5. Wait for "Bundle complete"
6. Check terminal for logs
```

## Understanding Terminal Output

### When Terminal Shows Logs (What We Want)
```
LOG  Dashboard mounted, availableDevices: [...]
LOG  Available device rendering: light:local
```

### When Terminal Shows Nothing (Current Issue)
- App is using old cached code
- Development build might not be connected
- Or logs are going to device console, not terminal

### Where Logs Actually Go

**Development Build** → Terminal (where you run `npm start`)
**Expo Go** → Device console AND Terminal
**Web** → Browser console (F12 DevTools)

## Recommended Testing Order

### Step 1: Test Web Version
```
✅ FASTEST - No mobile needed
1. Open http://localhost:8081
2. F12 → Console
3. Look for "Dashboard mounted"
```

### Step 2: Test Mobile with Fresh Scan
```
⏱️ MEDIUM - Requires mobile
1. Stop server (Ctrl+C)
2. npm start -- --reset-cache
3. Scan NEW QR code
4. Wait for "Bundled" message
5. Check terminal
```

### Step 3: Switch to Expo Go
```
⏲️ FASTEST for Mobile - Uses universal app
1. On mobile menu → "Switch to Expo Go"
2. Automatically reloads
3. Terminal should show logs immediately
```

## Current Server Status

✅ Server: Running
✅ Metro: Ready
✅ QR Code: Generated
✅ Cache: Cleared

## Next Actions

1. **Open http://localhost:8081 in browser NOW**
2. Check if you see the dashboard
3. Check if you see the debug text and device list
4. Report what you see!

OR

1. **Scan the QR code again**
2. Wait for app to fully load
3. Check if terminal shows any output
4. Report what you see!

## Key Points to Remember

- 📱 Mobile logs appear in **TERMINAL** (not on device)
- 🌐 Web logs appear in **BROWSER CONSOLE** (F12)
- 🔄 Terminal only shows logs AFTER connection is established
- 📡 QR code changes on each server restart
- 🆕 Always scan the LATEST QR code

---

**Try the web version first - it's the fastest way to verify everything works!**
