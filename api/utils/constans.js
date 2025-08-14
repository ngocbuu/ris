module.exports = {
  //User roles
  USER_ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    GUEST: 'guest',
    RADIOLOGIST: 'radiologist',
    TECHNOLOGIST: 'technologist',
    RECEPTIONIST: 'receptionist',
    REFERRING_DOCTOR: 'referring_doctor',
    BILLING: 'billing'
  },
  ORDER_STATUS: {
    PENDING: 'pending',
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  STUDY_STATUS: {
    SCHEDULED: 'scheduled',
    ARRIVED: 'arrived',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  REPORT_STATUS: {
    DRAFT: 'draft',
    PRELIMINARY: 'preliminary',
    FINAL: 'final',
    AMENDED: 'amended',
    CANCELLED: 'cancelled'
  },
  APPOINTMENT_STATUS: {
    SCHEDULED: 'scheduled',
    CHECKED_IN: 'checked_in',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    CONFIRMED: 'confirmed',
    NO_SHOW: 'no_show',
    ARRIVED: 'arrived'
  },
  PRIORITY: {
    STAT: 'stat',
    URGENT: 'urgent',
    ROUTINE: 'routine'
  },
  GENDER: {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other'
  },
  INSURANCE_TYPES: {
    BHYT: 'BHYT',
    BHTN: 'BHTN',
    PRIVATE: 'Private'
  },
  BHYT_BENEFIT_LEVELS: {
    LEVEL_1: 1, // Người có công với cách mạng,
    LEVEL_2: 2, // Thương binh, bệnh binh
    LEVEL_3: 3, // Trẻ em dưới 6 tuổi
    LEVEL_4: 4, // Người nghèo, cận nghèo
    LEVEL_5: 5  // Người hưởng chính sách khác
  },
  CLAIM_STATUS: {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PAID: 'paid',
    PROCESSING: 'processing'
  },
  TREATMENT_TYPE: {
    OUTPATIENT: 'outpatient',
    INPATIENT: 'inpatient',
    EMERGENCY: 'emergency',
    DAY_SURGERY: 'day_surgery'
  },
  DIAGNOSIS_TYPES: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    COMPLICATION: 'complication'
  },
  MODALITY_CODES: {
    CT: 'CT',
    MRI: 'MR',
    X_RAY_CR: 'CR',
    ULTRASOUND: 'US',
    MAMMOGRAPHY: 'MG',
    BONE_DENSITOMETRY: 'BD',
    DSA: 'XA',
  },
  EQUIPMENT_STATUS: {
    ACTIVE: 'active',
    MAINTENANCE: 'maintenance',
    INACTIVE: 'inactive'
  },
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },
  BHXH_RESPONSE_CODES: {

  },

  ERROR_TYPES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    DUPLICATE_ERROR: 'DUPLICATE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
    BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR'
  },
  DATE_FORMATS: {
    API: 'YYYY-MM-DD',
    BHXH: 'DD/MM/YYYY',
    DISPLAY: 'DD/MM/YYYY',
    DATETIME: 'YYYY-MM-DDTHH:mm:ssZ',
  },
  ALLOWED_FILE_TYPES: {
    DOCUMENT: ['.pdf', '.doc', '.docx'],
    IMAGE: ['.jpeg', '.jpg', '.png'],
    VIDEO: ['.mp4', '.avi']
  },
  CACHE_TTL: {
    CARD_VERIFICATION: 300,      // 5 minutes
    SERVICE_CATALOG: 3600,       // 1 hour
    USER_SESSION: 1800,          // 30 minutes
    API_RESPONSE: 600            // 10 minutes
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },
};