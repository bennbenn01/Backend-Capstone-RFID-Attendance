import { body } from 'express-validator'

const loginAdmin = [
    body('admin_name')
        .isString()
        .notEmpty(),
        
    body('password')
        .notEmpty()
];

const loginGoogleAdmin = [
    body('googleId')
        .isString()
        .notEmpty(),

    body('email')
        .isEmail()
        .notEmpty()
];

const changePass = [
    body('admin_name')
        .isString()
        .notEmpty()
];

const confirmPass = [
    body('admin_name')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('change_pass')
        .isStrongPassword({
            minLength: 8,
            minLowercase: 0,
            minUppercase: 1,
            minNumbers: 0,
            minSymbols: 1
        }).withMessage('Password must be at least 8 characters long and include at least one uppercase letter and one symbol')
        .notEmpty().withMessage('Invalid Request'),

    body('confirm_pass')
        .custom((value, { req }) => value === req.body.change_pass).withMessage('Confirm password must be the same as password')
        .notEmpty().withMessage('Invalid Request'),
];

const authValidator = {
    loginAdmin,
    loginGoogleAdmin,
    changePass,
    confirmPass
};

export default authValidator;