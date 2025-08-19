const db = require('../config/database')
const BaseModel = require('./baseModel');
const bcrypt = require('bcryptjs')

class UserModel extends BaseModel {
    constructor() {
        super('users');
    }

    // Tạo mới User
    async create(userData){
        if(userData.password) {
            userData.password_hash = await bcrypt.hash(userData.password, 12);
            delete userData.password;
        }
        return await super.create(userData);
    }
    //Find user by username or email
    async findByUsername(username){
        const query = `SELECT * FROM users WHERE (username =$1 OR email =$1) AND is_active=true`;
        const result = await db.query(query, [username, username]);
        return result.rows[0] || null;
    }
    //Verify password
    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    //Update last login
    async updateLastLogin(userId){
        const query = `
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE user_id=$1`
        await db.query(query, [userId]);
    }
    //Get user with role permissions
    async findWithPermissions(userId){
        const query = `SELECT u.* CASE
                                    WHEN u.role_type ='admin' THEN '["*"]::jsonb
                                    ELSE '[]'::jsonb
                                END as permissions
                        FROM users u
                        WHERE u.user_id=$1 AND u.is_active = true`
        const result = await db.query(query, [userId]);
        return result.rows[0] || null;
    }
}

module.exports = new UserModel();
