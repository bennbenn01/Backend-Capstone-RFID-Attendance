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

        if (existingAdmin) {
            if (existingAdmin.verified) {
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

            await tx.admin.create({
                data: {
                    fname: tempToken.fname,
                    lname: tempToken.lname,
                    admin_name: tempToken.admin_name,
                    email: tempToken.email,
                    contact: tempToken.contact,
                    password: tempToken.password,
                    authType: 'local',
                    role: 'admin',
                    verified: true
                }
            });

            await tx.token.delete({
                where: { token: parseInt(token, 10) }
            });
        });

        res.sendStatus(200);
    } catch (err) {
        if (err.message === 'InvalidOrExpiredToken') {
            return res.status(400).json({ message: 'Invalid or expired token' });
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

            await tx.admin.create({
                data: {
                    google_id: tempToken.google_id,
                    email: tempToken.email,
                    fname: tempToken.fname,
                    lname: tempToken.lname,
                    authType: 'google',
                    role: 'admin',
                    verified: true
                }
            });

            await tx.token.delete({
                where: { token: parseInt(token, 10) }
            });
        });

        res.sendStatus(200);
    } catch (err) {
        if (err.message === 'InvalidOrExpiredToken') {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
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
    verifyAdmin,
    verifyGoogleAdmin
}

export default userController;