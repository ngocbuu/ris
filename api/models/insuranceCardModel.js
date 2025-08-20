const BaseModel = require('./baseModel');
const db = require('../config/database');

class InsuranceCardModel extends BaseModel {
    constructor() {
        super('insurance_cards');
    }
    /**
 * Find card by card number
 */
async findByCardNumber(cardNumber) {
    const query = `
        SELECT 
            ic.*,
            p.first_name,
            p.last_name,
            p.patient_code,
            it.type_name as insurance_type_name,
            bl.level_name as benefit_level_name,
            bl.coverage_percent
        FROM insurance_cards ic
        JOIN patients p ON ic.patient_id = p.patient_id
        LEFT JOIN insurance_types it ON ic.insurance_type_id = it.insurance_type_id
        LEFT JOIN bhyt_benefit_levels bl ON ic.benefit_level_id = bl.level_id
        WHERE ic.card_number = $1
    `;
    
    const result = await db.query(query, [cardNumber]);
    return result.rows[0];
}

/**
 * Get verification history for a card
 */
async getVerificationHistory(cardId, pagination = {}) {
    const query = `
        SELECT *
        FROM card_verification_history
        WHERE card_id = $1
        ORDER BY verification_date DESC
        LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [
        cardId,
        pagination.limit || 10,
        pagination.offset || 0
    ]);
    
    return result.rows;
}

/**
 * Count verification history records
 */
async countVerificationHistory(cardId) {
    const query = `
        SELECT COUNT(*) as count
        FROM card_verification_history
        WHERE card_id = $1
    `;
    
    const result = await db.query(query, [cardId]);
    return parseInt(result.rows[0].count);
}

/**
 * Add verification history record
 */
async addVerificationHistory(cardId, verificationData) {
    const query = `
        INSERT INTO card_verification_history (
            card_id, verification_method, verification_result,
            response_data, error_message, verified_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    
    const result = await db.query(query, [
        cardId,
        verificationData.method,
        verificationData.result,
        JSON.stringify(verificationData.responseData),
        verificationData.errorMessage,
        verificationData.verifiedBy
    ]);
    
    return result.rows[0];
}

}

module.exports = new InsuranceCardModel();