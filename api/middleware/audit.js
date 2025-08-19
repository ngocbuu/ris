const db = require('../config/database')
const {v4:uuidv4} = require('uuid');

class AuditMiddleware{
    static async logActivity(req, res, next){
        const originalEnd = res.end;
        // Override end function to capture response
        res.end = function(chunk, encoding) {
            // Call original end function
            originalEnd.call(res, chunk, encoding);
            
            // Log activity asynchronously
            AuditMiddleware.saveAuditLog(req, res).catch(error => {
                console.error('Failed to save audit log:', error);
            });
        };

        next();
    }
    /**
     * Save audit log to database
     */
    static async saveAuditLog(req, res) {
        try {
            const auditData = {
                log_id: uuidv4(),
                user_id: req.user?.user_id || null,
                action: `${req.method} ${req.route?.path || req.path}`,
                table_name: AuditMiddleware.extractTableName(req),
                record_id: AuditMiddleware.extractRecordId(req),
                old_values: null, // Could be enhanced to capture old values
                new_values: req.method !== 'GET' ? req.body : null,
                ip_address: AuditMiddleware.getClientIP(req),
                user_agent: req.get('User-Agent'),
                status_code: res.statusCode,
                created_at: new Date()
            };

            const query = `
                INSERT INTO audit_logs (
                    log_id, user_id, action, table_name, record_id,
                    old_values, new_values, ip_address, user_agent,
                    status_code, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `;

            await db.query(query, [
                auditData.log_id,
                auditData.user_id,
                auditData.action,
                auditData.table_name,
                auditData.record_id,
                auditData.old_values ? JSON.stringify(auditData.old_values) : null,
                auditData.new_values ? JSON.stringify(auditData.new_values) : null,
                auditData.ip_address,
                auditData.user_agent,
                auditData.status_code,
                auditData.created_at
            ]);

        } catch (error) {
            console.error('Error saving audit log:', error);
        }
    }

    /**
     * Extract table name from request
     */
    static extractTableName(req) {
        const pathSegments = req.path.split('/');
        const resourceMap = {
            'patients': 'patients',
            'orders': 'orders',
            'studies': 'studies',
            'reports': 'reports',
            'appointments': 'appointments',
            'claims': 'bhyt_claims',
            'insurance': 'insurance_cards',
            'users': 'users'
        };

        for (const segment of pathSegments) {
            if (resourceMap[segment]) {
                return resourceMap[segment];
            }
        }

        return null;
    }

    /**
     * Extract record ID from request
     */
    static extractRecordId(req) {
        // Look for UUID in path parameters
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = req.path.match(uuidRegex);
        return match ? match[0] : null;
    }

    /**
     * Get client IP address
     */
    static getClientIP(req) {
        return req.ip || 
            req.connection?.remoteAddress || 
            req.socket?.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            'unknown';
    }
}

module.exports = AuditMiddleware;