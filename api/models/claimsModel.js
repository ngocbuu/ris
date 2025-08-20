const BaseModel = require('./baseModel');
const db = require('../config/database');
const Helpers = require('../utils/helpers');

class ClaimsModel extends BaseModel {
    constructor() {
        super('bhyt_claims');
    }
    /**
 * Generate unique claim number
 */
async generateClaimNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    const prefix = `CL${year}${month}`;
    
    const query = `
        SELECT claim_number 
        FROM bhyt_claims 
        WHERE claim_number LIKE $1 
        ORDER BY claim_number DESC 
        LIMIT 1
    `;
    
    const result = await db.query(query, [`${prefix}%`]);
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
        const lastNumber = result.rows[0].claim_number.substring(prefix.length);
        nextNumber = parseInt(lastNumber) + 1;
    }
    
    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Get claims with patient and card details
 */
async getClaimsWithDetails(filters = {}, pagination = {}) {
    let query = `
        SELECT 
            c.*,
            p.first_name,
            p.last_name,
            p.patient_code,
            ic.card_number,
            ic.benefit_level_id,
            bl.level_name as benefit_level_name
        FROM bhyt_claims c
        JOIN patients p ON c.patient_id = p.patient_id
        LEFT JOIN insurance_cards ic ON c.card_id = ic.card_id
        LEFT JOIN bhyt_benefit_levels bl ON ic.benefit_level_id = bl.level_id
    `;

    const params = [];
    const conditions = [];

    // Apply filters
    if (filters.patient_id) {
        conditions.push(`c.patient_id = $${params.length + 1}`);
        params.push(filters.patient_id);
    }

    if (filters.claim_status) {
        conditions.push(`c.claim_status = $${params.length + 1}`);
        params.push(filters.claim_status);
    }

    if (filters.claim_type) {
        conditions.push(`c.claim_type = $${params.length + 1}`);
        params.push(filters.claim_type);
    }

    if (filters.from_date) {
        conditions.push(`c.created_at >= $${params.length + 1}`);
        params.push(filters.from_date);
    }

    if (filters.to_date) {
        conditions.push(`c.created_at <= $${params.length + 1}`);
        params.push(filters.to_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY c.created_at DESC`;

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
 * Get claim with detailed information
 */
async getClaimWithDetails(claimId) {
    const query = `
        SELECT 
            c.*,
            p.first_name,
            p.last_name,
            p.patient_code,
            p.date_of_birth,
            p.gender,
            ic.card_number,
            ic.benefit_level_id,
            bl.level_name as benefit_level_name,
            bl.coverage_percent,
            json_agg(
                json_build_object(
                    'item_id', ci.claim_item_id,
                    'service_code', bms.service_code,
                    'service_name', bms.service_name,
                    'service_date', ci.service_date,
                    'quantity', ci.quantity,
                    'unit_price', ci.unit_price,
                    'total_price', ci.total_price,
                    'bhyt_covered_amount', ci.bhyt_covered_amount,
                    'patient_copay_amount', ci.patient_copay_amount
                ) ORDER BY ci.service_date
            ) FILTER (WHERE ci.claim_item_id IS NOT NULL) as items
        FROM bhyt_claims c
        JOIN patients p ON c.patient_id = p.patient_id
        LEFT JOIN insurance_cards ic ON c.card_id = ic.card_id
        LEFT JOIN bhyt_benefit_levels bl ON ic.benefit_level_id = bl.level_id
        LEFT JOIN bhyt_claim_items ci ON c.claim_id = ci.claim_id
        LEFT JOIN bhyt_medical_services bms ON ci.bhyt_service_id = bms.service_id
        WHERE c.claim_id = $1
        GROUP BY c.claim_id, p.patient_id, ic.card_id, bl.level_id
    `;

    const result = await db.query(query, [claimId]);
    return result.rows[0];
}

/**
 * Generate monthly report
 */
async generateMonthlyReport(month, year, createdBy) {
    return await db.transaction(async (client) => {
        // Calculate statistics
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT c.patient_id) as total_patients,
                COUNT(c.claim_id) as total_claims,
                SUM(c.total_cost) as total_amount,
                SUM(c.bhyt_covered_amount) as bhyt_covered_amount,
                SUM(c.patient_copay_amount) as patient_copay_amount
            FROM bhyt_claims c
            WHERE EXTRACT(MONTH FROM c.created_at) = $1
            AND EXTRACT(YEAR FROM c.created_at) = $2
            AND c.claim_status IN ('submitted', 'approved', 'paid')
        `;

        const statsResult = await client.query(statsQuery, [month, year]);
        const stats = statsResult.rows[0];

        // Create report record
        const reportQuery = `
            INSERT INTO bhyt_monthly_reports (
                report_month, report_year, total_patients, total_claims,
                total_amount, bhyt_covered_amount, patient_copay_amount,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (report_month, report_year) 
            DO UPDATE SET
                total_patients = EXCLUDED.total_patients,
                total_claims = EXCLUDED.total_claims,
                total_amount = EXCLUDED.total_amount,
                bhyt_covered_amount = EXCLUDED.bhyt_covered_amount,
                patient_copay_amount = EXCLUDED.patient_copay_amount,
                created_by = EXCLUDED.created_by,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const reportResult = await client.query(reportQuery, [
            month, year,
            stats.total_patients || 0,
            stats.total_claims || 0,
            stats.total_amount || 0,
            stats.bhyt_covered_amount || 0,
            stats.patient_copay_amount || 0,
            createdBy
        ]);

        return reportResult.rows[0];
    });
}

/**
 * Get claim statistics
 */
async getClaimStats(filters = {}) {
    let query = `
        SELECT 
            COUNT(*) as total_claims,
            COUNT(*) FILTER (WHERE claim_status = 'draft') as draft_claims,
            COUNT(*) FILTER (WHERE claim_status = 'submitted') as submitted_claims,
            COUNT(*) FILTER (WHERE claim_status = 'approved') as approved_claims,
            COUNT(*) FILTER (WHERE claim_status = 'rejected') as rejected_claims,
            SUM(total_cost) as total_amount,
            SUM(bhyt_covered_amount) as total_bhyt_covered,
            SUM(patient_copay_amount) as total_patient_copay
        FROM bhyt_claims c
    `;

    const params = [];
    const conditions = [];

    if (filters.from_date) {
        conditions.push(`c.created_at >= $${params.length + 1}`);
        params.push(filters.from_date);
    }

    if (filters.to_date) {
        conditions.push(`c.created_at <= $${params.length + 1}`);
        params.push(filters.to_date);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await db.query(query, params);
    return result.rows[0];
}
}

module.exports = new ClaimsModel();
