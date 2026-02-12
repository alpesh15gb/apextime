
import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication
router.use(authenticate);

// Get Company Profile
router.get('/', async (req, res) => {
    try {
        const profile = await prisma.companyProfile.findFirst();
        if (!profile) {
            // Return default structure if not found
            return res.json({
                name: 'Apextime Enterprises',
                legalName: '',
                address: '',
                logo: '',
                gstin: '',
                pan: '',
                pfCode: '',
                esiCode: '',
                tan: '',
                bankName: '',
                accountNumber: '',
                ifscCode: ''
            });
        }
        res.json(profile);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update/Upsert Company Profile
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Check if exists
        const existing = await prisma.companyProfile.findFirst();

        let result;
        if (existing) {
            result = await prisma.companyProfile.update({
                where: { id: existing.id },
                data: {
                    name: data.name,
                    legalName: data.legalName,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    logo: data.logo,
                    gstin: data.gstin,
                    pan: data.pan,
                    pfCode: data.pfCode,
                    esiCode: data.esiCode,
                    tan: data.tan,
                    citAddress: data.citAddress,
                    signatoryName: data.signatoryName,
                    signatoryFatherName: data.signatoryFatherName,
                    signatoryDesignation: data.signatoryDesignation,
                    signatoryPlace: data.signatoryPlace,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber,
                    ifscCode: data.ifscCode
                }
            });
        } else {
            result = await prisma.companyProfile.create({
                data: {
                    tenantId: (req as any).user.tenantId,
                    name: data.name || 'My Company',
                    legalName: data.legalName,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    pincode: data.pincode,
                    logo: data.logo,
                    gstin: data.gstin,
                    pan: data.pan,
                    pfCode: data.pfCode,
                    esiCode: data.esiCode,
                    tan: data.tan,
                    citAddress: data.citAddress,
                    signatoryName: data.signatoryName,
                    signatoryFatherName: data.signatoryFatherName,
                    signatoryDesignation: data.signatoryDesignation,
                    signatoryPlace: data.signatoryPlace,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber,
                    ifscCode: data.ifscCode
                }
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

export default router;
