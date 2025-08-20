const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const { HTTP_STATUS, ERROR_TYPES, PAGINATION, APPOINTMENT_STATUS } = require('../utils/constants');
const Helpers = require('../utils/helpers');

class AppointmentController {
    //get all appointments with pagination and filters

    async getAllAppointments(req,res){
        try{
            const {
                page = PAGINATION.DEFAULT_PAGE,
                limit = PAGINATION.DEFAULT_LIMIT,
                patient_id,
                equipment_id,
                status,
                from_date,
                to_date,
            } = req.query;

            const pagination = {
                limit: Math.min(limit, PAGINATION.MAX_LIMIT),
                offset: (Number(page) - 1) * Math.min(limit, PAGINATION.MAX_LIMIT)
            }

            const filters = Helpers.cleanObject({
                patient_id,
                equipment_id,
                status,
                from_date,
                to_date
            })

            const appointments = await appointmentModel.getAppointmentsWithDetails(filters, pagination)
            const total = await appointmentModel.count(filters);

            res.json({
                success: true,
                data: appointments,
                pagination: {
                    page: Number(page),
                    limit: pagination.limit,
                    total,
                    pages: Math.ceil(total / pagination.limit)
                }
            })
        }catch(error){
            console.error('Get appointments error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get appointments',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //get appointment by ID
    async getAppointmentById(req, res) {
        try{
            const { appointmentId} = req.params;
            const appointment = await appointmentModel.getAppointmentWithDetails(appointmentId);

            if(!appointment){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Appointment not found',
                    error: ERROR_TYPES.NOT_FOUND
                });
            }

            res.json({
                success: true,
                data: appointment
            });


        }catch(error){
            console.error('Get appointment by ID error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get appointment by ID',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //get available time slots

    async getAvailableTimeSlots(req, res) {
        try{
            const { equipment_id, date, duration=30} = req.query;

            if(!equipment_id || !date){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Missing required fields',
                    error: ERROR_TYPES.VALIDATION_ERROR
                });
            }

            const availableSlots = await appointmentModel.getAvailableTimeSlots(equipment_id, date, Number(duration));

            res.json({
                success: true,
                data: availableSlots
            })

        }catch(error){
            console.error('Get available time slots error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get available time slots',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //create new appointment

    async createAppointment(req, res) {
        try{
            const appointmentData = req.body;
            appointmentData.created_by = req.user.user_id;

            //generate appointment number

            if(!appointmentData.appointment_number){
                appointmentData.appointment_number = await appointmentModel.generateAppointmentNumber();
            }

            //Verify patient exists
            const patient = await patientModel.findById(appointmentData.patient_id);
            if(!patient){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Patient not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            //check for conflicts
            const hasConflict = await appointmentModel.checkTimeSlotConflict(
                appointmentData.equipment_id,
                appointmentData.appointment_datetime,
                appointmentData.duration
            );

            if(hasConflict){
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'Time slot conflict',
                    error: ERROR_TYPES.BUSINESS_LOGIC_ERROR
                });
            }

            const newAppointment = await appointmentModel.create(appointmentData);
            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Appointment created successfully',
                data: newAppointment
            });
        }catch(error){
            console.error('Create appointment error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to create appointment',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //update appointment
    async updateAppointment(req, res){
        try{
            const {appointment_id} = req.params;
            const updateData = Helpers.cleanObject(req.body);

            //Don't update appointment number
            delete updateData.appointment_number;
            delete updateData.created_by;

            //If updating datetim or duration, check conflitc
            if(updateData.appointment_datetime || updateData.duration){
                const existingAppointment = await appointmentModel.findById(appointment_id);
                if(!existingAppointment){
                    return res.status(HTTP_STATUS.NOT_FOUND).json({
                        success: false,
                        message: 'Appointment not found',
                        error: ERROR_TYPES.NOT_FOUND_ERROR
                    });
                }

                const hasConflict = await appointmentModel.checkTimeSlotConflict(
                    updateData.equipment_id || existingAppointment.equipment_id,
                    updateData.appointment_datetime || existingAppointment.appointment_datetime,
                    updateData.duration || existingAppointment.duration,
                    appointment_id // Exclude current appointment
                );
                if(hasConflict){
                    return res.status(HTTP_STATUS.CONFLICT).json({
                        success: false,
                        message: 'Time slot conflict',
                        error: ERROR_TYPES.BUSINESS_LOGIC_ERROR
                    });
                }
                const updateAppointment = await appointmentModel.update(appointment_id,updateData);

                if(!updateAppointment){
                    return res.status(HTTP_STATUS.NOT_FOUND).json({
                        success: false,
                        message: 'Appointment not found',
                        error: ERROR_TYPES.NOT_FOUND_ERROR
                    });
                }

                res.json({
                    success: true,
                    message: 'Appointment updated successfully',
                    data: updateAppointment
                });
            }
        }catch(error){
            console.error('Update appointment error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to update appointment',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //update appointment status
    async updateAppointmentStatus(req, res) {
        try{
            const { appointmentId } = req.params;
            const { status, notes } = req.body;

            //validate status
            if(!Object.values(APPOINTMENT_STATUS).includes(status)){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid appointment status',
                    error: ERROR_TYPES.VALIDATION_ERROR
                });
            }

            const updateAppointment = await appointmentModel.update(appointmentId, {
                status: status,
                notes: notes
            });
            if(!updateAppointment){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Appointment not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            res.json({
                success: true,
                message: 'Appointment status updated successfully',
                data: updateAppointment
            });

        }catch(error){
            console.error('Update appointment status error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to update appointment status',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //cancel appointment
    async cancelAppointment(req, res) {
        try{
           const {appointmentId} = req.params;
           const {reason} = req.body;

           const updateAppointment = await appointmentModel.update(appointmentId,{
            status: APPOINTMENT_STATUS.CANCELLED,
            notes: reason || 'Appointment cancelled'
           })

           if(!updateAppointment){
               return res.status(HTTP_STATUS.NOT_FOUND).json({
                   success: false,
                   message: 'Appointment not found',
                   error: ERROR_TYPES.NOT_FOUND_ERROR
               });
           }

           res.json({
               success: true,
               message: 'Appointment cancelled successfully',
               data: updateAppointment
           });

        }catch(error){
            console.error('Cancel appointment error:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to cancel appointment',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }
}

module.exports = new AppointmentController();