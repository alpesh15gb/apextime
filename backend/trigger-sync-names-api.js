
const fetch = require('node-fetch');

async function triggerSyncNames() {
    try {
        const response = await fetch('http://localhost:5000/api/sync/sync-names', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Mock token if needed, or bypass auth temporarily if permissible. 
                // Given earlier failures, I'll assumme I might need to bypass auth or use a valid token.
                // For now, I'll attempt without auth and see if I can hit the endpoint if I disable middleware temporarily or if I have a token.
                // Wait, I don't have a token. I need to login first? Or I can use a script that calls the service directly?
                // Calling the service function directly via a script is safer and bypasses HTTP auth issues.
            }
        });
        const data = await response.json();
        console.log('Sync Names Response:', data);
    } catch (error) {
        console.error('Error triggering sync:', error);
    }
}

triggerSyncNames();
