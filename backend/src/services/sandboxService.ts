import axios from 'axios';

const SANDBOX_BASE_URL = 'https://api.sandbox.co.in';

export class SandboxService {
    private static apiConfig = {
        headers: {
            'x-api-key': process.env.SANDBOX_API_KEY,
            'x-api-secret': process.env.SANDBOX_API_SECRET,
            'Authorization': process.env.SANDBOX_API_KEY, // Sometimes used as auth
            'accept': 'application/json',
            'x-api-version': '1.0'
        }
    };

    private static cachedToken: string | null = null;
    private static tokenExpiry: number = 0;

    /**
     * Authenticate and get a dynamic access token (Cached for performance)
     */
    static async getAccessToken() {
        // Reuse cached token if valid (Buffer of 1 minute)
        if (this.cachedToken && Date.now() < this.tokenExpiry - 60000) {
            return this.cachedToken;
        }

        try {
            const res = await axios.post(`${SANDBOX_BASE_URL}/authenticate`, {}, {
                headers: {
                    'x-api-key': process.env.SANDBOX_API_KEY,
                    'x-api-secret': process.env.SANDBOX_API_SECRET,
                    'x-api-version': '1.0.0'
                }
            });
            this.cachedToken = res.data.access_token;
            // Sandbox tokens usually last 24h, let's assume 23h to be safe
            this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
            return this.cachedToken;
        } catch (error: any) {
            console.error('Sandbox Auth Error:', error.response?.data || error.message);
            throw new Error('Sandbox Authentication failed: ' + (error.response?.data?.message || 'Check API Keys'));
        }
    }

    /**
     * Verify PAN details (Official Sandbox JSON POST)
     */
    static async verifyPAN(pan: string) {
        try {
            const token = await this.getAccessToken();
            const res = await axios.post(`${SANDBOX_BASE_URL}/kyc/pan/verify`,
                {
                    pan: pan,
                    consent: 'y',
                    reason: 'Employee Verification'
                },
                {
                    headers: {
                        'Authorization': token,
                        'x-api-key': process.env.SANDBOX_API_KEY,
                        'x-api-version': '1.0.0',
                        'Content-Type': 'application/json'
                    }
                });
            return res.data;
        } catch (error: any) {
            console.error('PAN Verification Error:', error.response?.data || error.message);
            // Return a more descriptive error if available
            const details = error.response?.data?.message || error.response?.data?.error || 'PAN Verification failed';
            throw new Error(details);
        }
    }

    /**
     * Trigger a request to TRACES for Form 16 Part A
     */
    static async requestForm16PartA(credentials: any, financialYear: string, quarter: string) {
        try {
            const token = await this.getAccessToken();
            const payload = {
                user_id: credentials.username,
                password: credentials.password,
                tan: credentials.tan,
                financial_year: financialYear,
                quarter: quarter,
                form_type: '24Q'
            };

            const res = await axios.post(`${SANDBOX_BASE_URL}/compliance/traces/tds/certificate/job`, payload, {
                headers: {
                    'Authorization': token,
                    'x-api-key': process.env.SANDBOX_API_KEY,
                    'x-api-version': '1.0.0',
                    'Content-Type': 'application/json'
                }
            });

            return res.data; // Returns a job_id
        } catch (error: any) {
            console.error('TRACES Request Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'TRACES request failed');
        }
    }

    /**
     * Check status of a TRACES job
     */
    static async checkJobStatus(jobId: string) {
        try {
            const token = await this.getAccessToken();
            const res = await axios.get(`${SANDBOX_BASE_URL}/compliance/traces/tds/certificate/job/${jobId}`, {
                headers: {
                    'Authorization': token,
                    'x-api-key': process.env.SANDBOX_API_KEY,
                    'x-api-version': '1.0.0'
                }
            });
            return res.data;
        } catch (error: any) {
            console.error('Job Status Error:', error.response?.data || error.message);
            throw new Error('Failed to check job status');
        }
    }
}
