const BaseModel = require('./baseModel')
const db = require('../config/database')
const Helpers = require('../utils/helpers')

class PatientModel extends BaseModel{
    constructor() {
        super('patients');
    }

    async create(patientData){
        if(!patientData.patient_code){
            patientData.patient_code = await this.generatePatientCode();
        }
        return await super.create(patientData);
    }
    //generate unique patient code
    async generatePatientCode() {
       const isUnique = false
       let code;

       while (!isUnique){
        code = Helpers.generatePatientCode();
        const existing = await this.findByCode(code);
        if (!existing) {
            isUnique = true;
        }
       }
       return code;
    }

    //Find patient by code
    async findByCode(patientCode){
        const query = `SELECT * FROM patients WHERE patient_code = $1`
        const result = await db.query(query, [patientCode]);
        return result.rows[0];
    }
    //Search patients by vairous criteria
    async searchPatients(searchTerm, limit=10){
        const query = `
            SELECT *
            FROM patients
            WHERE (
                LOWER(first_name) LIKE LOWER($1) OR
                LOWER(last_name) LIKE LOWER($1) OR
                LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1) OR
                LOWER(CONCAT(last_name,' ',first_name)) LIKE LOWER($1) OR
                patient_code LIKE UPPER($1) OR
                phone LIKE $1 OR
                email LIKE LOWER($1)
            )
                AND is_active = true
                ORDER BY
                    CASE
                        WHEN patient_code = UPPER($2) THEN 1
                        WHEN LOWER(CONCAT(last_name,' ', first_name)) = LOWER($2) THEN 2
                        ELSE 3
                    END,
                    last_name, first_name
                LIMIT $3`;
        const searchPattern = `%${searchTerm}%`;
        const results = await db.query(query, [searchPattern, searchTerm, limit]);
        return results.rows;
    }
    //Get patient with orders and studies
    async getPatientWithHistory(patientId){
        const query =` SELECT 
            p.*,
            json_agg(
                json_build_object(
                    'order_id', o.order_id,
                    'order_number', o.order_number,
                    'order_date', o.order_date,
                    'order_status', o.order_status,
                    'referring_doctor_name', o.referring_doctor_name,
                    'clinical_indication', o.clinical_indication,
                    'studies', (
                        SELECT json_agg(
                            json_build_object(
                                'study_id', s.study_id,
                                'accession_number', s.accession_number,
                                'study_date', s.study_date,
                                'study_status', s.study_status,
                                'modality', m.modality_name
                            )
                        )
                        FROM studies s
                        JOIN modalities m ON s.modality_id = m.modality_id
                        WHERE s.order_id = o.order_id
                    )
                ) ORDER BY o.order_date DESC
            ) FILTER (WHERE o.order_id IS NOT NULL) as order_history
        FROM patients p
        LEFT JOIN orders o ON p.patient_id = o.patient_id
        WHERE p.patient_id = $1
        GROUP BY p.patient_id`;
        const result = await db.query(query, [patientId]);
        return result.rows[0];
    }

    /**
     * Get patient statistics
     */
    async getPatientStats(patientId) {
        const query = `
            SELECT 
                COUNT(DISTINCT o.order_id) as total_orders,
                COUNT(DISTINCT s.study_id) as total_studies,
                COUNT(DISTINCT r.report_id) as total_reports,
                MIN(o.order_date) as first_visit,
                MAX(o.order_date) as last_visit
            FROM patients p
            LEFT JOIN orders o ON p.patient_id = o.patient_id
            LEFT JOIN studies s ON o.order_id = s.order_id
            LEFT JOIN reports r ON s.study_id = r.study_id
            WHERE p.patient_id = $1
        `;
        
        const result = await db.query(query, [patientId]);
        return result.rows[0];
    }

    /**
     * Check for duplicate patients
     */
    async findPotentialDuplicates(patientData) {
        const query = `
            SELECT *
            FROM patients
            WHERE (
                (LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND date_of_birth = $3) OR
                (phone = $4 AND phone IS NOT NULL) OR
                (email = LOWER($5) AND email IS NOT NULL)
            )
            AND is_active = true
        `;
        
        const result = await db.query(query, [
            patientData.first_name,
            patientData.last_name,
            patientData.date_of_birth,
            patientData.phone,
            patientData.email
        ]);
        
        return result.rows;
    }
}

module.exports = new PatientModel();
