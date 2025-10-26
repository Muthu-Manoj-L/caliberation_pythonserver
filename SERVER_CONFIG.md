# Python Server Configuration

## Current Setup

The Python spectral processing server is configured to run on your local network.

### Server Status
- **Running on**: `http://192.168.1.48:5000`
- **Health Check**: `http://192.168.1.48:5000/health`
- **Process Endpoint**: `http://192.168.1.48:5000/process`

## How to Update Server IP

If your network IP changes, update it in **one place**:

### File: `lib/config.ts`

```typescript
export const PYTHON_SERVER_URL = 'http://192.168.1.48:5000';
```

Change `192.168.1.48` to your new IP address.

## Finding Your Server IP

When you start the Python server, it displays all available IPs:

```bash
python python/spectral_server.py
```

Output shows:
```
* Running on http://127.0.0.1:5000        # Localhost only
* Running on http://192.168.1.48:5000    # Your network IP (use this one!)
```

## Testing the Connection

### 1. Check if server is running:
```bash
curl http://192.168.1.48:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "spectral_processor",
  "version": "1.0.0"
}
```

### 2. From your mobile device:
- Make sure your phone is on the **same WiFi network**
- The server IP `192.168.1.48` must be accessible from your phone
- Test by opening `http://192.168.1.48:5000/health` in your phone's browser

## Common Issues

### "Cannot connect to server"
- ✅ Server is running (`python python/spectral_server.py`)
- ✅ Phone is on same WiFi network as computer
- ✅ Firewall allows port 5000
- ✅ IP address in `lib/config.ts` matches server IP

### "Wrong IP address"
1. Check Python server output for correct IP
2. Update `lib/config.ts`
3. Restart Metro bundler (`npx expo start`)

## Development vs Production

- **Development**: Uses HTTP server (requires Python server running)
- **Production APK**: Uses native Chaquopy module (works offline)

The app automatically detects which mode to use!
