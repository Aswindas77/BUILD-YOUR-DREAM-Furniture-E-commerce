const express = require("express")
const mongoose = require("mongoose");
const Product = require("../models/productModel");
const Orders = require("../models/ordermodel");
const Cart = require('../models/cartModel')
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const paypal = require("@paypal/checkout-server-sdk");
const paypalClient = require("../config/paypal");
const Return = require('../models/returnModel');
const walletModel = require("../models/walletModel");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Razorpay = require('razorpay');
const HttpStatus = require('../constants/httpStatus');
const Messages = require('../constants/messages.json')



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
            .populate("addressId", "houseNumber landmark city pincode country")
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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};



// load order view
const loadOrderView = async (req, res) => {
    try {
        const { orderId } = req.params


        const order = await Orders.findById(orderId)
            .populate('userId', 'name email')
            .populate({
                path: 'items.productId',
                select: 'name images price'
            })
            .populate('addressId', 'houseNumber landmark city pincode country');



        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).send('Order not found');
        }

        console.log(order)

        res.render("orderView", { order })
    } catch (error) {
        console.error('Error in loadOrderView:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}

// update order

//====================================================================================================================================================

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;


        const order = await Orders.findById(orderId);

        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }


        if (order.status === "Cancelled") {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'Status change not allowed. Order is already cancelled.'
            });
        }

        if (order.status === "Returned") {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Status change not allowed. Order is already returned.'
            });
        }

        if (order.status === "Delivered") {
            order.paymentStatus = "Paid"
        } else {
            order.paymentStatus = "Pending"
        }
        order.status = status;

        order.paymentStatus = "Paid";

        order.updatedAt = new Date();
        await order.save();

        return res.json({
            success: true,
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        console.error("Error updating order status:", error.stack);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
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
            .populate('addressId')



        //  selected address
        const selectedAddress = order.addressId.address;




        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).render('userError', {
                message: 'Order not found'
            });
        }

        res.render('profile/orderDetais', { order, selectedAddress });
    } catch (error) {
        console.log("Error fetching order details:", error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};







// order cancel

//====================================================================================================================================================

const orderCancel = async (req, res) => {
    try {

        const orderId = req.params.orderId;
        const { reason } = req.body;
        const user = req.session?.User


        console.log("orderId", orderId)
        console.log("reason", reason);


        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Invalid order ID format'
            });
        }

        const order = await Orders.findById(orderId);

        const wallet = await Wallet.findOne({ userId: user._id });

        console.log(wallet.balance)


        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }


        if (order.userId.toString() !== req.session.User._id.toString()) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Unauthorized to cancel this order'
            });
        }


        if (order.status === 'Delivered') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Cannot cancel a delivered order'
            });
        }

        if (order.status === 'Cancelled') {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }


        if (order.paymentStatus === 'Paid') {

            order.paymentStatus = 'Refunded';

            const refundAmount = order.totalAmount;
            const refundDescription = `Refunded amount credited`;
            const refundDate = new Date();

            wallet.balance += order.totalAmount

            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: refundDescription,
                date: refundDate
            });

            await wallet.save();

            req.session.walletRefund = {
                amount: refundAmount,
                description: refundDescription,
                date: refundDate.toLocaleDateString()
            };


        }




        order.status = 'Cancelled';
        order.cancelReason = reason;
        order.cancelledAt = new Date();
        order.cancellationReason = 'Cancelled by user';


        for (const item of order.items) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }

        console.log("cancelled order", order)
        await order.save();


        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// return order

const requestReturn = async (req, res) => {
    try {
        const { orderId, returnReason, itemsDescription } = req.body;

        const order = await Orders.findById(orderId);

        if (!orderId) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Order ID is required' });
        }

        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }



        const returnItems = order.items.map((item, index) => ({
            quantity: item.quantity,
            reason: returnReason,
        }));

        const returnRequest = new Return({
            orderId: order._id,
            userId: order.userId,
            returnStatus: 'Pending',
            returnDate: new Date(),
            reason: returnReason,
            description: itemsDescription

        });

        console.log("Return Request:", returnRequest);

        await returnRequest.save();

        res.json({ success: true, message: 'Return request submitted successfully' });
    } catch (error) {
        console.error('Return Request Error:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    };

}







// load return orderds 


const loadReturnOrder = async (req, res) => {
    try {
        const returns = await Return.find()
            .populate('userId')
            .populate({
                path: 'orderId',
                select: 'items paymentMethod',
                populate: {
                    path: 'items.productId',
                    select: 'name images price'
                }
            })
            .sort({
                updatedAt: -1
            })
            .exec();
        console.log("Return Orders Loaded Successfully ", returns);



        res.render("returnOrders", {
            returnOrders: returns,
            title: "Return Orders Management"
        });

    } catch (error) {
        console.error(" Error loading return orders:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};








// update return status


const updateReturnStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { returnId } = req.params;

        const returnRequest = await Return.findById(returnId).populate('orderId');

        if (!returnRequest) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: 'Return request not found'
            });
        }

        returnRequest.returnStatus = status;
        await returnRequest.save();

        if (status === 'Approved') {
            let wallet = await walletModel.findOne({ userId: returnRequest.userId });

            if (!wallet) {
                wallet = new walletModel({
                    userId: returnRequest.userId,
                    balance: 0,
                    transactions: []
                });
            }

            const refundAmount = returnRequest.orderId.totalAmount;

            wallet.balance += refundAmount;
            wallet.transactions.unshift({
                type: 'credit',
                amount: refundAmount,
                description: "Refund processed for returned item",
                date: new Date()
            });

            await wallet.save();

            await Orders.findByIdAndUpdate(
                returnRequest.orderId._id,
                {
                    status: 'Returned',
                    paymentStatus: 'Refunded'
                }
            );
        }

        res.json({
            success: true,
            message: `Return ${status.toLowerCase()} successfully${status === 'Approved' ? ' and refund processed' : ''}`
        });

    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};











const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Orders.findById(orderId)
            .populate("userId", "username email")
            .populate("items.productId", "name price")
            .populate("addressId");

        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Order not found" });
        }

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice-Buid Your Dream Invoice.pdf`);

        doc.pipe(res);

        doc.rect(0, 0, doc.page.width, 120).fill('#f8f9fa');

        const logoPath = path.join(__dirname, "../public/images/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 100 });
        }

        doc.fillColor("#222222")
            .fontSize(22)
            .font('Helvetica-Bold')
            .text("BUILD YOUR DREAM", 200, 50, { align: "right" })
            .fontSize(10)
            .font('Helvetica')
            .fillColor("#555555")
            .text("electronics Business Street, banglore, india", 200, 75, { align: "right" })
            .text("Phone: +1234567890 | Email: support@buildyourdream.com", 200, 90, { align: "right" })
            .moveDown(2);

        doc.rect(50, 130, doc.page.width - 100, 40).fillAndStroke('#f0f0f0', '#cccccc');
        doc.fillColor("#000000")
            .fontSize(18)
            .font('Helvetica-Bold')
            .text("INVOICE", 0, 142, { align: "center" })
            .moveDown(1.5);

        const customerY = doc.y + 10;
        doc.rect(50, customerY, 240, 80).fill('#f9f9f9');

        doc.fillColor("#444444")
            .fontSize(12)
            .font('Helvetica-Bold')
            .text("Bill To:", 60, customerY + 10)
            .moveDown(0.5)
            .fontSize(10)
            .font('Helvetica')
            .text(`Name: ${order.userId.username}`, 60)
            .text(`Email: ${order.userId.email}`, 60)
            .moveDown();

        doc.rect(310, customerY, 240, 80).fill('#f9f9f9');

        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text("Invoice Details:", 320, customerY + 10)
            .moveDown(0.5)
            .fontSize(10)
            .font('Helvetica')
            .text(`Invoice No: #${order._id}`, 320)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 320)
            .text(`Payment Status: ${order.paymentStatus}`, 320)
            .text(`Payment Method: ${order.paymentMethod}`, 320)
            .moveDown(2);

        const tableTop = doc.y + 20;
        doc.rect(50, tableTop, doc.page.width - 100, 25).fill('#3498db');

        doc.fillColor("#ffffff").fontSize(11).font('Helvetica-Bold');
        doc.text("Item", 70, tableTop + 7, { width: 200 });
        doc.text("Quantity", 270, tableTop + 7, { width: 70, align: "center" });
        doc.text("Price", 340, tableTop + 7, { width: 90, align: "center" });
        doc.text("Total", 430, tableTop + 7, { width: 90, align: "right" });

        let y = tableTop + 25;

        order.items.forEach((item, index) => {
            const isEvenRow = index % 2 === 0;
            doc.rect(50, y, doc.page.width - 100, 25).fill(isEvenRow ? '#f5f5f5' : '#ffffff');

            doc.fillColor("#444444").fontSize(10).font('Helvetica');
            doc.text(item.productId.name, 70, y + 7, { width: 200 });
            doc.text(item.quantity.toString(), 270, y + 7, { width: 70, align: "center" });
            doc.text(`${item.price.toFixed(2)}`, 340, y + 7, { width: 90, align: "center" });
            doc.text(`${(item.quantity * item.price).toFixed(2)}`, 430, y + 7, { width: 90, align: "right" });

            y += 25;
        });

        const totalsY = y + 20;
        doc.rect(310, totalsY, 240, order.couponCode ? 90 : 60).fill('#f9f9f9').stroke('#e0e0e0');

        let currentY = totalsY + 15;

        doc.fillColor("#000000").fontSize(10).font('Helvetica-Bold');
        doc.text("Subtotal:", 330, currentY);
        doc.font('Helvetica').text(`${order.totalAmount.toFixed(2)}`, 430, currentY, { align: "right", width: 100 });

        if (order.couponCode) {
            currentY += 20;
            doc.font('Helvetica-Bold').text("Discount:", 330, currentY);
            doc.font('Helvetica').text(`-₹${(order.discount || 0).toFixed(2)}`, 430, currentY, { align: "right", width: 100 });
        }

        currentY += 20;

        doc.rect(310, currentY - 5, 240, 30).fill('#3498db');
        doc.fontSize(12)
            .fillColor("#ffffff")
            .font('Helvetica-Bold')
            .text("Grand Total:", 330, currentY);
        doc.text(`${(order.totalAmount - (order.discount || 0)).toFixed(2)}`, 430, currentY, { align: "right", width: 100 });

        const footerY = doc.page.height - 100;

        doc.moveTo(50, footerY)
            .lineTo(doc.page.width - 50, footerY)
            .stroke('#cccccc');

        if (fs.existsSync(logoPath)) {
            doc.opacity(0.05);
            doc.image(logoPath, doc.page.width / 2 - 100, doc.page.height / 2 - 100, { width: 200 });
            doc.opacity(1);
        }

        doc.moveDown(4)
            .fillColor("#555555")
            .fontSize(11)
            .font('Helvetica-Bold')
            .text("Thank you for shopping with us!", { align: "center" })
            .moveDown()
            .fontSize(8)
            .font('Helvetica')
            .text("This is a computer-generated invoice and does not require a signature.", { align: "center" })
            .moveDown(0.5)
            .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            doc.fillColor("#aaaaaa")
                .fontSize(8)
                .text(
                    `Page ${i + 1} of ${totalPages}`,
                    50,
                    doc.page.height - 30,
                    { align: "center", width: doc.page.width - 100 }
                );
        }

        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


const retryPayment = async (req, res) => {
    try {

        const { razorpayPaymentId, orderId } = req.body

        console.log("jannana",orderId)

        const order = await Orders.findById(orderId);
        console.log("abiii",order)

        if (!order) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Order not found" });
        }

        order.paymentStatus = "Paid";
        order.isPaid = true;
        order.razorpayPaymentId = razorpayPaymentId;
        await order.save();

        res.json({ success: true, message: "Payment status updated successfully" });

    } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }

}




const razorpay = new Razorpay({
    key_id: "rzp_test_av7bn0QCiETOX0",
    key_secret: "wehlBhfqQlWoouA0ZGxYB373",
});

const createRetryPayment = async (req, res) => {
    try {
        const { receipt, currency, amount } = req.body;

        const {orderId} =req.params;

        const newOrder = await razorpay.orders.create({
             amount,
            currency,
            receipt,

        });

        res.json({
            success: true,
            razorpayOrderId: newOrder.id,
            amount,
            orderId: orderId
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
}







module.exports = {

    loadOrderPage,
    loadOrderView,
    updateOrderStatus,
    getOrderDetails,
    orderCancel,
    requestReturn,
    loadReturnOrder,
    updateReturnStatus,
    generateInvoice,
    createRetryPayment,
    retryPayment,
};