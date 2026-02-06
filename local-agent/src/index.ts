import express from 'express';
import multer from 'multer';
import Database from 'better-sqlite3';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import cron from 'node-cron';

dotenv.config();

const app = express();
const upload = multer();
const db = new Database('local_sync.db');
const PORT = process.env.PORT || 5001;

// 1. Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS punches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sn TEXT,
    userId TEXT,
    userName TEXT,
    punchTime TEXT,
    subType TEXT,
    rawData TEXT,
    synced INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Hikvision Event Listener
app.post('/api/hikvision/event', upload.any(), (req, res) => {
    try {
        let eventData = req.body;

        // Handle multipart/form-data from Hikvision
        if (req.body && req.body.event_log) {
            try {
                eventData = JSON.parse(req.body.event_log);
            } catch (e) {
                eventData = req.body.event_log;
            }
        }

        // Basic XML extraction if string
        if (typeof eventData === 'string') {
            const snMatch = eventData.match(/<serialNo>(.*?)<\/serialNo>/i);
            const employeeNoMatch = eventData.match(/<employeeNo>(.*?)<\/employeeNo>/i);
            const nameMatch = eventData.match(/<name>(.*?)<\/name>/i);
            const timeMatch = eventData.match(/<dateTime>(.*?)<\/dateTime>/i);
            const subTypeMatch = eventData.match(/<subEventType>(.*?)<\/subEventType>/i);

            if (snMatch) {
                eventData = {
                    serialNo: snMatch[1],
                    employeeNo: employeeNoMatch ? employeeNoMatch[1] : undefined,
                    name: nameMatch ? nameMatch[1] : undefined,
                    time: timeMatch ? timeMatch[1] : undefined,
                    subEventType: subTypeMatch ? subTypeMatch[1] : undefined
                };
            }
        }

        const SN = eventData?.serialNo || eventData?.AccessControllerEvent?.serialNo || eventData?.deviceID;
        const userId = eventData?.employeeNo || eventData?.AccessControllerEvent?.employeeNo;
        const userName = eventData?.name || eventData?.AccessControllerEvent?.name;
        const punchTime = eventData?.time || eventData?.AccessControllerEvent?.dateTime;
        const subType = eventData?.subEventType || eventData?.AccessControllerEvent?.subEventType;

        // Filtering: Only save SubEventType 75 (Verification Success)
        if (subType == 75 || subType == '75') {
            const stmt = db.prepare('INSERT INTO punches (sn, userId, userName, punchTime, subType, rawData) VALUES (?, ?, ?, ?, ?, ?)');
            stmt.run(SN, userId, userName, punchTime, subType.toString(), JSON.stringify(eventData));
            console.log(`[LOCAL] Saved punch: ${userId} (${userName}) at ${punchTime}`);
        }

        // Always respond OK immediately to the device
        res.status(200).send('OK');
    } catch (err) {
        console.error('[LOCAL] Error processing Hikvision event:', err);
        res.status(200).send('OK');
    }
});

// 3. Health Check & Status
app.get('/', (req, res) => {
    const stats = db.prepare('SELECT COUNT(*) as count, synced FROM punches GROUP BY synced').all() as { count: number, synced: number }[];
    const pending = stats.find(s => s.synced === 0)?.count || 0;
    const synced = stats.find(s => s.synced === 1)?.count || 0;

    res.send(`
        <html>
            <head>
                <title>ApexTime Local Sync Agent</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; background: #f4f7f9; color: #333; }
                    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
                    .stat { font-size: 24px; font-weight: bold; margin: 10px 0; }
                    .pending { color: #e67e22; }
                    .synced { color: #27ae60; }
                    h1 { color: #2c3e50; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>ApexTime Local Agent</h1>
                    <p>Agent Name: <strong>${process.env.AGENT_NAME}</strong></p>
                    <hr/>
                    <div class="stat pending">Pending Sync: ${pending}</div>
                    <div class="stat synced">Successfully Synced: ${synced}</div>
                    <p>Status: <strong>Running & Listening (Port ${PORT})</strong></p>
                </div>
            </body>
        </html>
    `);
});

// 4. Background Sync Job
async function syncToCloud() {
    const pending = db.prepare('SELECT * FROM punches WHERE synced = 0 LIMIT 100').all() as any[];

    if (pending.length === 0) return;

    console.log(`[SYNC] Attempting to push ${pending.length} punches to cloud...`);

    try {
        const response = await axios.post(`${process.env.CLOUD_API_URL}/hikvision/event/batch`, {
            agentName: process.env.AGENT_NAME,
            punches: pending
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.CLOUD_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            const ids = pending.map(p => p.id);
            const updateStmt = db.prepare(`UPDATE punches SET synced = 1 WHERE id IN (${ids.join(',')})`);
            updateStmt.run();
            console.log(`[SYNC] Successfully synced ${pending.length} punches.`);
        }
    } catch (err: any) {
        console.error(`[SYNC] Cloud Sync Failed: ${err.message}`);
    }
}

// Run sync every 10 seconds
cron.schedule('*/10 * * * * *', syncToCloud);

app.listen(PORT, () => {
    console.log(`[AGENT] Local Sync Agent running on port ${PORT}`);
    console.log(`[AGENT] Dashboard active at http://localhost:${PORT}`);
});
