const BaseModel = require('./baseModel');
const db = require('../config/database');
const Helpers = require('../utils/helpers');

class OrderModel extends BaseModel {
    constructor() {
        super('orders');
    }
    async create(orderData) {
        if (!orderData.order_number) {
            orderData.order_number = await this.generateOrderNumber();
        }

        return await super.create(orderData);
    }

    /**
     * Generate unique order number
     */
    async generateOrderNumber() {
        let isUnique = false;
        let orderNumber;

        while (!isUnique) {
            orderNumber = Helpers.generateOrderNumber();
            const existing = await this.findByOrderNumber(orderNumber);
            if (!existing) {
                isUnique = true;
            }
        }

        return orderNumber;
    }

    /**
     * Find order by order number
     */
    async findByOrderNumber(orderNumber) {
        const query = `SELECT * FROM orders WHERE order_number = $1`;
        const result = await db.query(query, [orderNumber]);
        return result.rows[0];
    }

    /**
     * Get orders with patient and procedure information
     */
    async getOrdersWithDetails(filters = {}, pagination = {}) {
        let query = `
            SELECT 
                o.*,
                p.first_name,
                p.last_name,
                p.patient_code,
                p.date_of_birth,
                p.gender,
                p.phone,
                u.first_name as referring_doctor_first_name,
                u.last_name as referring_doctor_last_name,
                json_agg(
                    json_build_object(
                        'procedure_id', op.order_procedure_id,
                        'procedure_type_id', pt.procedure_type_id,
                        'procedure_name', pt.procedure_name,
                        'body_part', op.body_part,
                        'laterality', op.laterality,
                        'procedure_status', op.procedure_status,
                        'scheduled_datetime', op.scheduled_datetime
                    ) ORDER BY op.created_at
                ) FILTER (WHERE op.order_procedure_id IS NOT NULL) as procedures
            FROM orders o
            JOIN patients p ON o.patient_id = p.patient_id
            LEFT JOIN users u ON o.referring_doctor_id = u.user_id
            LEFT JOIN order_procedures op ON o.order_id = op.order_id
            LEFT JOIN procedure_types pt ON op.procedure_type_id = pt.procedure_type_id
        `;

        const params = [];
        const conditions = [];

        // Apply filters
        if (filters.patient_id) {
            conditions.push(`o.patient_id = $${params.length + 1}`);
            params.push(filters.patient_id);
        }

        if (filters.order_status) {
            conditions.push(`o.order_status = $${params.length + 1}`);
            params.push(filters.order_status);
        }

        if (filters.priority) {
            conditions.push(`o.priority = $${params.length + 1}`);
            params.push(filters.priority);
        }

        if (filters.from_date) {
            conditions.push(`o.order_date >= $${params.length + 1}`);
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            conditions.push(`o.order_date <= $${params.length + 1}`);
            params.push(filters.to_date);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` GROUP BY o.order_id, p.patient_id, u.user_id`;
        query += ` ORDER BY o.order_date DESC`;

        // Apply pagination
        if (pagination.limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(pagination.limit);
        }

        if (pagination.offset) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(pagination.offset);
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Search orders by various criteria
     */
    async searchOrders(searchTerm, filters = {}, pagination = {}) {
        let query = `
            SELECT 
                o.*,
                p.first_name,
                p.last_name,
                p.patient_code
            FROM orders o
            JOIN patients p ON o.patient_id = p.patient_id
            WHERE (
                o.order_number LIKE UPPER($1) OR
                p.patient_code LIKE UPPER($1) OR
                LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($1) OR
                LOWER(o.clinical_indication) LIKE LOWER($1)
            )
        `;

        const params = [`%${searchTerm}%`];
        const conditions = [];

        // Apply additional filters
        if (filters.order_status) {
            conditions.push(`o.order_status = $${params.length + 1}`);
            params.push(filters.order_status);
        }

        if (conditions.length > 0) {
            query += ` AND ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY o.order_date DESC`;

        // Apply pagination
        if (pagination.limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(pagination.limit);
        }

        if (pagination.offset) {
            query += ` OFFSET $${params.length + 1}`;
            params.push(pagination.offset);
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get order statistics
     */
    async getOrderStats(filters = {}) {
        let query = `
            SELECT 
                COUNT(*) as total_orders,
                COUNT(*) FILTER (WHERE order_status = 'pending') as pending_orders,
                COUNT(*) FILTER (WHERE order_status = 'scheduled') as scheduled_orders,
                COUNT(*) FILTER (WHERE order_status = 'in_progress') as in_progress_orders,
                COUNT(*) FILTER (WHERE order_status = 'completed') as completed_orders,
                COUNT(*) FILTER (WHERE priority = 'stat') as stat_orders,
                COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_orders
            FROM orders o
        `;

        const params = [];
        const conditions = [];

        if (filters.from_date) {
            conditions.push(`o.order_date >= $${params.length + 1}`);
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            conditions.push(`o.order_date <= $${params.length + 1}`);
            params.push(filters.to_date);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        const result = await db.query(query, params);
        return result.rows[0];
    }
}

module.exports = new OrderModel();