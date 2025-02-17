const express =require("express")
const mongoose = require("mongoose");
const Product = require("../models/productModel");
const Orders = require("../models/ordermodel");
const Cart = require('../models/cartModel')
const User = require("../models/userModel");
const paypal = require("@paypal/checkout-server-sdk");
const paypalClient =require("../config/paypal");



// load order page

//====================================================================================================================================================

const loadOrderPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const totalOrders = await Orders.countDocuments({});

        
        const userOrders = await Orders.find({})
            .populate("userId", "name email")
            .populate({
                path: "items.productId",
                model: "Product",
                select: "name price"
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        res.render("orderManagement", {
            userOrders,
            totalOrders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit)
        });
    } catch (error) {
        console.log("Error loading orders:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


// update order

//====================================================================================================================================================

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
       

        const order = await Orders.findByIdAndUpdate(
            orderId,
            {
                status: status,

                updatedAt: new Date()  
            },
            { new: true }  
        ).populate("userId", "name email");  

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order: order  
        });
    } catch (error) {
        console.error("Error updating order status:", error.stack);
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
        });
    }
};


// get order details

//====================================================================================================================================================

const getOrderDetails = async (req, res) => {
    try {
        
        const orderId = req.params.orderId;
        const order = await Orders.findById(orderId)
            .populate({
                path: 'items.productId',
                select: 'name price images description'
            })
            .populate('userId', 'username email')
            

        if (!order) {
            return res.status(404).render('userError', {
                message: 'Order not found'
            });
        }

        res.render('profile/orderDetais', { order });
    } catch (error) {
        console.log("Error fetching order details:", error.message);
        res.status(500).render('userError', {
            message: 'Error fetching order details'
        });
    }
};


// order cancel

//====================================================================================================================================================

const orderCancel = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Orders.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        
        if (order.userId.toString() !== req.session.User._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to cancel this order'
            });
        }

        
        if (order.status === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a delivered order'
            });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }

        
        if (order.paymentStatus === 'Paid') {
            
            order.paymentStatus = 'Refunded';
        }

        
        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = 'Cancelled by user'; 

        
        for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }

        await order.save();

        
        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling order',
            error: error.message
        });
    }
};




module.exports = {
    loadOrderPage,
    updateOrderStatus,
    getOrderDetails,
    orderCancel,
};