import express from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = express.Router();
router.use(authenticate);

// Get all books
router.get('/books', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const books = await prisma.libraryBook.findMany({
            where: { tenantId }
        });
        res.json(books);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create book
router.post('/books', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const book = await prisma.libraryBook.create({
            data: { ...req.body, tenantId }
        });
        res.json(book);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Issue book (placeholder logic)
router.post('/issue', async (req: any, res) => {
    // Logic for issuing books to students
    res.json({ success: true, message: 'Book issue logic not fully implemented yet' });
});

export default router;
