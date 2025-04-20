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
const Messages = require('../constants/messages.json');
const Coupon = require("../models/couponModel");
const Address = require("../models/addressModel");




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


        const couponCode = order.couponCode;
        const coupon = await Coupon.findOne({ code: couponCode });
        let couponPercentage = coupon?.discountPercentage || null;



        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }



        let selectedAddress = null;
        if (order.addressId) {
            const userAddress = await Address.findOne(
                { "address._id": order.addressId },
                { "address.$": 1 }
            );
            if (userAddress && userAddress.address.length > 0) {
                selectedAddress = userAddress.address[0];
            }
        }


        if (!selectedAddress) {
            console.error("Selected address not found in the addresses array");
            return res.status(404).json({ success: false, message: "Address not found" });
        }



        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true,
            font: 'Helvetica'
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${order._id}.pdf`);
        doc.pipe(res);


        const drawTableLine = (x1, y1, x2, y2) => {
            doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
        };


        const logoPath = path.join(__dirname, "../public/images/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 100 });
        }

        doc.font('Helvetica-Bold').fontSize(24).text("BUILD YOUR DREAM", 200, 45, { align: "right" });
        doc.font('Helvetica').fontSize(10)
            .text("Electronics Business Street", 200, 75, { align: "right" })
            .text("Bangalore, India", 200, 90, { align: "right" })
            .text("Phone: +1234567890", 200, 105, { align: "right" });


        doc.moveDown(2);
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#444')
            .text("ORDER INVOICE", 250, doc.y, { align: "center" });

        doc.moveDown();


        const invoiceDetailsY = doc.y + 10;


        doc.rect(50, invoiceDetailsY, 250, 120).stroke();
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
            .text("Invoice Details", 60, invoiceDetailsY + 10);

        doc.font('Helvetica').fontSize(10)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 60, invoiceDetailsY + 35)
            .text(`Invoice #: ${order.dummyOrderId}`, 60, invoiceDetailsY + 55)
            .text(`Payment Method: ${order.paymentMethod}`, 60, invoiceDetailsY + 75)
            .text(`Payment Status: ${order.paymentStatus}`, 60, invoiceDetailsY + 95);


        doc.rect(320, invoiceDetailsY, 230, 120).stroke();
        doc.font('Helvetica-Bold').fontSize(12)
            .text("Bill To", 330, invoiceDetailsY + 10);

        doc.font('Helvetica').fontSize(10)
            .text(`Customer: ${order.userId.username}`, 330, invoiceDetailsY + 35)
            .text(`Email: ${order.userId.email}`, 330, invoiceDetailsY + 50)
            .text(`House/Building: ${selectedAddress.houseNumber}`, 330, invoiceDetailsY + 65)
            .text(`Landmark: ${selectedAddress.landmark || 'N/A'}`, 330, invoiceDetailsY + 80)
            .text(`City: ${selectedAddress.city}`, 330, invoiceDetailsY + 95)
            .text(`Pincode: ${selectedAddress.pincode}`, 330, invoiceDetailsY + 110);


        const tableTop = invoiceDetailsY + 140;
        const tableHeaders = ['Item', 'Quantity', 'Price', 'Total'];
        const columnWidths = [250, 100, 100, 100];
        const startX = 50;


        doc.font('Helvetica-Bold').fontSize(10);
        let currentX = startX;
        tableHeaders.forEach((header, i) => {
            doc.text(header, currentX, tableTop);
            currentX += columnWidths[i];
        });


        drawTableLine(50, tableTop - 5, 550, tableTop - 5);
        drawTableLine(50, tableTop + 15, 550, tableTop + 15);


        let yPosition = tableTop + 30;
        let subtotal = 0;

        doc.font('Helvetica').fontSize(10);
        order.items.forEach((item, index) => {
            const total = item.quantity * item.price;
            subtotal += total;


            currentX = startX;
            doc.text(item.productId.name, currentX, yPosition);
            doc.text(item.quantity.toString(), currentX + columnWidths[0], yPosition);
            doc.text(`${item.price.toFixed(2)}`, currentX + columnWidths[0] + columnWidths[1], yPosition);
            doc.text(`${total.toFixed(2)}`, currentX + columnWidths[0] + columnWidths[1] + columnWidths[2], yPosition);


            if (index < order.items.length - 1) {
                drawTableLine(50, yPosition + 15, 550, yPosition + 15);
            }

            yPosition += 20;
        });


        let discount = 0.00;
        
        let grandTotal = subtotal;

        if (coupon && couponPercentage) {
            discount = (couponPercentage / 100) * grandTotal;
            grandTotal = grandTotal - discount;
        }
        




        const totalsY = yPosition + 20;
        doc.font('Helvetica-Bold');


        doc.rect(300, totalsY, 250, 100).stroke();


        doc.text("Subtotal:", 320, totalsY + 10);
        doc.text(`${subtotal.toFixed(2)}`, 480, totalsY + 10, { align: "right" });

        doc.text("Discount:", 320, totalsY + 30);
        doc.text(`${discount.toFixed(2)}`, 480, totalsY + 30, { align: "right" });

        


        drawTableLine(300, totalsY + 60, 550, totalsY + 60);

        doc.fontSize(12).text("Grand Total:", 320, totalsY + 75);
        doc.text(`${grandTotal.toFixed(2)}`, 480, totalsY + 75, { align: "right" });

        
        const footerY = totalsY + 150;
        doc.fontSize(10).fillColor('#666')
            .text("Thank you for your purchase!", 50, footerY, { align: "center" })
            .moveDown(0.5)
            .text("This is a system-generated invoice.", { align: "center" });

        
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#666')
                .text(
                    `Page ${i + 1} of ${pages.count}`,
                    50,
                    doc.page.height - 50,
                    { align: "center" }
                );
        }

        doc.end();
    } catch (err) {
        console.error("Invoice generation error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};



const retryPayment = async (req, res) => {
    try {

        const { razorpayPaymentId, orderId } = req.body



        const order = await Orders.findById(orderId);


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

        const { orderId } = req.params;

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