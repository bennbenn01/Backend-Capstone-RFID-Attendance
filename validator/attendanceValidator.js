import { body, query } from 'express-validator'

const driCardRegister = [
    body('card_id')
        .isString()
        .notEmpty(),

    body('device_id')
        .isString()
        .notEmpty()
];

const checkAttendanceStatus = [
    query('card_id')
        .isString()
        .notEmpty()
];

const timeInAttendance = [
    body() ? (
        body('card_id')
            .isString()
            .notEmpty(),

        body('device_id')
            .isString()
            .notEmpty()
    ) : (
        query('card_id')
            .isString()
            .notEmpty(),

        query('device_id')
            .isString()
            .notEmpty()
    )
];

const reqLogoutConfirmation = [
    body() ? (
        body('card_id')
            .isString()
            .notEmpty(),

        body('device_id')
            .isString()
            .notEmpty()
    ) : (
        query('card_id')
            .isString()
            .notEmpty(),

        query('device_id')
            .isString()
            .notEmpty()
    )
];

const getPendingLogoutConfirmation = [
    body('driver_id')
        .isString()
        .notEmpty()
];

const checkPaidLogout = [
    body('id')
        .isInt()
        .notEmpty(),
        
    body('driver_id')
        .isString()
        .notEmpty()
];

const attendanceValidator = {
    driCardRegister,
    checkAttendanceStatus,
    timeInAttendance,
    reqLogoutConfirmation,
    getPendingLogoutConfirmation,
    checkPaidLogout
}

export default attendanceValidator;