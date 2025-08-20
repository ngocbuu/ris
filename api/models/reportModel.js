const BaseModel = require('./baseModel');
const db=require('../config/database')
const Helpers = require('../utils/helpers')

class ReportModel extends BaseModel {
    constructor() {
        super('reports');
    }

    //Generate unique report number
    async generateReportNumber() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth()+1).padStart(2, '0'); // Months are zero-indexed
        const day = String(today.getDate()).padStart(2, '0');
        const prefix = `RPT${year}${month}${day}`;
        
        const query =`
            SELECT report_number
            FROM reports
            WHERE report_number LIKE $1
            ORDER BY report_number DESC
            LIMIT 1
        `;

        const result = await db.query(query, [`${prefix}%`]);
        let nextNumber = 1;

        if(result.rows.length > 0){
            const lastNumber = result.rows[0].report_number.substring(prefix.length);
            nextNumber = Number(lastNumber)+1
        }

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    //Get report with study and patient details
    async getReportsWithDetails(filters={}, pagination={}){
        let query = `
            SELECT
                r.*,
                s.accession_number,
                s.study_date,
                s.study_description,
                p.first_name,
                p.last_name,
                p.patient_code,
                m.modality_name,
                u.first_name as radiologist_first_name,
                u.last_name as radiologist_last_name,
                v.first_name as verified_by_first_name,
                v.last_name as verified_by_last_name
            FROM reports r
            JOIN studies s ON r.study_id = s.study_id
            JOIN patients p ON s.patient_id = p.patient_id
            LEFT JOIN modalities m ON s.modality_id = m.modality_id
            LEFT JOIN users u ON r.radiologist_id = u.user_id
            LEFT JOIN users v ON r.verified_by = v.user_id
        `;

        const params = []
        const conditions = []

        //Apply filters
        if(filters.radiologist_id){
            conditions.push(`r.radiologist_id = $${params.length + 1}`)
            params.push(filters.radiologist_id);
        }

        if(filters.report_status){
            conditions.push(`r.report_status = $${params.length + 1}`)
            params.push(filters.report_status);
        }

        if(filters.priority){
            conditions.push(`r.priority = $${params.length + 1}`)
            params.push(filters.priority);
        }

        if(filters.from_date){
            conditions.push(`r.report_date >= $${params.length + 1}`)
            params.push(filters.from_date);
        }

        if(filters.to_date){
            conditions.push(`r.report_date <= $${params.length + 1}`)
            params.push(filters.to_date);
        }

        if(conditions.length > 0){
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY r.report_date DESC`;

        //Apply pagination
        if(pagination.limit){
            query+= ` LIMIT $${params.length + 1}`;
            params.push(pagination.limit);
        }
        if(pagination.offset){
            query+= ` OFFSET $${params.length + 1}`;
            params.push(pagination.offset);
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    //Get report with detailed information
    async getReportWithDetails(reportId){
          const query = `
        SELECT 
            r.*,
            s.accession_number,
            s.study_date,
            s.study_description,
            s.study_instance_uid,
            p.first_name,
            p.last_name,
            p.patient_code,
            p.date_of_birth,
            p.gender,
            o.order_number,
            o.clinical_indication,
            o.clinical_history,
            m.modality_name,
            m.modality_code,
            u.first_name as radiologist_first_name,
            u.last_name as radiologist_last_name,
            u.license_number as radiologist_license,
            v.first_name as verified_by_first_name,
            v.last_name as verified_by_last_name
        FROM reports r
        JOIN studies s ON r.study_id = s.study_id
        JOIN patients p ON s.patient_id = p.patient_id
        LEFT JOIN orders o ON s.order_id = o.order_id
        LEFT JOIN modalities m ON s.modality_id = m.modality_id
        LEFT JOIN users u ON r.radiologist_id = u.user_id
        LEFT JOIN users v ON r.verified_by = v.user_id
        WHERE r.report_id = $1
    `;

    const result = await db.query(query, [reportId]);
    return result.rows[0];
    }

    //Get report statistics of radiologist
    async getRadiologistStats(radiologistId, filters={}){
         let query = `
        SELECT 
            COUNT(*) as total_reports,
            COUNT(*) FILTER (WHERE report_status = 'draft') as draft_reports,
            COUNT(*) FILTER (WHERE report_status = 'preliminary') as preliminary_reports,
            COUNT(*) FILTER (WHERE report_status = 'final') as final_reports,
            COUNT(*) FILTER (WHERE priority = 'stat') as stat_reports,
            COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_reports,
            AVG(EXTRACT(EPOCH FROM (verified_datetime - report_date))/3600) as avg_turnaround_hours
        FROM reports r
        WHERE r.radiologist_id = $1
    `;

    const params = [radiologistId];

    if (filters.from_date) {
        query += ` AND r.report_date >= $${params.length + 1}`;
        params.push(filters.from_date);
    }

    if (filters.to_date) {
        query += ` AND r.report_date <= $${params.length + 1}`;
        params.push(filters.to_date);
    }

    const result = await db.query(query, params);
    return result.rows[0];
    }

}

module.exports = new ReportModel();