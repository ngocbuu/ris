const { HTTP_STATUS, ERROR_TYPES } = require('../utils/constants');

class ErrorHandler {
    static handle(error, req, res, next){
        console.error('Error occurred:', {
            message: error.message,
            stack: error.stack,
            url:req.url,
            method: req.method,
            user: req.user?.user_id,
            timestamp: new Date().toISOString()
        });
        // Default error response
        let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errorType = ERROR_TYPES.DATABASE_ERROR;

        // Handle specific error types
        if (error.name === 'ValidationError') {
            statusCode = HTTP_STATUS.BAD_REQUEST;
            message = error.message;
            errorType = ERROR_TYPES.VALIDATION_ERROR;
        } else if (error.name === 'CastError') {
            statusCode = HTTP_STATUS.BAD_REQUEST;
            message = 'Invalid ID format';
            errorType = ERROR_TYPES.VALIDATION_ERROR;
        } else if (error.code === '23505') { // PostgreSQL unique violation
            statusCode = HTTP_STATUS.CONFLICT;
            message = 'Resource already exists';
            errorType = ERROR_TYPES.DUPLICATE_ERROR;
        } else if (error.code === '23503') { // PostgreSQL foreign key violation
            statusCode = HTTP_STATUS.BAD_REQUEST;
            message = 'Referenced resource does not exist';
            errorType = ERROR_TYPES.VALIDATION_ERROR;
        } else if (error.code === '23502') { // PostgreSQL not null violation
            statusCode = HTTP_STATUS.BAD_REQUEST;
            message = 'Required field is missing';
            errorType = ERROR_TYPES.VALIDATION_ERROR;
        }

        // Don't expose internal errors in production
        if (process.env.NODE_ENV === 'production' && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
            message = 'Something went wrong';
        }

        res.status(statusCode).json({
            success: false,
            message,
            error: errorType,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
    /**
     * Handle 404 errors
     */
    static notFound(req, res, next) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Route not found',
            error: ERROR_TYPES.NOT_FOUND_ERROR
        });
    }

    /**
     * Create custom error
     */
    static createError(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorType = ERROR_TYPES.DATABASE_ERROR) {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.errorType = errorType;
        return error;
    }
}

module.exports = ErrorHandler;