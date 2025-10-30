import express from 'express'
import { verifyToken } from '../config/jwt.js'
import paymentValidator from '../validator/paymentValidator.js'
import { validateMiddleware } from '../middleware/validationMiddleware.js'
import paymentController from '../controllers/paymentController.js'
import { apiRateLimiter } from '../utils/rateLimiter.js'

const router = express.Router();

// Limiter
/*
router.use('/payment-butaw', apiRateLimiter);
router.use('/payment-boundary', apiRateLimiter);
router.use('/both-payments', apiRateLimiter);
*/
// Routes
router.patch('/payment-butaw', verifyToken, paymentValidator.updatePaymentButaw, validateMiddleware, paymentController.updatePaymentButaw);
router.patch('/payment-boundary', verifyToken, paymentValidator.updatePaymentBoundary, validateMiddleware, paymentController.updatePaymentBoundary);
router.patch('/both-payments', verifyToken, paymentValidator.updatePaymentBoundary, validateMiddleware, paymentController.updateBothPayments);

export default router;