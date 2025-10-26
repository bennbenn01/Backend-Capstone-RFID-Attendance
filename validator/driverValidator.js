import { body } from 'express-validator'

const addInfo = [
    body('dev_id')
        .isString()
        .notEmpty().withMessage('Invalid Request'),,

    body('driver_id')
        .isString()
        .notEmpty().withMessage('Invalid Request'),,

    body('firstName')
        .isString()
        .notEmpty().withMessage('Invalid Request'),,

    body('lastName')
        .isString()
        .notEmpty().withMessage('Invalid Request'),,

    body('contact')
        .isString()
        .notEmpty().withMessage('Invalid Request')
        .matches(/^[0-9]+$/).withMessage('Contact must contain only numbers'),
        
    body('plate_no')
        .isString()
        .notEmpty().withMessage('Invalid Request'),
];

const updateDevice = [
    body('id')
        .isInt()
        .notEmpty(),

    body('dev_id')
        .isString()
        .notEmpty(),

    body('upd_dev_id')
        .optional()
        .isString()
        .notEmpty(),

    body('full_name')
        .isString()
        .notEmpty(),

    body('dev_status_mode')
        .isString()
        .notEmpty()
];

const deleteDevice = [
    body('id')
        .isInt()
        .notEmpty(),

    body('dev_id')
        .isString()
        .notEmpty()
];

const updateDriver = [
    body('id')
        .isInt()
        .notEmpty().withMessage('Invalid Request'),

    body('dev_id')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('driver_id')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('firstName')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('lastName')
        .isString()
        .notEmpty().withMessage('Invalid Request'),

    body('contact')
        .isString()
        .notEmpty().withMessage('Invalid Request')
        .matches(/^[0-9]+$/).withMessage('Contact must contain only numbers'),
        
    body('plate_no')
        .isString()
        .notEmpty().withMessage('Invalid Request'),
];

const driverValidator = {
    addInfo,
    updateDevice,
    deleteDevice,
    updateDriver
};

export default driverValidator;