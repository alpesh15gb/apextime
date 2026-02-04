# How It Works: The "Push" Connection Explained

You asked a very important question:
> *"How will you connect the machine if... it has a dynamic IP [and is] on a different location?"*

## The Short Answer
**The Server never tries to find the Machine. The Machine finds the Server.**

It works exactly like **WhatsApp** on your phone.
*   Your phone moves around (Home Wi-Fi, 4G, Office Wi-Fi). Its IP address changes constantly.
*   But you still receive messages instantly.
*   **Why?** Because your phone *actively connects* to the WhatsApp Server. The Server doesn't look for you; you look for the Server.

## The Technical Explanation (ADMS / Push Technology)

### 1. Who Calls Who?
*   **Old Way (Pull)**: The Server tries to connect to the Device IP (`192.168.1.50`). This FAILS if the device is at a different location or has a dynamic IP.
*   **Our Way (Push)**: The **Device** is programmed with **YOUR Server's IP** (`95.98.2.20`).
    *   When the Device turns on, it says: *"Hello Server 95.98.2.20! I am Serial Number RSS-123. I am here."*
    *   The Device initiates the connection.

### 2. Identifying the Device
Since the IP changes, we simply ignore the IP. We identify the device by its **Serial Number**.
*   Every message the device sends starts with: `SN=RSS20230760881`.
*   The Server looks up this Serial Number in the database to know who it is.

### 3. How Can We Send Commands Back? (The "Socket")
Even though the Device initiated the call, we keep the line open.
*   **WebSocket / Persistent HTTP**: Think of it like a phone call that never hangs up.
*   Once the Device calls the Server, the connection stays **Active**.
*   Through this *existing* active connection, the Server can say: *"Hey RSS-123, while you're on the line, send me the logs from yesterday."*

## The Architecture Diagram

```mermaid
graph LR
    subgraph Client Location (Dynamic IP)
        D[RealTime Device]
        D -- "My IP: 10.0.0.5 (Dynamic)" --> Router
    end

    subgraph Internet
        Router -- "Public IP: 49.32.11.55 (Changes)" --> Cloud
    end

    subgraph Your Cloud VPS (Static IP)
        Cloud -- "To: 95.98.2.20" --> S[Apextime Server]
    end

    D -- "1. Connect to 95.98.2.20" --> S
    S -- "2. OK, Connection Accepted" --> D
    
    note right of S: "I don't care what your IP is.\nI know you are RSS-123 because you told me."
```

## Summary for Setup
1.  **You do NOT need** a Static IP at the **Client's** location.
2.  **You DO need** a Static IP at **Your** location (The VPS: `95.98.2.20`).
3.  You configure the **Machine** to look for **You**.

This is why `Standard RealTime` and `ADMS` are superior to older networking protocols. They are designed specifically for cloud attendance where devices are scattered across different cities with standard home/office internet connections.
