const {body, param, query, validationResult} = require('express-validator')
const {HTTP_STATUS, ERROR_TYPES} = require('../utils/constans')

const Helpers = require('../utils/helpers');

class ValidationMiddleware{
    static handleValidationErrors(req, res, next){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Validation failed',
            error: ERROR_TYPES.VALIDATION_ERROR,
            errors: errors.array()
        });
    }

    next();
    }
    /**
     * Validate patient creation
     */
    static validatePatientCreation() {
        return [
            body('first_name')
                .isLength({ min: 1, max: 50 })
                .withMessage('First name must be between 1 and 50 characters')
                .customSanitizer(Helpers.sanitizeString),
            
            body('last_name')
                .isLength({ min: 1, max: 50 })
                .withMessage('Last name must be between 1 and 50 characters')
                .customSanitizer(Helpers.sanitizeString),
            
            body('date_of_birth')
                .isDate()
                .withMessage('Valid date of birth is required')
                .custom((value) => {
                    const date = new Date(value);
                    const now = new Date();
                    if (date >= now) {
                        throw new Error('Date of birth must be in the past');
                    }
                    return true;
                }),
            
            body('gender')
                .isIn(['Male', 'Female', 'Other'])
                .withMessage('Gender must be Male, Female, or Other'),
            
            body('phone')
                .optional()
                .custom((value) => {
                    if (value && !Helpers.isValidPhone(value)) {
                        throw new Error('Invalid phone number format');
                    }
                    return true;
                }),
            
            body('email')
                .optional()
                .isEmail()
                .withMessage('Invalid email format')
                .normalizeEmail(),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate order creation
     */
    static validateOrderCreation() {
        return [
            body('patient_id')
                .isUUID()
                .withMessage('Valid patient ID is required'),
            
            body('clinical_indication')
                .isLength({ min: 1, max: 500 })
                .withMessage('Clinical indication is required and must be less than 500 characters')
                .customSanitizer(Helpers.sanitizeString),
            
            body('priority')
                .optional()
                .isIn(['stat', 'urgent', 'routine'])
                .withMessage('Priority must be stat, urgent, or routine'),
            
            body('referring_doctor_name')
                .optional()
                .isLength({ max: 100 })
                .withMessage('Referring doctor name must be less than 100 characters')
                .customSanitizer(Helpers.sanitizeString),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate user registration
     */
    static validateUserRegistration() {
        return [
            body('username')
                .isLength({ min: 3, max: 50 })
                .withMessage('Username must be between 3 and 50 characters')
                .isAlphanumeric()
                .withMessage('Username must contain only letters and numbers'),
            
            body('email')
                .isEmail()
                .withMessage('Valid email is required')
                .normalizeEmail(),
            
            body('password')
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
                .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
            
            body('first_name')
                .isLength({ min: 1, max: 50 })
                .withMessage('First name is required and must be less than 50 characters')
                .customSanitizer(Helpers.sanitizeString),
            
            body('last_name')
                .isLength({ min: 1, max: 50 })
                .withMessage('Last name is required and must be less than 50 characters')
                .customSanitizer(Helpers.sanitizeString),
            
            body('role_type')
                .isIn(['admin', 'radiologist', 'technologist', 'receptionist', 'referring_doctor', 'billing'])
                .withMessage('Invalid role type'),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate login
     */
    static validateLogin() {
        return [
            body('username')
                .isLength({ min: 1 })
                .withMessage('Username is required'),
            
            body('password')
                .isLength({ min: 1 })
                .withMessage('Password is required'),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate UUID parameter
     */
    static validateUUIDParam(paramName) {
        return [
            param(paramName)
                .isUUID()
                .withMessage(`${paramName} must be a valid UUID`),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate pagination
     */
    static validatePagination() {
        return [
            query('page')
                .optional()
                .isInt({ min: 1 })
                .withMessage('Page must be a positive integer'),
            
            query('limit')
                .optional()
                .isInt({ min: 1, max: 100 })
                .withMessage('Limit must be between 1 and 100'),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate BHYT card verification
     */
    static validateCardVerification() {
        return [
            body('card_number')
                .isLength({ min: 15, max: 15 })
                .withMessage('BHYT card number must be exactly 15 characters')
                .matches(/^[A-Z]{2}[0-9]{13}$/)
                .withMessage('Invalid BHYT card number format'),
            
            body('patient_id')
                .isUUID()
                .withMessage('Valid patient ID is required'),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

    /**
     * Validate claim creation
     */
    static validateClaimCreation() {
        return [
            body('patient_id')
                .isUUID()
                .withMessage('Valid patient ID is required'),
            
            body('card_id')
                .isUUID()
                .withMessage('Valid card ID is required'),
            
            body('claim_type')
                .isIn(['outpatient', 'inpatient', 'emergency', 'day_surgery'])
                .withMessage('Invalid claim type'),
            
            body('treatment_period_from')
                .isDate()
                .withMessage('Valid treatment start date is required'),
            
            body('treatment_period_to')
                .isDate()
                .withMessage('Valid treatment end date is required')
                .custom((value, { req }) => {
                    if (new Date(value) < new Date(req.body.treatment_period_from)) {
                        throw new Error('Treatment end date must be after start date');
                    }
                    return true;
                }),
            
            ValidationMiddleware.handleValidationErrors
        ];
    }

}

module.exports = ValidationMiddleware;
