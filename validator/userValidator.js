import { body } from 'express-validator'

const createAdmin = [
    body('fname')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('lname')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('admin_name')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('email')
        .isEmail().withMessage('Must be an valid email')
        .notEmpty().withMessage('Invalid Request'),

    body('contact')
        .isString()
        .notEmpty().withMessage('Invalid Request')
        .matches(/^[0-9]+$/).withMessage('Contact must contain only numbers'),

    body('password')
        .isStrongPassword({
            minLength: 8,
            minLowercase: 0,
            minUppercase: 1,
            minNumbers: 0,
            minSymbols: 1
        }).withMessage('Password must be at least 8 characters long and include at least one uppercase letter and one symbol')
        .notEmpty().withMessage('Invalid Request'),
        
    body('confirm_pass')
        .custom((value, { req }) => value === req.body.password).withMessage('Confirm password must be the same as password')
        .notEmpty().withMessage('Invalid Request'),
];

const createGoogleAdmin = [
    body('googleId')
        .isString()
        .notEmpty(),

    body('email')
        .isEmail()
        .notEmpty(),

    body('fname')
        .isString()
        .notEmpty(),
    
    body('lname')
        .isString()
        .notEmpty()
];

const verifyAdmin = [
    body('token')
        .isInt()
        .notEmpty()
];

const verifyGoogleAdmin = [
    body('token')
        .isInt()
        .notEmpty()
];

const userValidation = {
    createAdmin,
    createGoogleAdmin,
    verifyAdmin,
    verifyGoogleAdmin,
};

export default userValidation;