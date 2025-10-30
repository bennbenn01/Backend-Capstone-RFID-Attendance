import { PrismaClient } from "@prisma/client"
import hashPassword from '../utils/hashPassword.js'
import generateNumericToken from '../utils/generateToken.js'
import sendEmail from "../utils/sendEmail.js"
import { EarlyResponse, EmailSendError } from '../utils/customError.js'
import cron from 'node-cron'
const prisma = new PrismaClient();

const createAdmin = async (req, res) => {
    try {
        const { fname, lname, admin_name, email, contact, password, confirm_pass } = req.body;
        const token = generateNumericToken();

        if (!fname || !lname || !admin_name || !email || !contact || !password || !confirm_pass) {
            throw new Error('MissingInputs');
        }

        if (password !== confirm_pass) {
            throw new Error('PasswordMismatched');
        }

        const full_name = `${fname.trim()} ${lname.trim()}`;

        const existingAdmin = await prisma.admin.findFirst({
            where: { 
                AND: [
                    { fname, lname }
                ],
                OR: [
                    { email },
                    { admin_name }
                ]
            }
        });

        if (existingAdmin) {
            if (existingAdmin.verified) {
                throw new Error('AccountAlreadyExists');
            }
            throw new EarlyResponse(202, 'Email Pending Verification');
        }

        try {
            await sendEmail.sendVerification(full_name, token);
        } catch (err) {
            throw new EmailSendError(err.message);
        }

        const existToken = await prisma.token.findUnique({
            where: { admin_name: admin_name }
        });

        if (existToken && existToken.expiresAt > new Date()) {
            throw new Error('AccountAlreadyExists');
        }

        if (existToken && existToken.expiresAt <= new Date()) {
            await prisma.token.delete({ where: { admin_name } });
        }

        await prisma.token.create({
            data: {
                fname,
                lname,
                admin_name,
                email,
                contact,
                role: 'admin',
                token,
                password: await hashPassword(password),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            }
        });

        res.sendStatus(201);
    } catch (err) {
        if (err.message === 'MissingInputs') {
            return res.status(400).json({ message: 'Invalid Request' });
        }

        if (err.message === 'PasswordMismatched') {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        
        if (err instanceof EarlyResponse) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'AccountAlreadyExists') {
            return res.status(409).json({ message: 'Account already exist! Please try again' });
        }
        if (err instanceof EmailSendError) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const createDriver = async (req, res) => {
    try {
        const { fname, lname, driver_name, email, contact, password, confirm_pass } = req.body;

        const token = generateNumericToken();

        if (!fname || !lname || !driver_name || !email || !contact || !password || !confirm_pass) {
            throw new Error('MissingInputs');
        }

        if (password !== confirm_pass) {
            throw new Error('PasswordMismatched');
        }

        const full_name = `${fname.trim()} ${lname.trim()}`;

        const existingAdmin = await prisma.driverAcc.findFirst({
            where: { 
                OR: [
                    { email },
                    { driver_name }
                ]
            }
        });

        if (existingAdmin) {
            if (existingAdmin.verified) {
                throw new Error('AccountAlreadyExists');
            }
            throw new EarlyResponse(202, 'Email Pending Verification');
        }

        try {
            await sendEmail.sendVerification(full_name, token);
        } catch (err) {
            throw new EmailSendError(err.message);
        }

        const existToken = await prisma.token.findUnique({
            where: { admin_name: driver_name }
        });

        if (existToken && existToken.expiresAt > new Date()) {
            throw new Error('AccountAlreadyExists');
        }

        if (existToken && existToken.expiresAt <= new Date()) {
            await prisma.token.delete({ where: { admin_name: driver_name } });
        }

        await prisma.token.create({
            data: {
                fname,
                lname,
                admin_name: driver_name,
                email,
                contact,
                role: 'driver',
                token,
                password: await hashPassword(password),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            }
        });

        res.sendStatus(201);
    } catch (err) {
        if (err.message === 'MissingInputs') {
            return res.status(400).json({ message: 'Invalid Request' });
        }

        if (err.message === 'PasswordMismatched') {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        
        if (err instanceof EarlyResponse) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'AccountAlreadyExists') {
            return res.status(409).json({ message: 'Account already exist! Please try again' });
        }
        if (err instanceof EmailSendError) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const createGoogleAdmin = async (req, res) => {
    try {
        const { googleId, email, fname, lname } = req.body;
        const token = generateNumericToken();

        if (!googleId || !email || !fname || !lname) {
            throw new Error('MissingInputs')
        }

        const full_name = `${fname.trim()} ${lname.trim()}`;

        const existingAdmin = await prisma.admin.findFirst({
            where: {
                OR: [
                    { google_id: googleId },
                    { email }
                ] 
            }
        });
    
        const existingDriverAdmin = await prisma.driverAcc.findFirst({
            where: {
                OR: [
                    { google_id: googleId },
                    { email }
                ] 
            }
        });

        if (existingAdmin || existingDriverAdmin) {
            if ((existingAdmin && existingAdmin.verified) || (existingDriverAdmin && existingDriverAdmin.verified)) {
                throw new Error('AccountAlreadyExists');
            }
            throw new EarlyResponse(202, 'Email Pending Verification');
        }

        try {
            await sendEmail.sendGoogleVerification(full_name, token);
        } catch (err) {
            throw new EmailSendError(err.message);
        }

        const existToken = await prisma.token.findUnique({
            where: { google_id: googleId }
        });

        if (existToken && existToken.expiresAt > new Date()) {
            throw new Error('AccountAlreadyExists');
        }

        if (existToken && existToken.expiresAt <= new Date()) {
            await prisma.token.delete({ where: { admin_name } });
        }

        await prisma.token.create({
            data: {
                google_id: googleId,
                fname,
                lname,
                email,
                token,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                role: 'admin',
            }
        });

        res.sendStatus(201);
    } catch (err) {
        if (err.message === 'MissingInputs') {
            return res.status(400).json({ message: 'Invalid Request' });
        }

        if (err instanceof EarlyResponse) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'AccountAlreadyExists') {
            return res.status(409).json({ message: 'Account already exist! Please try again' });
        }
        if (err instanceof EmailSendError) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const createGoogleDriverAdmin = async (req, res) => {
    try {
        const { googleId, email, fname, lname } = req.body;
        const token = generateNumericToken();

        if (!googleId || !email || !fname || !lname) {
            throw new Error('MissingInputs')
        }

        const full_name = `${fname.trim()} ${lname.trim()}`;

        const existingAdmin = await prisma.admin.findFirst({
            where: {
                OR: [
                    { google_id: googleId },
                    { email }
                ] 
            }
        });
    
        const existingDriverAdmin = await prisma.driverAcc.findFirst({
            where: {
                OR: [
                    { google_id: googleId },
                    { email }
                ] 
            }
        });

        if (existingAdmin || existingDriverAdmin) {
            if ((existingAdmin && existingAdmin.verified) || (existingDriverAdmin && existingDriverAdmin.verified)) {
                throw new Error('AccountAlreadyExists');
            }
            throw new EarlyResponse(202, 'Email Pending Verification');
        }

        try {
            await sendEmail.sendGoogleVerification(full_name, token);
        } catch (err) {
            throw new EmailSendError(err.message);
        }

        const existToken = await prisma.token.findUnique({
            where: { google_id: googleId }
        });

        if (existToken && existToken.expiresAt > new Date()) {
            throw new Error('AccountAlreadyExists');
        }

        if (existToken && existToken.expiresAt <= new Date()) {
            await prisma.token.delete({ where: { admin_name } });
        }

        await prisma.token.create({
            data: {
                google_id: googleId,
                fname,
                lname,
                email,
                token,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                role: 'driver',
            }
        });

        res.sendStatus(201);
    } catch (err) {
        if (err.message === 'MissingInputs') {
            return res.status(400).json({ message: 'Invalid Request' });
        }

        if (err instanceof EarlyResponse) {
            return res.status(err.status).json({ message: err.message });
        }

        if (err.message === 'AccountAlreadyExists') {
            return res.status(409).json({ message: 'Account already exist! Please try again' });
        }
        if (err instanceof EmailSendError) {
            return res.status(400).json({ message: err.message });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const verifyAdmin = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'No token was received' });
        }

        await prisma.$transaction(async (tx) => {
            const [tempToken] = await tx.$queryRaw`
                SELECT * FROM \`Token\`
                WHERE token = ${token}
                FOR UPDATE
            `;

            if (!tempToken) {
                throw new Error('InvalidOrExpiredToken');
            }

            const createData = {
                google_id: tempToken.google_id,
                fname: tempToken.fname,
                lname: tempToken.lname,
                email: tempToken.email,
                contact: tempToken.contact,
                password: tempToken.password,
                authType: 'google',
                verified: true,
            }

            const role = tempToken.role;

            if (role === 'admin') {
                await tx.admin.create({
                    data: {
                        ...createData,
                        admin_name: tempToken.admin_name,
                        role: 'admin',
                    },
                });
            } else if (role === 'driver') {
                await tx.driverAcc.create({
                    data: {
                        ...createData,
                        driver_name: tempToken.admin_name, 
                        role: 'driver',
                    },
                });
            } else {
                throw new Error('InvalidRole');
            }

            await tx.token.delete({
                where: { token: parseInt(token, 10) }
            });
        });

        res.sendStatus(200);
    } catch (err) {
        if (err.message === 'InvalidOrExpiredToken') {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        if (err.message === 'InvalidRole') {
        return res.status(400).json({ message: 'Invalid role in token' });
        }
        
        res.status(500).json({ message: 'Internal Error' });
    }
}

const verifyGoogleAdmin = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'No token was received' });
        }

        await prisma.$transaction(async (tx) => {
            const [tempToken] = await tx.$queryRaw`
                SELECT * FROM \`Token\`
                WHERE token = ${token}
                FOR UPDATE
            `;

            if (!tempToken) {
                throw new Error('InvalidOrExpiredToken');
            }

            const createData = {
                google_id: tempToken.google_id, 
                fname: tempToken.fname,
                lname: tempToken.lname,
                email: tempToken.email,
                contact: tempToken.contact,
                password: tempToken.password,
                authType: 'google',
                verified: true,
            }

            const role = tempToken.role;

            if (role === 'admin') {
                await tx.admin.create({
                    data: {
                        ...createData,
                        google_id: tempToken.google_id,
                        role: 'admin',
                    },
                });
            } else if (role === 'driver') {
                await tx.driverAcc.create({
                    data: {
                        ...createData,
                        google_id: tempToken.google_id, 
                        role: 'driver',
                    },
                });
            } else {
                throw new Error('InvalidRole');
            }

            await tx.token.delete({
                where: { token: parseInt(token, 10) }
            });
        });

        res.sendStatus(200);
    } catch (err) {
        if (err.message === 'InvalidOrExpiredToken') {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
        if (err.message === 'InvalidRole') {
            return res.status(400).json({ message: 'Invalid role in token' });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal Error' });
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

        const result = await prisma.token.deleteMany({
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

const userController = {
    createAdmin,
    createGoogleAdmin,
    createDriver,
    createGoogleDriverAdmin,
    verifyAdmin,
    verifyGoogleAdmin,
}

export default userController;