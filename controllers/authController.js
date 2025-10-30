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

const admin_data = async (req, res) => {
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

        const rawPage = parseInt(req.body.page);
        const safePage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
        const take = 10;

        const totalCount = await prisma.admin.count({
            where: { role: 'admin' }
        });
        const totalPages = Math.max(Math.ceil(totalCount / take), 1);

        const validPage = Math.max(1, Math.min(safePage, totalPages));
        const skip = (validPage - 1) * take;

        const admins = await prisma.admin.findMany({
            skip,
            take,
            where: { 
                role: 'admin',
                isDeleted: false 
            }
        });

        res.status(200).json({
            admins,
            totalPages,
            currentPage: validPage            
        })
    } catch (err) {
        res.status(500).json({ message: 'Internal Error' });
    }
}

const loginSuperAdmin = async (req, res) => {
    try {
        const { admin_name, password } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.admin.findFirst({
                where: { admin_name: admin_name },
                select: {
                    id: true,
                    admin_name: true,
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
                    full_name: user.admin_name,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    full_name: user.admin_name,
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
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/'
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
        
        return res.status(500).json({ message: 'Internal Error' });
    }
}

const loginAdmin = async (req, res) => {
    try {
        const { admin_name, password } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.admin.findFirst({
                where: { 
                    admin_name: admin_name,
                    isDeleted: false
                },
                select: {
                    id: true,
                    admin_name: true, 
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
                    full_name: user.admin_name,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    full_name: user.admin_name,
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
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/'
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

        return res.status(500).json({ message: 'Internal Error' });
    }
}

const loginDriver = async (req, res) => {
  try {
        const { admin_name, password } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.driverAcc.findFirst({
                where: { 
                    driver_name: admin_name,
                    isDeleted: false,
                    role: 'driver'
                },
                select: {
                    id: true,
                    driver_name: true,
                    password: true,
                    authType: true,
                    role: true
                }
            });

            const passwordMatches = user && await bcrypt.compare(password, user.password);

            if (!passwordMatches) {
                throw new Error('UserOrPassMismatch');
            }

            await tx.driverAcc.update({
                where: { id: user.id },
                data: { isActive: true }
            });

            const accessToken = jwt.sign(
                {
                    id: user.id,
                    full_name: user.driver_name,
                    authType: user.authType,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    full_name: user.driver_name,
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
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/'
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

        return res.status(500).json({ message: 'Internal Error' });
    }    
}

const loginGoogleAdmin = async (req, res) => {
    try {
        const { googleId, email } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.admin.findFirst({
                where: {
                    google_id: googleId,
                    email,
                    role: 'admin'
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

const loginDriverGoogleAdmin = async (req, res) => {
    try {
        const { googleId, email } = req.body;

        await prisma.$transaction(async (tx) => {
            const user = await tx.driverAcc.findFirst({
                where: {
                    google_id: googleId,
                    email,
                    role: 'driver'
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

            await tx.driverAcc.update({
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

// Admin
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

// Driver
const driverChangePass = async (req, res) => {
    try {
        const { driver_name } = req.body;

        const existingAdmin = await prisma.driverAcc.findFirst({
            where: { driver_name }
        });

        if (!existingAdmin) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const full_name = `${existingAdmin.fname.trim()} ${existingAdmin.lname.trim()}`;

        await prisma.resetPasswordToken.deleteMany({
            where: { admin_name: driver_name }
        })

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const rawTempFlag = crypto.randomBytes(32).toString('hex');
        const hashedTempFlag = crypto.createHash('sha256').update(rawTempFlag).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        const record = await prisma.resetPasswordToken.create({
            data: {
                admin_name: driver_name,
                token: hashedToken,
                tempFlag: hashedTempFlag,
                expiresAt
            }
        })

        const link = `${process.env.DRIVER_EMAIL_CONFIRMED_CHANGE_PASS}/?token=${rawToken}&temp=${rawTempFlag}`;

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

const driverConfirmPass = async (req, res) => {
    try {
        const { driver_name, change_pass, confirm_pass } = req.body;

        const existingAdmin = await prisma.driverAcc.findFirst({
            where: { driver_name }
        });

        if (!existingAdmin) {
            throw new DoesExist();
        }

        if (change_pass !== confirm_pass) {
            throw new Error('ChangeAndConfirmPassMismatch');
        }

        const hashedPassword = await hashPassword(confirm_pass);

        await prisma.driverAcc.update({
            where: { driver_name },
            data: { password: hashedPassword }
        });

        const existingResetData = await prisma.resetPasswordToken.findFirst({
            where: { admin_name: driver_name }
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

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        let user;

        if (role === 'driver') {
            user = await prisma.driverAcc.findUnique({
                where: { id },
                select: {
                    id: true,
                    authType: true,
                    role: true,
                    isActive: true
                }
            });
        } else {
            user = await prisma.admin.findUnique({
                where: { id },
                select: {
                    id: true,
                    authType: true,
                    role: true,
                    isActive: true
                }
            });
        }

        if (!user || !user.isActive) {
            return res.sendStatus(401);
        }

        if (user.role === "admin" || user.role === "super-admin") {
            await prisma.admin.update({
                where: { id: user.id },
                data: { lastVerified: new Date() },
            });
        } else if (user.role === "driver") {
            await prisma.driverAcc.update({
                where: { id: user.id },
                data: { lastVerified: new Date() },
            });
        }

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
        const { id, full_name } = req.user;
        const refreshToken = req.cookies.refresh_token;

        if (!id || !refreshToken) {
            return res.sendStatus(401);
        }

        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        let user = 
            (await prisma.admin.findFirst({
                where: { 
                    id: decoded.id,
                    admin_name: decoded.full_name
                },
                select: { id: true, admin_name: true, authType: true, role: true, isActive: true },
            })) 
            ||
            (await prisma.driverAcc.findUnique({
                where: { 
                    id: decoded.id,
                    driver_name: decoded.full_name
                },
                select: { id: true, driver_name: true, authType: true, role: true, isActive: true },
            }));

        console.log('Refresh Token', user);

        if (!user || !user.isActive) {
            return res.sendStatus(401);
        }

        const payload = {
            id: user.id,
            full_name: user.admin_name || user.driver_name,
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

const updateAdmin = async (req, res) => {
    try {
        const { id: userId, authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        const { id, fname, lname, email, admin_name, contact } = req.body;

        if (!fname || !lname || !email || !admin_name || !contact) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const doesExist = await prisma.admin.findFirst({
            where: { id }
        });

        if (!doesExist) {
            throw new DoesExist();
        }

        const updateData = {
            fname, 
            lname, 
            email, 
            admin_name, 
            contact
        }; 

        await prisma.admin.update({
            where: { id },
            data: updateData
        });

        return res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const deleteAdmin = async (req, res) => {
    try {
        const userId = req.user.id;
        const { authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        } 

        const { id } = req.body;

        const isExist = await prisma.admin.findUnique({
            where: { 
                id,
                isDeleted: false 
            }
        })

        if (!isExist) {
            throw new DoesExist();
        }
       
        await prisma.admin.update({
            where: { id },
            data: { isDeleted: true }
        });

       return res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }

        res.status(500).json({ message: 'Internal Error' });
    }
}

const updateDriver = async (req, res) => {
    try {
        const { id: userId, authType, role } = req.user;

        if (!userId || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }        

        const { id, fname, lname, email, driver_name, contact } = req.body;

        const doesExist = await prisma.admin.findFirst({
            where: { id }
        });

        if (!doesExist) {
            throw new DoesExist();
        }

        const updateData = {
            fname, 
            lname, 
            email, 
            driver_name, 
            contact
        }; 

        await prisma.driverAcc.update({
            where: { id },
            data: updateData
        });

        return res.sendStatus(200);
    } catch (err) {
        res.status(500).json({ messsage: 'Internal Error' });
    }
}

const deleteDriver = async (req, res) => {
    try {
        const { id } = req.body;

        const isExist = await prisma.driverAcc.findUnique({
            where: { 
                id,
                isDeleted: false 
            }
        });

        if (!isExist) {
            throw new DoesExist();
        }

        await prisma.driverAcc.update({
            where: { id },
            data: { isDeleted: true }
        });

        return res.sendStatus(200);
    } catch (err) {
        if (err instanceof DoesExist) {
            return res.status(err.status).json({ message: err.message });
        }

        res.status(500).json({ messsage: 'Internal Error' });
    }
}

const logoutAdmin = async (req, res) => {
    try {
        const { id, authType, role } = req.user;

        if (!id || !authType || !role) {
            return res.sendStatus(401);
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (!['local', 'google'].includes(authType)) {
            return res.sendStatus(401);
        }

        if (role === 'super-admin' || role === 'admin') {
            await prisma.admin.update({
                where: { id },
                data: { isActive: false },
            });
        } else if (role === 'driver') {
            await prisma.driverAcc.update({
                where: { id },
                data: { isActive: false },
            });
        } else {
            return res.sendStatus(401);
        }

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
    admin_data,

    loginSuperAdmin,
    loginAdmin,
    loginDriver,
    loginGoogleAdmin,
    loginDriverGoogleAdmin,

    changePass,
    confirmPass,

    driverChangePass,
    driverConfirmPass,

    verifyAdmin,

    refreshAuth,

    updateAdmin,
    deleteAdmin,

    updateDriver,
    deleteDriver,

    logoutAdmin
}

export default auth;