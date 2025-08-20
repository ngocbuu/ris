const orderModel = require('../models/orderModel');
const patientModel = require('../models/patientModel');
const {HTTP_STATUS, ERROR_TYPES,PAGINATION, ORDER_STATUS} = require('../utils/constans')

const Helpers = require('../utils/helpers')

class OrderController {
    async getOrders(req, res){
        try{
            const {
                page = PAGINATION.DEFAULT_PAGE,
                limit = PAGINATION.DEFAULT_LIMIT,
                status,
                priority,
                patient_id,
                from_date,
                to_date,
                search
            } = req.query

            const pagination = {
                limit: Math.min(Number(limit), PAGINATION.MAX_LIMIT),
                offset: (Number(page)-1) * Math.min(Number(limit), PAGINATION.MAX_LIMIT)
            }

            const filters = Helpers.cleanObject({
                order_status: status,
                priority: priority,
                patient_id,
                from_date,
                to_date
            })

            let orders;
            let total;

            if(search){
                orders = await orderModel.searchOrders(search, filters, pagination);
                total = orders.length;
            }else{
                orders = await orderModel.getOrdersWithDetails(filters, pagination);
                total = await orderModel.count(filters);
            }

            res.json({
                success: true,
                data: orders,
                pagination: {
                    page: Number(page),
                    limit: pagination.limit,
                    total,
                    pages: Math.ceil(total / pagination.limit)
                }
            })
        }catch(error){
            console.error('Error in getOrders:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve orders',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Get order by ID
    async getOrderById(req, res){
        try{
            const { orderId } = req.params;
            const orders = await orderModel.getOrdersWithDetails({
                order_id: orderId
            })
            const order = orders[0];

            if(!order){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Order not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            res.json({
                success: true,
                data: order
            })
        }catch(error){
            console.error('Error in getOrderById:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve order',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Create new order
    async createOrder(req, res){
        try{
            const orderData = req.body;
            orderData.created_id = req.user.user_id;

            //Verify patient exists
            const patient = await patientModel.findById(orderData.patient_id);
            if(!patient){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid patient ID',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                })
            }
            const newOrder = await orderModel.create(orderData);

            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Order created successfully',
                data: newOrder
            });
        }catch(error){
            console.error('Error in createOrder:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to create order',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Update order
    async updateOrder(req, res){
        const {orderId} = req.params;
        const updatedData = Helpers.cleanObject(req.body);

        //Don't allow updating order_number
        delete updatedData.order_number;
        delete updatedData.created_by;

        const updatedOrder = await orderModel.update(orderId, updatedData);
        if(!updatedOrder){
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Order not found',
                error: ERROR_TYPES.NOT_FOUND_ERROR
            });
        }

        res.json({
            success: true,
            message: 'Order updated successfully',
            data: updatedOrder
        });
    }

    //Update order status
    async updateOrderStatus(req, res){
        try{
            const {orderId} = req.params;
            const {status, notes} = req.body;

            //Validate status
            if(!Object.values(ORDER_STATUS).includes(status)){
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid order status',
                    error: ERROR_TYPES.VALIDATION_ERROR
                });
            }
            const existingOrder = await orderModel.findById(orderId);
            if(!existingOrder){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Order not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                })
            }

            const updatedOrder = await orderModel.update(orderId,{
                order_status: status,
                notes: notes || existingOrder.notes
            })

            res.json({
                success: true,
                message: 'Order status updated successfully',
                data: updatedOrder
            })
        }catch(error){
            console.error('Error in updateOrderStatus:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to update order status',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Delete order
    async deleteOrder(req, res){
        try{
            const {orderId} = req.params;
            const deleted = await orderModel.delete(orderId);
            if(!deleted){
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false,
                    message: 'Order not found',
                    error: ERROR_TYPES.NOT_FOUND_ERROR
                });
            }

            res.json({
                success: true,
                message: 'Order deleted successfully'
            })
        }catch(err){
            console.error('Error in deleteOrder:', err);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to delete order',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }

    //Get order statistics
    async getOrderStats(req,res){
        try{
            const {from_date, to_date} = req.query;
            const filters = Helpers.cleanObject({
                from_date,
                to_date
            })
            const stats = await orderModel.getOrderStats(filters);
            res.json({
                success: true,
                message: 'Order statistics retrieved successfully',
                data: stats
            });
        }catch(error){
            console.error('Error in getOrderStats:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to retrieve order statistics',
                error: ERROR_TYPES.DATABASE_ERROR
            });
        }
    }
}

module.exports = new OrderController();