import express from 'express'
import { verifyToken } from '../config/jwt.js'
import dataAnalyticsController from '../controllers/dataAnalyticsController.js'
import { apiRateLimiter } from '../utils/rateLimiter.js'

const router = express.Router();

// Limiter
/*
router.use('/data', apiRateLimiter);
*/
// Routes
router.post('/data', verifyToken, dataAnalyticsController.data_analytics_data);

export default router;