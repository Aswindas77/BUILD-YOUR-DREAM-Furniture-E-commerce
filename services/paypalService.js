const Cart = require('../models/cartModel');
const Order = require('../models/ordermodel');
const paypal = require('@paypal/checkout-server-sdk');
const client = require('../config/paypal');

const createPayPalOrder = async (totalAmount, userId) => {
    try {
        // console.log(req, 'inside the function req')
        // console.log(req.body, 'inside the function req body')
        // const {  totalAmount } = req;
        // const userId = req.session.User._id;
        console.log("total",totalAmount)

       
       

        // Create PayPal order request
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value:totalAmount.toFixed(2)
                },
                description: `Order for ${userId}`
            }],
            application_context: {
                shipping_preference: 'NO_SHIPPING'
            }
        });

        // Save order details in session
        // req.session.paypalOrderDetails = {
           
            
        //     totalAmount:totalAmount,
            
        // };

        const order = await client.execute(request);
        console.log(order.result.id, 'order order order odxerd')
        const orderId = order.result.id;
        const approvalLink = order.result.links.find(link => link.rel === "approve")?.href;

        if (!approvalLink) {
            throw new Error("PayPal approval link not found");
        }

        return { orderId, approvalLink };
        // res.json({
        //     success: true,
        //     orderId: order.result.id
        // });

    } catch (error) {
        console.error('PayPal Order Creation Error:', error);
        // res.status(500).json({
        //     success: false,
        //     message: 'Failed to create PayPal order'
        // });
    }
};

const capturePayPalOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const orderDetails = req.session.paypalOrderDetails;

        if (!orderDetails) {
            throw new Error('Order details not found in session');
        }

        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        const capture = await client.execute(request);

        if (capture.result.status === 'COMPLETED') {
            // Create order in database
            const newOrder = await Order.create({
                userId: req.session.User._id,
                items: orderDetails.items,
                billingAddress: orderDetails.selectedAddressId,
                totalAmount: orderDetails.totalAmount,
                paymentMethod: 'PayPal',
                paymentStatus: 'Completed',
                status: 'Processing',
                transactionId: orderId
            });

            // Clear cart
            // await Cart.findByIdAndDelete(orderDetails.cartId);

            // Clear session data
            delete req.session.paypalOrderDetails;

            res.json({
                success: true,
                orderId: newOrder._id,
                message: 'Payment successful'
            });
        } else {
            throw new Error('Payment not completed');
        }

    } catch (error) {
        console.error('PayPal Capture Error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment capture failed'
        });
    }
};

module.exports = {
    createPayPalOrder,
    capturePayPalOrder,
};
