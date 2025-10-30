import jwt from 'jsonwebtoken'
import fs from 'fs'

let jwtSecret;

const dockerSecretPath = '/run/secrets/JWT_SECRET';
const localSecretPath = '../secrets/JWT_SECRET';

if (fs.existsSync(dockerSecretPath)) {
    jwtSecret = fs.readFileSync(dockerSecretPath, 'utf-8');
} else if (fs.existsSync(localSecretPath)) {
    jwtSecret = fs.readFileSync(localSecretPath, 'utf-8');
}

const verifyToken = (req, res, next) => {
    let token;

    if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.sendStatus(401);
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);

        const { id, authType, role } = decoded;

        if (!id || !role) {
            return res.status(400).json({ message: 'Invalid Token' });
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google') {
            return res.sendStatus(401);
        }

        req.user = {
            id,
            authType,
            role
        };

        next();
    } catch (err) {
        return res.sendStatus(403);
    }
}

const verifyRefreshToken = (req, res, next) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
        return res.sendStatus(401);
    }

    try {
        const decoded = jwt.verify(refreshToken, jwtSecret);

        const { id, authType, role } = decoded;

        if (!id || !role) {
            return res.status(400).json({ message: 'Invalid Token' });
        }

        if (role !== 'admin' && role !== 'super-admin' && role !== 'driver') {
            return res.sendStatus(401);
        }

        if (authType !== 'local' && authType !== 'google') {
            return res.sendStatus(401);
        }

        req.user = {
            id,
            full_name: decoded.admin_name || decoded.driver_name,
            authType,
            role
        };

        next();
    } catch (err) {
        return res.sendStatus(403);
    }
}

export {
    verifyToken,
    verifyRefreshToken
}