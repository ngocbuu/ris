const crypto = require('crypto');

class Helpers {
    static generateId(prefix=''){
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    }
    //Generate Patient ID
    static generatePatientCode(){
        const year = new Date.getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-6);   
        return `P${year}${timestamp}`
    }

    //Generate order number
    static generateOrderNumber(){
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth()+1).toString().padStart(2, '0');
        const day = new Date().getDate().toString().padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `ORD${year}${month}${day}${random}`
    }
    //Generate Accession Number
    static generateAccessionNumber(){
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const time = date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0');
        const random = Math.random().toString().slice(-4);
        return `${year}${month}${day}${time}${random}`;
    }

    //Format date for API
    static formatDate(date, format='YYYY-MM-DD'){
        if (!date) return null;
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hour = d.getHours().toString().padStart(2, '0');
        const minute = d.getMinutes().toString().padStart(2, '0');
        const second = d.getSeconds().toString().padStart(2, '0');
        switch(format){
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'DD-MM-YYYY HH:mm:ss':
                return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
            case 'YYYY-MM-DD HH:mm:ss':
                return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
            default:
                return `${year}-${month}-${day}`;
        }
    }

    //Parse date from various format
    static parseDate(dateString){
        if(!dateString) return null;
        //handle DD/MM/YYYY format
        if(dateString.includes('/')){
            const parts = dateString.split('/');
            if(parts.length === 3){
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        return new Date(dateString);
    }
    /**
 * Generate patient code
 */
static generatePatientCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const timestamp = Date.now().toString().slice(-6);
    return `P${year}${timestamp}`;
}

/**
 * Generate order number
 */
static generateOrderNumber() {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const day = new Date().getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${year}${month}${day}${random}`;
}

/**
 * Generate accession number
 */
static generateAccessionNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = date.getHours().toString().padStart(2, '0') + 
                date.getMinutes().toString().padStart(2, '0');
    const random = Math.random().toString().slice(-4);
    return `${year}${month}${day}${time}${random}`;
}

/**
 * Format date for API response
 */
static formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return null;
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    switch (format) {
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'DD/MM/YYYY HH:mm:ss':
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        case 'YYYY-MM-DD HH:mm:ss':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

    /**
     * Parse date from various formats
     */
    static parseDate(dateString) {
        if (!dateString) return null;

        // Handle DD/MM/YYYY format
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }

        return new Date(dateString);
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number (Vietnamese format)
     */
    static isValidPhone(phone) {
        const phoneRegex = /^(\+84|0)(3|5|7|8|9)[0-9]{8}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Sanitize string for database
     */
    static sanitizeString(str) {
        if (!str) return '';
        return str.trim().replace(/[<>]/g, '');
    }

    /**
     * Generate hash for data integrity
     */
    static generateHash(data, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(JSON.stringify(data)).digest('hex');
    }

    /**
     * Mask sensitive data
     */
    static maskSensitiveData(obj) {
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        const masked = { ...obj };

        sensitiveFields.forEach(field => {
            if (masked[field]) {
                masked[field] = '***';
            }
        });

        return masked;
    }

    /**
     * Calculate age from date of birth
     */
    static calculateAge(dateOfBirth) {
        const today = new Date();
        const birth = new Date(dateOfBirth);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    }

    /**
     * Format currency (Vietnamese Dong)
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    /**
     * Paginate array
     */
    static paginate(array, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const paginatedItems = array.slice(offset, offset + limit);
        
        return {
            data: paginatedItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: array.length,
                pages: Math.ceil(array.length / limit)
            }
        };
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Remove null/undefined values from object
     */
    static cleanObject(obj) {
        const cleaned = {};
        
        Object.keys(obj).forEach(key => {
            if (obj[key] !== null && obj[key] !== undefined) {
                cleaned[key] = obj[key];
            }
        });

        return cleaned;
    }

    /**
     * Sleep utility
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, options = {}) {
        const {
            retries = 3,
            delay = 1000,
            backoff = 2
        } = options;

        let lastError;

        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i < retries) {
                    await this.sleep(delay * Math.pow(backoff, i));
                }
            }
        }

        throw lastError;
    }
}

module.exports = Helpers;