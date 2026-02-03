-- RealTime Device Configuration Check and Fix
-- Serial Number: RSS20230760881

-- 1. Check if device exists
SELECT 
    id, 
    name, 
    deviceId, 
    serialNumber,
    protocol, 
    status, 
    lastSeen,
    createdAt
FROM Device 
WHERE deviceId = 'RSS20230760881' 
   OR serialNumber = 'RSS20230760881'
   OR deviceId LIKE '%RSS20230760881%';

-- 2. If device exists but has wrong protocol, update it:
-- UPDATE Device 
-- SET protocol = 'REALTIME_DIRECT',
--     deviceId = 'RSS20230760881',
--     serialNumber = 'RSS20230760881'
-- WHERE id = 'YOUR_DEVICE_ID_HERE';

-- 3. If device doesn't exist, you need to create it via the dashboard
-- Go to: Attendance Devices → Add Device
-- Protocol: REALTIME_DIRECT
-- Serial Number: RSS20230760881

-- 4. Check recent device logs for this serial
SELECT 
    deviceId,
    userId,
    timestamp,
    createdAt
FROM DeviceLog 
WHERE deviceId = 'RSS20230760881'
ORDER BY timestamp DESC
LIMIT 20;
