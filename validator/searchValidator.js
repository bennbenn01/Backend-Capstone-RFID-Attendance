import { body } from 'express-validator'

const query = [
    body('query')
        .isString()
        .notEmpty()
];

const dateSearchQuery = [
    body('driver_id')
        .optional(),

    body('full_name')
        .optional(),

    body('from_date')
        .isDate()
        .notEmpty(),
        
    body('to_date')
        .isDate()
        .notEmpty()
];

const checkName = [
    body('fname')
        .notEmpty()
        .optional(),
    body('lname')
        .notEmpty()
        .optional()   
];

const searchValidator = {
    query,
    dateSearchQuery,
    checkName
};

export default searchValidator;