
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Images, and Docs allowed.'));
        }
    }
});

// Upload Document
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { employeeId, type, name } = req.body;
        const user = (req as any).user;

        if (!employeeId || !type) {
            return res.status(400).json({ error: 'Missing metadata' });
        }

        const document = await prisma.employeeDocument.create({
            data: {
                tenantId: user.tenantId,
                employeeId,
                type,
                name: name || req.file.originalname,
                url: `/uploads/documents/${req.file.filename}`, // Relative URL
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedBy: user.username
            }
        });

        res.status(201).json(document);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List Documents for Employee
router.get('/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const user = (req as any).user;

        const documents = await prisma.employeeDocument.findMany({
            where: {
                employeeId,
                tenantId: user.tenantId
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(documents);
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Document
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const doc = await prisma.employeeDocument.findFirst({
            where: { id, tenantId: user.tenantId }
        });

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Delete file from disk
        const filePath = path.join(__dirname, '../../', doc.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await prisma.employeeDocument.delete({
            where: { id }
        });

        res.json({ message: 'Document deleted' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
