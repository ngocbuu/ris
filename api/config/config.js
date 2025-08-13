module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        name: process.env.DB_NAME || 'ris_database',
        user: process.env.DB_USER || 'ris',
        password: process.env.DB_PASSWORD,
    },
    //JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },

    // bcrypt
    bcrypt: {
        rounds: process.env.BCRYPT_ROUNDS || 12
    },
    bhxh: {
        baseURL: process.env.BHXH_BASE_URL || 'https://api.bhxh.gov.vn',
        apiKey: process.env.BHXH_API_KEY,
        secretKey: process.env.BHXH_SECRET_KEY,
        username: process.env.BHXH_USERNAME,
        password: process.env.BHXH_PASSWORD,
        facilityName: process.env.BHXH_FACILITY_NAME || 'Default Facility', 
        facilityCode: process.env.BHXH_FACILITY_CODE || '0001', 
        timeout: process.env.BHXH_TIMEOUT || 30000,
        retryAttempts: process.env.BHXH_RETRY_ATTEMPTS || 3,
        retryDelay: process.env.BHXH_RETRY_DELAY || 1000
    },
    security:{
        rateLimit: {
            windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
            max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
            sessionTime: Number(process.env.SESSION_TIMEOUT) || 60 * 60 * 1000, // 1 hour
            corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
        }
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableApiLogging: process.env.ENABLE_API_LOGGING === 'true',
        enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true'
    },
    notifications: {
        email: {
            apiKey: process.env.EMAIL_SERVICE_API_KEY,
            from: process.env.EMAIL_FROM || 'noreply@example.com'
        },
        sms: {
            apiKey: ''
        },
        zalo: {
            apiKey: ""
        }
    }
};
