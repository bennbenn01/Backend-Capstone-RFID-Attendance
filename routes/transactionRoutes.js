import express from 'express'
import transactionController from '../controllers/transactionController.js'
import { verifyToken } from '../config/jwt.js'

const router = express.Router();

router.post('/transaction-data', verifyToken, transactionController.transaction_data);

export default router;