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

    /**
     * Authenticate and get a dynamic access token (if required by Sandbox)
     */
    static async getAccessToken() {
        try {
            const res = await axios.post(`${SANDBOX_BASE_URL}/authenticate`, {}, {
                headers: {
                    'x-api-key': process.env.SANDBOX_API_KEY,
                    'x-api-secret': process.env.SANDBOX_API_SECRET
                }
            });
            return res.data.access_token;
        } catch (error: any) {
            console.error('Sandbox Auth Error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Sandbox');
        }
    }

    /**
     * Verify PAN details
     */
    static async verifyPAN(pan: string) {
        try {
            const token = await this.getAccessToken();
            const res = await axios.get(`${SANDBOX_BASE_URL}/kyc/pan/${pan}`, {
                headers: {
                    'Authorization': token,
                    'x-api-key': process.env.SANDBOX_API_KEY
                }
            });
            return res.data;
        } catch (error: any) {
            console.error('PAN Verification Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'PAN Verification failed');
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
                    'x-api-key': process.env.SANDBOX_API_KEY
                }
            });
            return res.data;
        } catch (error: any) {
            console.error('Job Status Error:', error.response?.data || error.message);
            throw new Error('Failed to check job status');
        }
    }
}
