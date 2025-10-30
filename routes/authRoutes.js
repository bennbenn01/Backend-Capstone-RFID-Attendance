import express from 'express'
import authValidator from '../validator/authValidator.js'
import { passwordValidation, validateMiddleware } from '../middleware/validationMiddleware.js'
import { verifyToken, verifyRefreshToken } from '../config/jwt.js'
import auth from '../controllers/authController.js'
import { PrismaClient } from '@prisma/client'
import { authRateLimiter, customizedRateLimiter, apiRateLimiter } from '../utils/rateLimiter.js'
import crypto from 'crypto'

const prisma = new PrismaClient();

const router = express.Router();

// Limiter
/*
router.use('/login', authRateLimiter);
router.use('/google-login', authRateLimiter);

router.use('/change-pass', authRateLimiter);
router.use('/email-confirmed-change-pass', customizedRateLimiter.emailToken);
router.use('/confirm-pass', apiRateLimiter);

router.use('/verify-user', apiRateLimiter);

router.use('/refresh', apiRateLimiter);

router.use('/logout', apiRateLimiter);
*/
// Routes
router.post('/admin-data', verifyToken, auth.admin_data);

router.post('/super-login', auth.loginSuperAdmin);

router.post('/login', authValidator.loginAdmin, validateMiddleware, auth.loginAdmin);
router.post('/driver-login', auth.loginDriver);

router.post('/google-login', authValidator.loginGoogleAdmin, validateMiddleware, auth.loginGoogleAdmin);
router.post('/driver-google-login', authValidator.loginGoogleAdmin, validateMiddleware, auth.loginDriverGoogleAdmin);

// Admin
router.post('/change-pass', authValidator.changePass, validateMiddleware, auth.changePass);
router.post('/check-pass', async (req, res) => {
    const { admin_name, reqId } = req.body;

    if (!admin_name || !reqId) {
        return res.status(400).json({ allow_change_pass: false });
    }

    try {
        const record = await prisma.resetPasswordToken.findFirst({
            where: {
                admin_name,
                id: reqId
            }
        });

        const now = new Date();

        const allow_change_pass = record && record.confirmed && record.expiresAt > now;

        return res.status(200).json({ allow_change_pass });
    } catch (err) {
        return res.status(500).json({ allow_change_pass: false });
    }
});
router.get('/email-confirmed-change-pass', async (req, res) => {
    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { token, temp } = req.query;

    if (!token || !temp) {
        return res.send(`
            <html>
                <head>
                    <title>Invalid Request</title>
                    <meta name="viewport" content="width=device-width" />
                    <style>
                        body {
                            background-color: rgb(5, 113, 157);
                            color: white;
                            margin-top: 50px;
                            text-align: center;
                            font-family: sans-serif;
                        }
                    </style>
                </head>
                <body>
                    <h2>Invalid Request</h2>
                </body>
            </html>      
        `);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const hashedTempFlag = crypto.createHash('sha256').update(temp).digest('hex');

    const record = await prisma.resetPasswordToken.findFirst({
        where: {
            token: hashedToken,
            tempFlag: hashedTempFlag
        }
    });

    if (!record || record.confirmed || record.expiresAt < new Date()) {
        return res.send(`
            <html>
                <head>
                    <title>Invalid Link</title>
                    <meta name="viewport" content="width=device-width" />
                    <style>
                        body {
                            background-color: rgb(5, 113, 157);
                            color: white;
                            margin-top: 50px;
                            text-align: center;
                            font-family: sans-serif;
                        }
                    </style>
                </head>
                <body>
                    <h2>Link Invalid or Expired</h2>
                    <p>This link is no longer valid!</p>
                </body>
            </html>
        `);
    }

    await prisma.resetPasswordToken.update({
        where: { id: record.id },
        data: {
            token: '',
            tempFlag: '',
            confirmed: true
        }
    });

    return res.send(`
        <html>
            <head>
                <title>Confirmed Link</title>
                <meta name="viewport" content="width=device-width" />
            </head>
            <body style="background-color: rgb(5, 113, 157); color: white; margin-top: 50px; text-align: center; font-family: sans-serif;">
                <h2>Link Confirmed</h2>
                <p>The password reset has been approved.</p>
            </body>
        </html>
    `);
});
router.post('/confirm-pass', authValidator.confirmPass, passwordValidation, auth.confirmPass);

// Driver
router.post('/driver-change-pass', auth.driverChangePass);
router.post('/driver-check-pass', async (req, res) => {
    const { driver_name, reqId } = req.body;

    if (!driver_name || !reqId) {
        return res.status(400).json({ allow_change_pass: false });
    }

    try {
        const record = await prisma.resetPasswordToken.findFirst({
            where: {
                admin_name: driver_name,
                id: reqId
            }
        });

        const now = new Date();

        const allow_change_pass = record && record.confirmed && record.expiresAt > now;

        return res.status(200).json({ allow_change_pass });
    } catch (err) {
        return res.status(500).json({ allow_change_pass: false });
    }
});
router.get('/driver-email-confirmed-change-pass', async (req, res) => {
    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { token, temp } = req.query;

    if (!token || !temp) {
        return res.send(`
            <html>
                <head>
                    <title>Invalid Request</title>
                    <meta name="viewport" content="width=device-width" />
                    <style>
                        body {
                            background-color: rgb(5, 113, 157);
                            color: white;
                            margin-top: 50px;
                            text-align: center;
                            font-family: sans-serif;
                        }
                    </style>
                </head>
                <body>
                    <h2>Invalid Request</h2>
                </body>
            </html>      
        `);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const hashedTempFlag = crypto.createHash('sha256').update(temp).digest('hex');

    const record = await prisma.resetPasswordToken.findFirst({
        where: {
            token: hashedToken,
            tempFlag: hashedTempFlag
        }
    });

    if (!record || record.confirmed || record.expiresAt < new Date()) {
        return res.send(`
            <html>
                <head>
                    <title>Invalid Link</title>
                    <meta name="viewport" content="width=device-width" />
                    <style>
                        body {
                            background-color: rgb(5, 113, 157);
                            color: white;
                            margin-top: 50px;
                            text-align: center;
                            font-family: sans-serif;
                        }
                    </style>
                </head>
                <body>
                    <h2>Link Invalid or Expired</h2>
                    <p>This link is no longer valid!</p>
                </body>
            </html>
        `);
    }

    await prisma.resetPasswordToken.update({
        where: { id: record.id },
        data: {
            token: '',
            tempFlag: '',
            confirmed: true
        }
    });

    return res.send(`
        <html>
            <head>
                <title>Confirmed Link</title>
                <meta name="viewport" content="width=device-width" />
            </head>
            <body style="background-color: rgb(5, 113, 157); color: white; margin-top: 50px; text-align: center; font-family: sans-serif;">
                <h2>Link Confirmed</h2>
                <p>The password reset has been approved.</p>
            </body>
        </html>
    `);
});
router.post('/driver-confirm-pass', auth.driverConfirmPass);


router.post('/verify-user', verifyToken, auth.verifyAdmin);

router.post('/refresh', verifyRefreshToken, auth.refreshAuth);

router.patch('/update-admin', verifyToken, validateMiddleware, auth.updateAdmin);
router.delete('/delete-admin', verifyToken, validateMiddleware, auth.deleteAdmin);

router.post('/logout', verifyToken, auth.logoutAdmin);

export default router;