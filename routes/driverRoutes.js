import express from 'express'
import { verifyToken } from '../config/jwt.js'
import driverValidator from '../validator/driverValidator.js'
import upload from '../middleware/uploadMiddleware.js'
import { driverValidation, validateMiddleware } from '../middleware/validationMiddleware.js'
import driverController from '../controllers/driverController.js'
import { apiRateLimiter } from '../utils/rateLimiter.js'

const router = express.Router();

// Limiter
/*
router.use('/dashboard-data', apiRateLimiter);
router.use('/manage-user-data', apiRateLimiter);
router.use('/add-info', apiRateLimiter);
router.use('/update-device', apiRateLimiter);
router.use('/delete-device', apiRateLimiter);
router.use('/update-driver', apiRateLimiter);
*/
// Routes
router.post('/dashboard-data', verifyToken, driverController.dashboard_data);
router.post('/manage-users-data', verifyToken, driverController.manage_users_data);

router.post('/add-info', verifyToken, upload.single('driver_img'), driverValidator.addInfo, driverValidation, driverController.addInfo);
router.patch('/update-device', verifyToken, driverValidator.updateDevice, validateMiddleware, driverController.updateDevice);
router.delete('/delete-device', verifyToken, driverValidator.deleteDevice, validateMiddleware, driverController.deleteDevice);

router.patch('/update-driver', verifyToken, upload.single('driver_img'), driverValidator.updateDriver, driverValidation, driverController.updateDriver);

router.post('/dashboard-driver-info', verifyToken, driverController.dashboardDriverInfo);
router.post('/dashboard-request-leave', verifyToken, driverController.dashboardDriverRequestLeave);
router.post('/dashboard-confirm-request-leave', verifyToken, driverController.confirmRequestLeave);

export default router;