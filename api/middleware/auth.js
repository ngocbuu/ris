const jwt = require('jsonwebtoken');
const config = require('../config/config')
const userModel = require('../models/userModel')

const {HTTP_STATUS, ERROR_TYPE} = require('../utils/constans')

class AuthMiddleware{
    static async requireAuth(req, res, next){
        try{
            const token = AuthMiddleware.extractToken(req);
            if(!token){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    error: ERROR_TYPE.AUTHENTICATION_ERROR,
                    message: 'Authentication token is required',
                    success: false
                });
            }
            //Verify
            const decoded = jwt.verify(token, config.jwt.secret);
            //Get user details
            const user = await userModel.findWithPermissions(decoded.userId);
            if(!user){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid or expired token',
                    error: ERROR_TYPE.AUTHENTICATION_ERROR
                });
            }

            //Add user to request
            req.user = user;
            req.token = token;

            next();
        }catch(error){
            if(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid or expired token',
                    error: ERROR_TYPE.AUTHENTICATION_ERROR
                });
            }

            if(error.name === 'TokenExpiredError'){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Token has expired',
                    error: ERROR_TYPE.AUTHENTICATION_ERROR
                });
            }

            console.error('Auth middleware error:', error);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Authentication failed',
                error: ERROR_TYPE.AUTHENTICATION_ERROR
            });
        }
    }

    // Require specific roles
    static requireRole(allowedRoles){
        return (req, res, next) =>{
            if(!req.user){
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    error: ERROR_TYPE.AUTHENTICATION_ERROR
                });
            }

            if(!allowedRoles.includes(req.user.role_type)){
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    message: 'Insufficient permissions',
                    error: ERROR_TYPE.AUTHORIZATION_ERROR
                });
            }

            next();
        }
    }

    //Optinal authenticaion
    static async optionalAuth(req, res, next){
        try{
            const token = AuthMiddleware.extractToken(req);

            if(token){
                const decoded = jwt.verify(token, config.jwt.secret);
                const user = await userModel.findWithPermissions(decoded.userId);
                if(user){
                    req.user = user;
                    req.token = token;
                }
                next();
            }
        }catch(error){
            console.error('Optional auth middleware error:', error);
            next();
        }
    }

    //Extract token

    static extractToken(req){
        const authHeader = req.headers.authorization;
        if(authHeader && authHeader.startsWith('Bearer ')){
            return authHeader.split(' ')[1];
        }
        return req.query.token || null;
    }

    //Generate JWT token
    static generateToken(userId, expiresIn = config.jwt.expiresIn){
        return jwt.sign(
            {userId},
            config.jwt.secret,
            {expiresIn}
        )
    }

    //Verify token
    static verifyToken(token){
        return jwt.verify(token, config.jwt.secret);
    }
}

module.exports = AuthMiddleware;