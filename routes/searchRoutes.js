import express from 'express'
import { verifyToken } from '../config/jwt.js'
import { csrfProtection } from './csrfRoutes.js'
import searchValidator from '../validator/searchValidator.js'
import { validateMiddleware } from '../middleware/validationMiddleware.js'
import searchController from '../controllers/searchController.js'
import { customizedRateLimiter } from '../utils/rateLimiter.js'

const router = express.Router();

// Limiter
router.use('/check-name', customizedRateLimiter.searchQuery);
router.use('/query', customizedRateLimiter.searchQuery);
router.use('/date-search', customizedRateLimiter.searchQuery);
router.use('/all-date-search', customizedRateLimiter.searchQuery);

// Routes
router.post('/check-name', searchValidator.checkName, validateMiddleware, searchController.checkNameAvailability);

router.post('/query', csrfProtection, verifyToken, searchValidator.query, validateMiddleware, searchController.searchQuery);
router.post('/date-search', csrfProtection, verifyToken,  searchValidator.dateSearchQuery, validateMiddleware, searchController.dateSearchQuery);
router.post('/all-date-search', csrfProtection, verifyToken, searchValidator.dateSearchQuery, validateMiddleware, searchController.dateSearchQuery);

export default router;
