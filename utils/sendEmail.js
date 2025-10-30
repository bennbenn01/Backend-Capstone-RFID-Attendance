import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config();

let emailPass;

const dockerSecretPath = '/run/secrets/EMAIL_PASSWORD';
const localSecretPath = '../secrets/EMAIL_PASSWORD';

if (fs.existsSync(dockerSecretPath)) {
    emailPass = fs.readFileSync(dockerSecretPath, 'utf-8');
} else if (fs.existsSync(localSecretPath)) {
    emailPass = fs.readFileSync(localSecretPath, 'utf-8');
}

const transportSignUp = nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.MJ_API_KEY_PUBLIC,
        pass: process.env.MJ_API_KEY_PRIVATE
    }
});

const transportResetPassword = nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.MJ_API_KEY_PUBLIC,
        pass: process.env.MJ_API_KEY_PRIVATE
    }
})

async function sendVerification(full_name, token) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_OR_HR_EMAIL,
        subject: 'Sign Up Verification',
        html: `
            <h2>New User Registration Pending</h2>
            <p>Admin name: <strong>${full_name}</strong> has registered and requires verification.</p>
            <p>This is the token below:</p>
            <p style="text-align:center; font-size: 30px; font-weight: bold;">${token}</p>
        `,
    }

    try{
        await transportSignUp.sendMail(mailOptions);
    }catch(err){
        throw new Error('Email sending failed');
    }
    
}

async function sendGoogleVerification(full_name, token) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_OR_HR_EMAIL,
        subject: 'Sign Up Verification',
        html: `
            <h2>New User Registration Pending</h2>
            <p>Email: <strong>${full_name}</strong> account from <strong>Google</strong> has registered and requires verification.</p>
            <p>This is the token below:</p>
            <p style="text-align:center; font-size: 30px; font-weight: bold;">${token}</p>
        `,
    }

    try{
        await transportSignUp.sendMail(mailOptions);
    }catch(err){
        throw new Error('Email sending failed');
    }
    
}

async function sendFacebookVerification(full_name, token) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_OR_HR_EMAIL,
        subject: 'Sign Up Verification',
        html: `
            <h2>New User Registration Pending</h2>
            <p>Email: <strong>${full_name}</strong> account from <strong>Facebook</strong> has registered and requires verification.</p>
            <p>Click the link below to verify the admin:</p>
            <p style="text-align:center; font-size: 30px; font-weight: bold;">${token}</p>
        `,
    }

    try{
        await transportSignUp.sendMail(mailOptions);
    }catch(err){
        throw new Error('Email sending failed');
    }
    
}

async function resetPassword(full_name, link) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_OR_HR_EMAIL,
        subject: 'Confirmation of Reset Password',
        html: `
            <h2>Reset Password Pending</h2>
            <p>A requested to change password of <strong>${full_name}</strong>. Please confirm by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0">
                <a href=${link}
                style="
                    border: 1px solid black;
                    background-color: white;
                    color: black;
                    padding: 10px;
                    text-decoration: none;
                    border-radius: 5px;
                ">Confirm Password Change</a>
            </div>
            <p>If you did not request this, you can safely ignore this email.</p>
        `,
    }

    try {
        await transportResetPassword.sendMail(mailOptions);
        return {
            success: true
        };
    } catch (err) {
        throw new Error('Email sending failed');
    }
}

const sendEmail = {
    sendVerification,
    sendGoogleVerification,
    sendFacebookVerification,
    resetPassword
}

export default sendEmail;