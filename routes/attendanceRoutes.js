import express from 'express'
import { verifyToken } from '../config/jwt.js'
import { csrfProtection } from './csrfRoutes.js'
import attendanceValidator from '../validator/attendanceValidator.js'
import { validateMiddleware } from '../middleware/validationMiddleware.js'
import driverController from '../controllers/attendanceController.js'
import { customizedRateLimiter, apiRateLimiter } from '../utils/rateLimiter.js'

const router = express.Router();

// Limiter
router.use('/attendance-data', apiRateLimiter);
router.use('/register-rfid', customizedRateLimiter.registerRfid);
router.use('/check-status', customizedRateLimiter.checkStatus);
router.use('/time-in', customizedRateLimiter.timeIn);
router.use('/request-logout', customizedRateLimiter.requestLogout);
router.use('/get-pending-logout', apiRateLimiter);
router.use('/check-paid-logout', apiRateLimiter);

// Routes
router.post('/attendance-data', csrfProtection, verifyToken, driverController.attendance_data);
router.post('/get-device', driverController.getDevice);
router.post('/register-rfid', attendanceValidator.driCardRegister, validateMiddleware, driverController.driCardRegister);
router.get('/check-status', attendanceValidator.checkAttendanceStatus, validateMiddleware, driverController.checkAttendanceStatus);

router.get('/time-in', attendanceValidator.timeInAttendance, validateMiddleware, driverController.timeInAttendance);
router.post('/time-in', attendanceValidator.timeInAttendance, validateMiddleware, driverController.timeInAttendance);

router.post('/get-pending-logout', csrfProtection, verifyToken, attendanceValidator.getPendingLogoutConfirmation, validateMiddleware, driverController.getPendingLogoutConfirmation);

router.post('/request-logout', attendanceValidator.reqLogoutConfirmation, validateMiddleware, driverController.reqLogoutConfirmation);
router.get('/request-logout', attendanceValidator.reqLogoutConfirmation, validateMiddleware, driverController.reqLogoutConfirmation);

router.patch('/check-paid-logout', csrfProtection, verifyToken, attendanceValidator.checkPaidLogout, validateMiddleware, driverController.checkPaidLogout);

export default router;