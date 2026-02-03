# Device Management System - Employee Upload to Biometric Devices

## 🎯 Overview

The Device Management System allows you to **push employees from your ApexTime application directly to biometric devices**. You only need to register fingerprints on the device - all employee data is managed from the app!

---

## 🔧 How It Works

### **1. Command Queue System**

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  ApexTime   │ Queue   │   Command    │  Poll   │   Biometric  │
│     App     │────────▶│    Queue     │◀────────│    Device    │
└─────────────┘         └──────────────┘         └──────────────┘
                              │                          │
                              │                          │
                              └──────────────────────────┘
                                   Device Executes
```

1. **Admin queues command** (e.g., "Upload Employee")
2. **Device polls server** for pending commands
3. **Device downloads** employee data
4. **Device executes** command
5. **Device reports** success/failure

---

## 📋 Features

### ✅ **Supported Commands:**

| Command | Description | Use Case |
|---------|-------------|----------|
| `UPLOAD_USER` | Upload single employee | Add new employee to device |
| `UPLOAD_MULTIPLE` | Upload multiple employees | Bulk employee addition |
| `UPLOAD_ALL` | Upload all active employees | Initial device setup |
| `DELETE_USER` | Delete employee from device | Employee termination |
| `CLEAR_ALL_USERS` | Clear all users | Device reset |
| `SYNC_TIME` | Sync device time with server | Fix time drift |
| `RESTART` | Restart device | Troubleshooting |

---

## 🚀 API Usage

### **1. Upload Single Employee**

```bash
POST /api/devices/{deviceId}/upload-employee
Content-Type: application/json

{
  "employeeId": "emp-uuid-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee upload command queued successfully",
  "data": {
    "id": "cmd-uuid-456",
    "commandType": "UPLOAD_USER",
    "status": "PENDING",
    "priority": 5
  }
}
```

---

### **2. Upload Multiple Employees**

```bash
POST /api/devices/{deviceId}/upload-employees
Content-Type: application/json

{
  "employeeIds": ["emp-1", "emp-2", "emp-3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 employee upload commands queued",
  "data": [...]
}
```

---

### **3. Upload All Active Employees**

```bash
POST /api/devices/{deviceId}/upload-all-employees
```

**Use Case:** Initial device setup or after device reset

---

### **4. Delete Employee from Device**

```bash
POST /api/devices/{deviceId}/delete-employee
Content-Type: application/json

{
  "employeeId": "emp-uuid-123"
}
```

**Use Case:** Employee termination or transfer

---

### **5. Sync Device Time**

```bash
POST /api/devices/{deviceId}/sync-time
```

**Use Case:** Fix time drift issues

---

### **6. Restart Device**

```bash
POST /api/devices/{deviceId}/restart
```

**Use Case:** Troubleshooting or after firmware update

---

## 🔄 Device Polling

Devices poll the server for commands:

```bash
GET /api/devices/{deviceId}/commands
```

**Response (ZKTeco Format):**
```
C:cmd-1:DATA USER PIN=EMP001	Name=John Doe	Pri=0	Passwd=	Card=	Grp=IT
C:cmd-2:DATA USER PIN=EMP002	Name=Jane Smith	Pri=0	Passwd=	Card=	Grp=HR
```

---

## 📊 Command Status Tracking

### **Get Command Statistics:**

```bash
GET /api/devices/{deviceId}/stats?hours=24
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "completed": 120,
    "failed": 2
  }
}
```

---

## 🎨 Frontend Integration

### **React Component Example:**

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const EmployeeDeviceUpload = ({ employeeId, devices }) => {
    const [selectedDevice, setSelectedDevice] = useState('');
    const [loading, setLoading] = useState(false);

    const uploadToDevice = async () => {
        setLoading(true);
        try {
            await axios.post(`/api/devices/${selectedDevice}/upload-employee`, {
                employeeId
            });
            alert('Employee queued for upload!');
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <select onChange={(e) => setSelectedDevice(e.target.value)}>
                <option value="">Select Device</option>
                {devices.map(device => (
                    <option key={device.id} value={device.id}>
                        {device.deviceName}
                    </option>
                ))}
            </select>
            <button onClick={uploadToDevice} disabled={!selectedDevice || loading}>
                {loading ? 'Uploading...' : 'Upload to Device'}
            </button>
        </div>
    );
};
```

---

## 🔐 Employee Data Format

When uploading to device, the following data is sent:

```json
{
  "userId": "EMP001",           // Employee code or device user ID
  "name": "John Doe",           // Full name
  "cardNo": "1234567890",       // RFID card number (optional)
  "department": "IT",           // Department name
  "role": "Software Engineer",  // Designation
  "password": "",               // PIN (optional)
  "privilege": 0,               // 0=User, 14=Admin
  "enabled": 1                  // 1=Active, 0=Inactive
}
```

---

## 🛠️ Device Setup Workflow

### **Initial Setup:**

1. **Add Device** to ApexTime
   ```bash
   POST /api/devices
   {
     "deviceId": "SERIAL123",
     "deviceName": "Main Entrance",
     "ipAddress": "192.168.1.100",
     "port": 4370
   }
   ```

2. **Upload All Employees**
   ```bash
   POST /api/devices/{deviceId}/upload-all-employees
   ```

3. **Register Fingerprints** on device
   - Employees go to device
   - Admin mode → Enroll User
   - Enter employee code (EMP001)
   - Scan fingerprint

4. **Done!** Device is ready

---

## 📱 Mobile App Integration

For mobile apps, you can trigger uploads via API:

```javascript
// Upload employee when added
const addEmployee = async (employeeData) => {
    // 1. Create employee in database
    const employee = await createEmployee(employeeData);
    
    // 2. Queue upload to all devices
    const devices = await getActiveDevices();
    for (const device of devices) {
        await axios.post(`/api/devices/${device.id}/upload-employee`, {
            employeeId: employee.id
        });
    }
    
    return employee;
};
```

---

## 🔍 Troubleshooting

### **Command Not Executing?**

1. **Check device is online:**
   ```bash
   GET /api/devices/{deviceId}
   ```
   Look for `isOnline: true`

2. **Check pending commands:**
   ```bash
   GET /api/devices/{deviceId}/stats
   ```

3. **Check device logs:**
   - Device should poll every 30 seconds
   - Check device network connectivity
   - Verify device IP and port

### **Employee Not Found on Device?**

1. **Verify command completed:**
   ```bash
   GET /api/devices/{deviceId}/stats
   ```

2. **Check employee code matches:**
   - Device User ID must match employee code
   - Case-sensitive in some devices

3. **Re-upload employee:**
   ```bash
   POST /api/devices/{deviceId}/upload-employee
   ```

---

## 🎯 Best Practices

1. **Use deviceUserId field** in Employee model for device-specific IDs
2. **Upload employees immediately** after creation
3. **Delete from device** when employee is terminated
4. **Sync time regularly** (daily recommended)
5. **Monitor command queue** for failed commands
6. **Keep device firmware updated**

---

## 🔄 Workflow Examples

### **New Employee Onboarding:**

```javascript
// 1. Create employee in ApexTime
const employee = await createEmployee({
    firstName: 'John',
    lastName: 'Doe',
    employeeCode: 'EMP001',
    deviceUserId: 'EMP001',
    department: 'IT'
});

// 2. Upload to all devices
const devices = await getDevices();
for (const device of devices) {
    await uploadEmployeeToDevice(device.id, employee.id);
}

// 3. Employee registers fingerprint on device
// (Manual step at device)

// 4. Done! Employee can now punch in/out
```

### **Employee Termination:**

```javascript
// 1. Deactivate employee
await deactivateEmployee(employeeId);

// 2. Delete from all devices
const devices = await getDevices();
for (const device of devices) {
    await deleteEmployeeFromDevice(device.id, employeeId);
}

// 3. Employee cannot punch anymore
```

---

## 📊 Database Schema

```prisma
model Device {
  id              String   @id @default(uuid())
  deviceId        String   @unique
  deviceName      String
  deviceType      String   @default("BIOMETRIC")
  ipAddress       String?
  port            Int?     @default(4370)
  isActive        Boolean  @default(true)
  isOnline        Boolean  @default(false)
  lastSeen        DateTime?
  commands        DeviceCommand[]
}

model DeviceCommand {
  id              String   @id @default(uuid())
  deviceId        String
  commandType     String
  payload         String?
  status          String   @default("PENDING")
  priority        Int      @default(1)
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}
```

---

## 🚀 Next Steps

1. **Run migration** to create tables:
   ```bash
   cd backend
   npx prisma migrate dev --name add_device_management
   ```

2. **Add devices** to your system

3. **Upload employees** to devices

4. **Register fingerprints** on devices

5. **Start tracking attendance!**

---

**Your employees are now managed from ApexTime and synced to devices automatically!** 🎉
