import { body } from "express-validator"

const updatePaymentButaw = [
    body('id')
        .isInt()
        .notEmpty(),
    body('driver_id')
        .isString()
        .notEmpty()
];

const updatePaymentBoundary = [
    body('id')
        .isInt()
        .notEmpty(),
    body('driver_id')
        .isString()
        .notEmpty()
];

const paymentValidator = {
    updatePaymentButaw,
    updatePaymentBoundary
};

export default paymentValidator;