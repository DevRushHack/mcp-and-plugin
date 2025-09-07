# 🚀 Quick Start Guide: FastAPI + Tauri Integration

## Problem: FastAPI not auto-starting?

Follow these steps to troubleshoot and get everything working:

### Step 1: Setup FastAPI Environment (One-time setup)

```bash
# Navigate to the project
cd /Users/akuldeepj/Desktop/code/cursor-talk-to-figma-mcp/tauri-mcp-client

# Create Python virtual environment and install dependencies
npm run fastapi:create-venv
```

### Step 2: Test FastAPI Manually

```bash
# Test that FastAPI can start manually
npm run test:fastapi

# If that works, test running the server
npm run fastapi:dev
```

You should see:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Test Tauri with Manual FastAPI

```bash
# Terminal 1: Start FastAPI
npm run fastapi:dev

# Terminal 2: Start Tauri (in a new terminal)
npm run tauri:dev:auto
```

### Step 4: Verify Integration

1. Open the Tauri app
2. Go to "FastAPI Server" tab
3. You should see:
   - 🟢 Green status indicator
   - "Connected to FastAPI server"
   - List of available tools
   - Working query interface

## Development Modes

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run tauri:dev:auto` | Tauri with auto-managed FastAPI | **Recommended** - Should auto-start FastAPI |
| `npm run tauri:dev:all` | Tauri + manual FastAPI concurrently | If auto-start isn't working |
| `npm run dev:all` | Web mode with FastAPI | Web development only |

## Troubleshooting

### FastAPI Won't Start in Tauri

1. **Check Python Installation**:
   ```bash
   python3 --version  # Should be 3.8 or higher
   which python3
   ```

2. **Check Virtual Environment**:
   ```bash
   ls -la resource/mcp-client-python/api/venv/  # Should exist after setup
   ```

3. **Check Dependencies**:
   ```bash
   npm run test:fastapi  # Should print "FastAPI imports OK"
   ```

4. **Check Tauri Logs**:
   - Open Tauri app
   - Press `Cmd+Option+I` (Mac) to open dev tools
   - Check console for FastAPI startup logs

### Expected Log Messages

In Tauri dev tools console, you should see:
```
[INFO] Using FastAPI directory: ...
[INFO] Using Python: /usr/bin/python3
[INFO] Virtual environment already exists
[INFO] Dependencies installed successfully
[INFO] FastAPI server started with PID: xxxxx
```

### Common Issues & Solutions

1. **"FastAPI directory not found"**
   - Solution: Run `npm run fastapi:create-venv` first

2. **"Python executable not found"**
   - Solution: Install Python 3.8+ or update PATH

3. **"Virtual environment Python not found"**
   - Solution: Delete `venv` folder and run setup again:
     ```bash
     rm -rf resource/mcp-client-python/api/venv
     npm run fastapi:create-venv
     ```

4. **"Failed to install dependencies"**
   - Solution: Update pip and try again:
     ```bash
     cd resource/mcp-client-python/api
     source venv/bin/activate
     pip install --upgrade pip
     pip install -r requirements.txt
     ```

## Manual Fallback

If auto-start still doesn't work, use manual mode:

```bash
# Terminal 1
npm run fastapi:dev

# Terminal 2  
npm run tauri:dev
```

Then in the Tauri app, go to "FastAPI Server" tab and click "Refresh" - it should detect the manually started server.

## Success Indicators ✅

- ✅ FastAPI server starts automatically when launching Tauri
- ✅ Green status indicator in "FastAPI Server" tab
- ✅ Tools list populated automatically
- ✅ Query interface works
- ✅ Start/Stop buttons work in Tauri mode

Need help? Check the console logs in both Terminal and Tauri dev tools!
