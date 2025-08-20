const patientModel = require('../models/patientModel')
const {HTTP_STATUS, ERROR_TYPES, PAGINATION} = require('../utils/constans')
const Helpers = require('../utils/helpers');

class PatientController {
    //Get all patients with pagination and filter
    async getPatients(req, res){
        try{
            const {
                page = PAGINATION.DEFAULT_PAGE,
                limit = PAGINATION.DEFAULT_LIMIT,
                search,
                gender,
                is_active=true
            } = req.query;

            const pagination = {
                limit: Math.min(Number(limit), PAGINATION.MAX_LIMIT),
                offset: (Number(page)-1) * Math.min(Number(limit), PAGINATION.MAX_LIMIT)
            }

            let patients;
            let total;

            if(search){
                patients = await patientModel.searchPatients(search, pagination.limit)
                total = patients.length;
            }else{
                const filters = Helpers.cleanObject({
                    gender,
                    is_active
                })
                patients = await patientModel.findAll(filters,pagination);
                total = await patientModel.count(filters);
            }

            res.json({
                success: true,
                data: patients,
                pagination: {
                    page: Number(page),
                    limit: pagination.limit,
                    total,
                    pages: Math.ceil(total / pagination.limit)
                }
            })
        }catch(error){
            console.error('Error in getPatients:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve patients',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Get patient by ID
    async getPatientById(req, res){
        try{
            const {patientId} = req.params;
            const {includeHistory = false} = req.query;

            let patient;
            if(includeHistory === 'true'){
                patient =await patientModel.getPatientWithHistory(patientId)
            }else{
                patient= await patientModel.findById(patientId);
            }
            if(!patient){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Patient not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            //Add calculated fields
            if(patient.date_of_birth){
                patient.age = Helpers.calculateAge(patient.date_of_birth);
            }

            res.json({
                success: true,
                data: patient
            })
        }catch(error){
            console.error('Error in getPatientById:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve patient',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }
    //Create new patient
    async createPatient(req, res){
        try{
            const patientData = req.body;

        //Check for potential duplicates
        const duplicates = await patientModel.findPotentialDuplicates(patientData);
        if(duplicates.length > 0){
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'Potential duplicate patient found',
                error: ERROR_TYPES.DUPLICATE_ERROR,
                data: {
                    duplicates: duplicates.map(dup=> ({
                        patient_id: dup.patient_id,
                        patient_code: dup.patient_code,
                        full_name: dup.full_name,
                        date_of_birth: dup.date_of_birth,
                        phone: dup.phone
                    }))
                }
            })
        }
        const newPatient = await patientModel.create(patientData);
        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Patient created successfully',
            data: newPatient
        })
        }catch(error){
            console.error('Error in createPatient:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to create patient',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Update patient
    async updatePatient(req, res){
        try{
            const {patientId} = req.params;
            const updateData = Helpers.cleanObject(req.body);

            //Don't allow updating patient_code
            delete updateData.patient_code;
            const updatePatient = await patientModel.update(patientId, updateData);

            if(!updatePatient){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Patient not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            res.json({
                success: true,
                message: 'Patient updated successfully',
                data: updatePatient
            })
        }catch(error){
            console.error('Error in updatePatient:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to update patient',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Delete patient (soft delete)
    async deletePatient(req, res){
        try{
            const { patientId } = req.params;
            const deletePatient = await patientModel.softDelete(patientId);
            if(!deletePatient){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Patient not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }
            res.json({
                success: true,
                message: 'Patient deleted successfully',
            });
        }catch(error){
            console.error('Error in deletePatient:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to delete patient',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Search patients
    async searchPatients(req, res){
        try{
            const {q: searchTerm, limit = 10} = req.query
            if(!searchTerm || searchTerm.length < 2){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid search term',
                    error: ERROR_TYPES.VALIDATION_ERROR
                });
            }

            const patients = await patientModel.searchPatients(searchTerm, Number(limit))
            res.json({
                success: true,
                message: `Found ${patients.length} patients`,
                data: patients
            });
        }catch(error){
            console.error('Error in searchPatients:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to search patients',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Get patient statistics
    async getPatientStatistics(req, res){
        try{
            const { patientId } = req.params;
            const stats = await patientModel.getPatientStats(patientId);

            if(!stats){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Patient not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            res.json({
                success: true,
                data: stats
            })
        }catch(error){
            console.error('Error in getPatientStatistics:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get patient statistics',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }
}

module.exports = new PatientController();