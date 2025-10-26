import { validationResult } from 'express-validator'

export const driverValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
    }

    next();
}

export const passwordValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ pass_validator: errors.array()[0].msg })
    }

    next();
}

export const validateMiddleware = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Invalid Request'
        })
    }

    next();
}