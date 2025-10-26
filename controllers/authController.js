import { PrismaClient } from "@prisma/client"
import hashPassword from '../utils/hashPassword.js'
import sendEmail from "../utils/sendEmail.js"
import { EmailSendError, DoesExist } from "../utils/customError.js"
import crypto from 'crypto';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import fs from 'fs'
import cron from 'node-cron'

const prisma = new PrismaClient();

let JWT_SECRET;

const dockerSecretPath = '/run/secrets/JWT_SECRET';
const localSecretPath = '../secrets/JWT_SECRET';

if (fs.existsSync(dockerSecretPath)) {
    JWT_SECRET = fs.readFileSync(dockerSecretPath, 'utf-8');
} else if (fs.existsSync(localSecretPath)) {
    JWT_SECRET = fs.readFileSync(localSecretPath, 'utf-8');
}

const isProd = process.env.NODE_ENV === 'production';

const loginAdmin = async (req, res) => {
    try {
        const { admin_name, password } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.admin.findUnique({
                where: { admin_name: admin_name },
                select: {
                    id: true,
                    password: true,
                    authType: true,
                    role: true
                }
            });

            const passwordMatches = user && await bcrypt.compare(password, user.password);

            if (!passwordMatches) {
                throw new Error('UserOrPassMismatch');
            }

            await tx.admin.update({
                where: { id: user.id },
                data: { isActive: true }
            });

            const accessToken = jwt.sign(
                {
                    id: user.id,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie('token', accessToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'None' : 'Lax',
                maxAge: 15 * 60 * 1000,
                path: '/'
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.json({
                authType: user.authType,
                role: user.role
            });
        });
    } catch (err) {
        if (err.message === 'UserOrPassMismatch') {
            return res.status(401).json({ message: 'Invalid user or password! Please try again!' });
        }

        return res.sendStatus(500);
    }
}

const loginGoogleAdmin = async (req, res) => {
    try {
        const { googleId, email } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.admin.findFirst({
                where: {
                    google_id: googleId,
                    email
                },
                select: {
                    id: true,
                    authType: true,
                    role: true
                }
            });

            if (!user) {
                throw new DoesExist();
            }

            await tx.admin.update({
                where: { id: user.id },
                data: { isActive: true }
            });

            const accessToken = jwt.sign(
                {
                    id: user.id,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            )

            res.cookie('token', accessToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'None' : 'Lax',
                maxAge: 15 * 60 * 1000,
                path: '/'
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.json({
                authType: user.authType,
                role: user.role
            });
        });
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }

        return res.sendStatus(500);
    }
}

const changePass = async (req, res) => {
    try {
        const { admin_name } = req.body;

        const existingAdmin = await prisma.admin.findFirst({
            where: { admin_name }
        });

        if (!existingAdmin) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const full_name = `${existingAdmin.fname.trim()} ${existingAdmin.lname.trim()}`;

        await prisma.resetPasswordToken.deleteMany({
            where: { admin_name }
        })

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const rawTempFlag = crypto.randomBytes(32).toString('hex');
        const hashedTempFlag = crypto.createHash('sha256').update(rawTempFlag).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        const record = await prisma.resetPasswordToken.create({
            data: {
                admin_name,
                token: hashedToken,
                tempFlag: hashedTempFlag,
                expiresAt
            }
        })

        const link = `${process.env.EMAIL_CONFIRMED_CHANGE_PASS}/?token=${rawToken}&temp=${rawTempFlag}`;

        try {
            await sendEmail.resetPassword(full_name, link);

            res.status(200).json({
                reqId: record.id,
                allow_change_pass: false
            });
        } catch (err) {
            throw new EmailSendError(err.message);
        }
    } catch (err) {
        if (err instanceof EmailSendError) {
            return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const confirmPass = async (req, res) => {
    try {
        const { admin_name, change_pass, confirm_pass } = req.body;

        const existingAdmin = await prisma.admin.findFirst({
            where: { admin_name }
        });

        if (!existingAdmin) {
            throw new DoesExist();
        }

        if (change_pass !== confirm_pass) {
            throw new Error('ChangeAndConfirmPassMismatch');
        }

        const hashedPassword = await hashPassword(confirm_pass);

        await prisma.admin.update({
            where: { admin_name },
            data: { password: hashedPassword }
        });

        const existingResetData = await prisma.resetPasswordToken.findFirst({
            where: { admin_name }
        });

        await prisma.resetPasswordToken.delete({
            where: { id: existingResetData.id }
        });

        return res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(400).json({ message: err.message });
        }

        if (err.message === 'ChangeAndConfirmPassMismatch') {
            return res.status(401).json({ message: 'Both change and confirm password is mismatched! Please try again!' });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const verifyAdmin = async (req, res) => {
    try {
        const { id, authType, role } = req.user;

        if (!id || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        const user = await prisma.admin.findUnique({
            where: { id },
            select: {
                id: true,
                authType: true,
                role: true,
                isActive: true,
                lastVerified: true
            }
        });

        if (!user || !user.isActive) {
            return res.sendStatus(401);
        }

        await prisma.admin.update({
            where: { id: user.id },
            data: { lastVerified: new Date() }
        });

        return res.json({
            authType: user.authType,
            role: user.role
        });
    } catch (err) {
        res.sendStatus(500);
    }
}

const refreshAuth = async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        const xsrf_token = req.cookies['XSRF-TOKEN'];

        if (!refreshToken || !xsrf_token) {
            return res.sendStatus(401);
        }

        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        const user = await prisma.admin.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                authType: true,
                role: true,
                isActive: true
            }
        });

        if (!user || !user.isActive) {
            return res.sendStatus(401);
        }

        const payload = {
            id: user.id,
            authType: user.authType,
            role: user.role
        }

        const accessToken = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            maxAge: 15 * 60 * 1000,
            path: '/'
        });

        return res.json({
            authType: user.authType,
            role: user.role
        });
    } catch (err) {
        res.sendStatus(500);
    }
}

const logoutAdmin = async (req, res) => {
    try {
        const { id, authType, role } = req.user;

        if (!id || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        await prisma.admin.update({
            where: { id },
            data: { isActive: false }
        })

        res.clearCookie('token', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            maxAge: 0,
            path: '/',
        });

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            maxAge: 0,
            path: '/',
        });

        res.clearCookie('_csrf', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            maxAge: 0,
            path: '/',
        });

        res.clearCookie('XSRF-TOKEN', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'None' : 'Lax',
            maxAge: 0,
            path: '/',
        });

        return res.sendStatus(200);
    } catch (err) {
        res.sendStatus(500);
    }
}

//____________________________//
//                            //
//  --- Background Worker --- //
//                            //
//____________________________//

cron.schedule('5 0,30 * * * *', async () => {
    console.log('Node-Cron Started');

    try {
        const now = new Date();

        const result = await prisma.resetPasswordToken.deleteMany({
            where: {
                expiresAt: {
                    lt: now,
                }
            }
        });

        console.log('Cleaning Up Expired Tokens: ', result.count);
    } catch (err) {
        console.log('Error Cleaning Up Expired Tokens');
    }
});

const auth = {
    loginAdmin,
    loginGoogleAdmin,

    changePass,
    confirmPass,

    verifyAdmin,

    refreshAuth,

    logoutAdmin
}

export default auth;