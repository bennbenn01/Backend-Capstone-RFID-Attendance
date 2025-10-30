import express from 'express'
import userValidation from '../validator/userValidator.js'
import { passwordValidation, validateMiddleware } from '../middleware/validationMiddleware.js'
import userController from '../controllers/userController.js'
import { userRateLimiter } from '../utils/rateLimiter.js'

const router = express.Router();

// Limiter
/*
router.use('/sign-up', userRateLimiter);
router.use('/google-sign-up', userRateLimiter);
router.use('/verify-email', userRateLimiter);
*/
// Routes
router.post('/sign-up', userValidation.createAdmin, passwordValidation, userController.createAdmin);
router.post('/driver-sign-up', userController.createDriver);
router.post('/google-sign-up', userValidation.createGoogleAdmin, validateMiddleware, userController.createGoogleAdmin);
router.post('/driver-google-sign-up', userController.createGoogleDriverAdmin);

router.post('/verify-email', userValidation.verifyAdmin, validateMiddleware, userController.verifyAdmin);
router.post('/verify-google-email', userValidation.verifyGoogleAdmin, validateMiddleware, userController.verifyGoogleAdmin);

export default router;