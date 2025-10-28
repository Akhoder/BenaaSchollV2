# Port Management Script for BenaaSchool

## Quick Fix Commands

### Quick Start with Auto Port Detection:
```bash
npm run dev:auto
```

This will automatically:
- Kill existing Node.js processes
- Find an available port (3000-3010)
- Start the development server
- Update package.json with the correct port

1. **Kill all Node.js processes:**
   ```bash
   npm run dev:kill
   ```

2. **Check port availability:**
   ```bash
   npm run dev:check
   ```

3. **Start server on alternative port:**
   ```bash
   npm run dev:alt
   ```

### Manual Commands

#### Kill Node.js processes:
```bash
taskkill /F /IM node.exe
```

#### Check specific ports:
```bash
# Check port 3002
netstat -aon | findstr :3002

# Check port 3003
netstat -aon | findstr :3003

# Check port 3500 (system process)
netstat -aon | findstr :3500
```

#### Find available ports:
```bash
# Check ports 3000-3010
for /L %i in (3000,1,3010) do @netstat -aon | findstr :%i
```

## Port Usage Guide

| Port | Status | Usage |
|------|--------|-------|
| 3500 | ❌ Occupied | Windows System process (PID 4) |
| 3000 | ❌ Often occupied | Default React/Next.js port |
| 3001 | ❌ Often occupied | Alternative development port |
| 3002 | ❌ Often occupied | Previous port |
| 3003 | ✅ Available | Backup port |
| 3004 | ✅ Available | Current BenaaSchool port |

## Troubleshooting Steps

### Step 1: Kill Conflicting Processes
```bash
npm run dev:kill
```

### Step 2: Wait 5 seconds
Let the system release the ports.

### Step 3: Check Port Availability
```bash
npm run dev:check
```

### Step 4: Start Server
```bash
npm run dev
```

### If Still Failing:

1. **Try alternative port:**
   ```bash
   npm run dev:alt
   ```

2. **Manual port selection:**
   ```bash
   npm run dev -- -p 3004
   npm run dev -- -p 3005
   npm run dev -- -p 3006
   ```

3. **Check Windows Firewall:**
   - Ensure Node.js is allowed through firewall
   - Check antivirus settings

4. **Run as Administrator:**
   - Right-click Command Prompt/PowerShell
   - Select "Run as administrator"
   - Run `npm run dev`

## Prevention

### Always use these commands before starting development:
```bash
# Clean start
npm run dev:kill
npm run dev
```

### If you have multiple projects:
- Use different ports for each project
- Document which ports each project uses
- Use environment variables for port configuration

## Environment Variables

Create a `.env.local` file:
```env
PORT=3002
```

Then update package.json:
```json
{
  "scripts": {
    "dev": "next dev -p ${PORT:-3002}"
  }
}
```

## Success Indicators

✅ Server starts without errors
✅ No EACCES (-4092) or EADDRINUSE (-4091) errors
✅ Application accessible in browser
✅ Clean console output
✅ Port shows as LISTENING in netstat
