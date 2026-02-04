# Offline / Local Sync Strategy for Apextime
## The Problem
When the client's internet connection goes down:
1.  **Biometric Devices** (RealTime/ESSL) cannot reach the Cloud Server (`apextime.in`).
2.  **Data Buffering**: Devices will buffer logs internally (up to their memory limit), but the Cloud Dashboard will show them as "Offline".
3.  **Loss of Real-Time Visibility**: The client cannot see who is present in the building *right now*. This is critical for security and management.

## The Solution: Apextime Local Sync Agent
To ensure "RealTime" functionality even without internet, we introduce a **Local Relay/Sync Agent**.

### Architecture
```mermaid
graph LR
    D[RealTime Device] -- LAN (WebSocket) --> L[Local Sync Agent (PC)]
    L -- Internet (HTTPS) --> C[Cloud Server]
    L -- Localhost --> U[Local Dashboard]
```

### Components
1.  **Input Listener**: A local WebSocket server (port 5001) that mimics the Apextime Cloud Protocol. The devices are configured to point to this Local Agent's IP instead of the Cloud IP.
2.  **Local Database**: A lightweight SQLite database to store `DeviceLogs` immediately upon receipt.
3.  **Sync Engine**: A background process that:
    *   Reads unsynced logs from the Local DB.
    *   Pushes them to the Cloud API (`/api/devices/sync-logs`).
    *   Handles retries and connection failures gracefully.
4.  **Local Dashboard**: A simple web page (served by the Agent) showing:
    *   Device Status (Online/Offline on LAN).
    *   Live Feed of punches (served from Local DB).
    *   Internet Connection Status.

### Benefits
*   **100% Uptime for Data Collection**: Devices never fail to send data as long as the LAN is up.
*   **True Real-Time Local View**: Client can view the "Local Dashboard" to see attendance instantly, even during an internet outage.
*   **Automatic Recovery**: When internet is restored, the Agent automatically pushes all buffered logs to the Cloud.

## Technical Implementation Plan

### 1. New Tool: `local-sync-agent`
A standalone Node.js application (compiled to `.exe` for easy install).

**Tech Stack:**
*   Node.js + TypeScript
*   `ws` (WebSocket Server)
*   `sqlite3` + `better-sqlite3` (Local Storage)
*   `axios` (Cloud Sync)
*   `express` (Local Dashboard)

### 2. Cloud API Update
Ensure the Backend has a batch ingestion endpoint.
*   Current `iclock` endpoint can handle single logs, but a batch endpoint `POST /api/devices/sync-batch` is more efficient for recovering from long outages.

### 3. Client Deployment
*   Install Node.js (or provide standalone exe).
*   Run `apextime-local-agent.exe`.
*   Configure Device to `Server IP: <Local PC IP>`.

---

## Next Steps
We can build the **Local Sync Agent** prototype now. created `LOCAL_SYNC_AGENT_PLAN.md` for details.
