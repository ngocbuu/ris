const BaseModel = require('./baseModel')
const db = require('../config/database')
const Helpers = require('../utils/helpers')

class AppointmentModel extends BaseModel {
    constructor() {
        super('appointments')
    }

    async generateAppointmentNumber(){
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
        const day = String(today.getDate()).padStart(2, '0');

        const prefix = `APT${year}${month}${day}`;

        const query = `
            SELECT appointment_number
            FROM appointments
            WHERE appointment_number LIKE $1
            ORDER BY appointment_number DESC
            LIMIT 1
        `;

        const result = await db.query(query, [`${prefix}%`]);
        let nextNumber = 1;

        if(result.rows.length > 0) {
            const lastNumber = result.rows[0].appointment_number.substring(prefix.length);
            nextNumber = Number(lastNumber) + 1;
        }

        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    }

    //Get appointments with patient and equipment details
    async getAppointmentsWithDetails(filters = {}, pagination = {}){
        let query =`
            SELECT 
                a.*,
                p.first_name,
                p.last_name,
                p.patient_code,
                p.phone,
                e.equipment_name,
                e.room_number,
                m.modality_name,
                u.first_name as technologist_fist_name,
                u.last_name as technologist_last_name,
                o.order_number,
                o.clinical_indication
            FROM appointments as a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN equipment e ON a.equipment_id = e.equipment_id
            LEFT JOIN modalities m ON e.modality_id = m.modality_id
            LEFT JOIN users u ON a.technologist_id = u.user_id
            LEFT JOIN orders o ON a.order_id = o.order_id
        `;
        
        const params = [];
        const conditions = [];

        //Apply filters
        if(filters.patient_id) {
            conditions.push(`a.patient_id = $${params.length + 1}`)
            params.push(filters.patient_id)
        }
        if(filters.equipment_id)
        {
            conditions.push(`a.equipment_id = $${params.length + 1}`)
            params.push(filters.equipment_id)
        }
        if(filters.status){
            conditions.push(`a.status = $${params.length + 1}`)
            params.push(filters.status)
        }
        if(filters.from_date){
            conditions.push(`a.appointment_datetime >= $${params.length + 1}`)
            params.push(filters.from_date)
        }
        if(filters.to_date){
            conditions.push(`a.appointment_datetime <= $${params.length + 1}`)
            params.push(filters.to_date)
        }
        if(conditions.length > 0){
            query+= `WHERE ${conditions.join(' AND ')}`
        }

        query+= ` ORDER BY a.appointment_datetime ASC`

        //Apply pagination
        if(pagination.limit){
            query +=` LIMIT $${params.length + 1}`;
            params.push(pagination.limit);
        }
        if(pagination.offset){
            query+=` OFFSET $${params.length + 1}`;
            params.push(pagination.offset);
        }

        const result = await db.query(query, params);
        return result.rows;

    }

    //Get appointment with detailed information
    async getAppointmentWithDetails(appointmentId) {
        const query = `
            SELECT 
                a.*,
                p.first_name,
                p.last_name,
                p.patient_code,
                p.date_of_birth,
                p.gender,
                p.phone,
                p.email,
                e.equpiment_name,
                e.room_number,
                e.manufacturer,
                e.model,
                m.modality_name,
                m.modality_code,
                u.first_name as technologist_first_name,
                u.last_name as technologist_last_name,
                o.order_number,
                o.clinical_indication,
                o.clinical_history
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN equipment e ON a.equipment_id = e.equipment_id
            LEFT JOIN modalities m ON e.modality_id = m.modality_id
            LEFT JOIN users u ON a.technologist_id = u.user_id
            LEFT JOIN orders o ON a.order_id = o.order_id
            WHERE a.appointment_id = $1
        `;

        const result = await db.query(query, [appointmentId]);
        return result.rows[0];
    }

    //Check for time slot conflicts

    async checkTimeSlotConflict(equipmentId, appointmentDateTime, duration, excludeAppointmentId = null){
        const endDateTime = new Date(new Date(appointmentDateTime).getTime() + (duration * 60000)); // Convert duration to milliseconds

        let query =`
            SELECT appointment_id
            FROM appointments
            WHERE equipment_id = $1
            AND status NOT IN ('cancelled', 'completed')
            AND (
                (appointment_datetime < $3 AND appointment_datetime + INTERVAL '1 minute' * duration > $2) OR
                (appointment_datetime > $2 AND appointment_datetime < $3)
            )
        `;
        const params = [equipmentId, appointmentDateTime, endDateTime];

        if(excludeAppointmentId){
            query+= ` AND appointment_id != $${params.length + 1}`
            params.push(excludeAppointmentId);
        }

        query+= ` LIMIT 1`

        const result = await db.query(query, params);
        return result.rows.length > 0;
    }

    //Get available time slots for equipment
    async getAvailableTimeSlots(equipmentId, date, duration = 30){
        //Get existing appointments for the date
        const query = `
            SELECT appointment_datetime, duration
            FROM appointments
            WHERE equipment_id = $1
            AND DATE(appointment_datetime) = $2
            AND status NOT IN ('cancelled', 'completed')
            ORDER BY appointment_datetime
        `;

        const result = await db.query(query, [equipmentId, date]);
        const existingAppointments = result.rows;

        //Generate available slots (8 AM to 6 PM, assuming 10-hour workday)
        const availablesSlots = [];
        const startHour = 8;
        const endHour = 18;

        const slotDuration = duration;

        for(let hour = startHour; hour < endHour; hour++){
            for (let minute = 0; minute < 60; minute += slotDuration){
                const slotStart = new Date(`${date}T${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}:00`);
                const slotEnd = new Date(slotStart.getTime() + (slotDuration * 60000));
                //Check if slot conflicts with existing appointments
                const hasConflict = existingAppointments.some(appointment =>{
                    const appointmentStart = new Date(appointment.appointment_datetime);
                    const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration * 60000));
                    return (slotStart < appointmentEnd && slotEnd > appointmentStart);
                });

                if(!hasConflict){
                    availablesSlots.push({ 
                        start_time: slotStart.toISOString(), 
                        end_time: slotEnd.toISOString(),
                        duration: slotDuration
                    });
                }
            }
        }
        return availablesSlots;
    }
}

module.exports = new AppointmentModel()