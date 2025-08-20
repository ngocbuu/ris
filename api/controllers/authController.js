const userModel = require('../models/userModel');
const AuthMiddleware = require('../middleware/auth');

const {HTTP_STATUS, ERROR_TYPES} = require('../utils/constans')

const Helpers = require('../utils/helpers');

class AuthController {
    async login(req, res){
        try{
            const {username, password} = req.body;
            //Find user by username
            const user = await userModel.findByUsername(username);
            if(!user){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid credentinals',
                    error: ERROR_TYPES.AUTHENTICATION_ERROR
                })
            }
            //Verify password
            const isValidPassword = await userModel.verifyPassword(password, user.password_hash);
            if(!isValidPassword){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid credentials',
                    error: ERROR_TYPES.AUTHENTICATION_ERROR
                })
            }

            //Update last login
            await userModel.updateLastLogin(user.user_id);
            //Generate token
            const token = AuthMiddleware.generateToken(user.user_id);
            //Remove sensitive data
            const userResponse = {...user};

            delete userResponse.password_hash;

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userResponse,
                    token: token,
                    expiresIn: '24h'
                }
            })
        }catch(error){
            console.error('Error in login:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Login failed',
                error: ERROR_TYPES.INTERNAL_SERVER_ERROR
            });
        }
    }

    //User registration
    async register(req, res){
        try{
            const userData = req.body;
            //Check if user already exists

            const existUser = await userModel.findByUsername(userData.username);
            if(existUser){
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'User already exists',
                    error: ERROR_TYPES.DUPLICATE_ERROR
                });
            }

            //Create user
            const newUser = await userModel.create(userData);
            //Remove sensitive data
            delete newUser.password_hash;

            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'User registered successfully',
                data: newUser
            });
        }catch(error){
            console.error('Error in register:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Registration failed',
                error: ERROR_TYPES.INTERNAL_SERVER_ERROR
            });
        }
    }

    //Get current user profile info
    async getProfile(req, res){
        try{
            const user = {...req.user}; // Get user from request
            delete user.password_hash; // Remove sensitive data
            res.json({
                success: true,
                message: 'User profile retrieved successfully',
                data: user
            });
        }catch(error){
            console.error('Error in getProfile:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve profile',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Update user profile
    async updateProfile(req, res){
        try{
            const {user_id} = req.user; // Get user ID from request
            const updateData = Helpers.cleanObject(req.body); // Clean input data
            //Don't allow updating sensitive fields
            delete updateData.password; // Remove password field if present
            delete updateData.password_hash; // Ensure password hash is not updated
            delete updateData.role_type; // Ensure role type is not updated
            delete updateData.is_active; // Ensure is_active is not updated

            const updateUser = await userModel.update(user_id, updateData);
            delete updateUser.password_hash; // Remove sensitive data from response 

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updateUser
            })
        }catch(error){
            console.error('Error in updateProfile:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to update profile',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Change password
    async changePassword(req, res){
        try{
            const {user_id} = req.user; // Get user ID from request
        const {currentPassword, newPassword} = req.body;

        //Get current user
        const user = await userModel.findById(user_id);
        if(!user){
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found',
                error: ERROR_TYPES.NOT_FOUND_ERROR
            });
        }

        //Verify current password
        const isValidPassword = await userModel.verifyPassword(currentPassword, user.password_hash);
        if(!isValidPassword){
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Current password is incorrect',
                error: ERROR_TYPES.VALIDATION_ERROR
            })
        }

        //Update password
        await userModel.create({
            password: newPassword
        })

        res.json({
            success: true,
            message: 'Password change successfully'
        })
        }catch(error){
            console.error('Error in changePassword:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to change password',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Logout user (invalidate token - client side mainly)
    async logout(req, res) {
        res.json({
            success: true,
            message: 'Logout successful'
        })
    }
}

module.exports = new AuthController();