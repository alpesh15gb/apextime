# Local Sync Agent - Implementation Plan

## Overview
A lightweight Node.js service that runs on the client's local network. It acts as a proxy for RealTime biometric devices, providing offline buffering and a local dashboard.

## File Structure (`/local-agent`)
```
/local-agent
  ├── package.json
  ├── tsconfig.json
  ├── src
  │   ├── index.ts          # Entry point
  │   ├── server.ts         # WebSocket & HTTP Server
  │   ├── database.ts       # SQLite wrapper
  │   ├── sync.ts           # Cloud synchronization logic
  │   └── public            # Static files for Local Dashboard
  │       ├── index.html
  │       └── style.css
```

## Key Modules

### 1. Database (`database.ts`)
Using `better-sqlite3` for robust, synchronous local storage.
**Schema:**
```sql
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviceId TEXT,
  userId TEXT,
  timestamp TEXT,
  rawData TEXT,
  synced INTEGER DEFAULT 0, -- 0=Pending, 1=Synced
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    deviceId TEXT PRIMARY KEY,
    lastSeen DATETIME,
    status TEXT
);
```

### 2. WebSocket Server (`server.ts`)
Listens on `0.0.0.0:5001`.
*   **Path:** `/realtime-ws` (RealTime) & `/api/iclock/cdata` (ADMS HTTP Fallback).
*   **Logic:**
    *   On Connection: Identify Device.
    *   On Message: Parse Log -> Save to DB (synced=0) -> Broadcast to Local UI.

### 3. Sync Engine (`sync.ts`)
Interval: Every 10 seconds.
*   **Check:** Is internet reachable? (Ping Google or Apextime Cloud).
*   **Fetch:** `SELECT * FROM logs WHERE synced=0 LIMIT 50`.
*   **Push:** POST to `https://apextime.in/api/devices/sync-batch`.
*   **Update:** On 200 OK -> `UPDATE logs SET synced=1 WHERE id IN (...)`.

### 4. Local Dashboard (`public/index.html`)
A simple HTML/JS page hitting the local API.
*   **Status Indicators:**
    *   Cloud Connection: 🟢/🔴
    *   Pending Logs: 154
*   **Live Table:** Last 50 punches.

## Prerequisite: Cloud Backend Update
We need to add the batch sync endpoint to the main backend.

**File:** `backend/src/routes/devices.ts`
```typescript
router.post('/sync-batch', authenticate, async (req, res) => {
    const { logs } = req.body;
    // ... bulk insert into prisma.deviceLog ...
});
```

## Setup Instructions for User
1. Download `apextime-local-agent.zip`.
2. Extract to `C:\ApextimeAgent`.
3. Run `start.bat`.
4. Change Device Server IP to the Local PC's IP.
