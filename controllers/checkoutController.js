const mongoose = require('mongoose');
const HttpStatus = require('http-status-codes');
const Messages = require('../utils/messages');
const User = require('../models/userModel');
const Cart = require('../models/cartModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Coupon = require('../models/couponModel');
const Order = require('../models/ordermodel');
const Wallet = require('../models/walletModel');

/**
 * Load the checkout page
 */
const loadCheckout = async (req, res) => {
    try {
        const Id = req.query.id;
        const Total = req.query.total;
        const cartId = new mongoose.Types.ObjectId(Id);
        const userId = req.session?.User?._id;

        if (!userId) {
            return res.redirect('/user/login');
        }

        const user = await User.findById(userId);
        const grandTotal = Number(Total).toFixed(2);

        // Get valid coupons
        const validCoupons = await Coupon.find({
            isActive: true,
            validUntil: { $gt: new Date() },
            validFrom: { $lte: new Date() },
            $or: [
                { usageLimit: { $exists: false } },
                { usedCount: { $lt: "$usageLimit" } }
            ],
            minPurchase: { $lte: grandTotal }
        });

        const products = await Product.find({ isDeleted: false, isListed: false });
        if (!products) {
            return res.redirect('/user/login');
        }

        const categories = await Category.find({ isDeleted: false, isListed: false });
        const userAddresses = await Address.findOne({ userId: userId }).populate("userId");

        if (!cartId) {
            console.log("Cart ID missing!");
            return res.status(HttpStatus.BAD_REQUEST).send("Cart ID is required");
        }

        const cart = await Cart.findById(cartId)
            .populate({
                path: 'products.productId',
                select: 'name salesPrice quantity stock'
            })
            .exec();

        cart.products = cart.products.filter(p => p.productId && p.productId.stock > 0);

        if (userAddresses) {
            userAddresses.address = userAddresses.address.filter(addr => !addr.isDeleted);
        }

        res.render("checkOut", {
            user,
            products,
            categories,
            addresses: userAddresses ? userAddresses.address : [],
            cart,
            coupons: validCoupons,
            grandTotal
        });

    } catch (error) {
        console.error("Error in loadCheckout:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

/**
 * Add a new address from checkout page
 */
const addCheckoutAddress = async (req, res) => {
    try {
        const addressData = req.body;
        const user = req.session?.User;

        if (!user) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: Messages.UNAUTHORIZED_ACCESS });
        }

        const { houseNumber, landmark, city, country, pincode, phone } = addressData;

        if (!houseNumber || !city || !country || !pincode || !phone) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Required fields are missing." });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Invalid phone number format." });
        }

        const pincodeRegex = /^\d{6}$/;
        if (!pincodeRegex.test(pincode)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Invalid pincode format. Must be 6 digits." });
        }

        let address = await Address.findOne({ userId: user._id });
        const newAddress = { houseNumber, landmark, city, country, pincode, phone, isDeleted: false };

        if (!address) {
            address = new Address({
                userId: user._id,
                address: [newAddress],
            });
        } else {
            address.address.push(newAddress);
        }

        await address.save();

        return res.status(HttpStatus.CREATED).json({
            success: true,
            message: "Address added successfully!",
            address: newAddress
        });
    } catch (error) {
        console.error("Error Adding Address:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

/**
 * Select address for checkout
 */
const selectAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        const userId = req.session?.User?._id;

        if (!userId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: Messages.UNAUTHORIZED_ACCESS });
        }

        const userAddress = await Address.findOne({
            userId,
            "address._id": addressId
        });

        if (!userAddress) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Address not found" });
        }

        return res.status(HttpStatus.OK).json({
            success: true,
            message: "Address selected successfully"
        });
    } catch (error) {
        console.error("Error selecting address:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

/**
 * Process the order checkout
 */
const processCheckout = async (req, res) => {
    try {
        const { selectedAddressId, paymentMethod, cartId, couponCode } = req.body;
        const userId = req.session.User._id;

        
        if (!selectedAddressId || !paymentMethod || !cartId) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const coupon = await Coupon.findOne({ code: couponCode, isActive: true, isDeleted: false });
        let couponPercentage = coupon?.discountPercentage || null;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        const cart = await Cart.findById(cartId).populate("products.productId");
        if (!cart) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: "Cart not found"
            });
        }

        let totalAmount = cart.products.reduce((total, item) => total + item.quantity * item.salesPrice, 0);
        const subTotal = totalAmount;

        if (coupon) {
            let discountAmount = (couponPercentage / 100) * totalAmount;
            totalAmount = totalAmount - discountAmount;
        }

        const orderItems = cart.products.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.salesPrice,
        }));

        
        if (paymentMethod.toLowerCase() === "wallet") {
            return processWalletPayment(req, res, userId, totalAmount, orderItems, selectedAddressId, paymentMethod, subTotal, couponCode, cart, cartId, coupon);
        } else if (paymentMethod.toLowerCase() === "cash on delivery") {
            return processCodPayment(req, res, totalAmount, orderItems, selectedAddressId, paymentMethod, subTotal, couponCode, userId, cart, cartId, coupon);
        } else {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Invalid payment method"
            });
        }
    } catch (error) {
        console.error("Error processing checkout:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


const processWalletPayment = async (req, res, userId, totalAmount, orderItems, selectedAddressId, paymentMethod, subTotal, couponCode, cart, cartId, coupon) => {
    try {
        const wallet = await Wallet.findOne({ userId });

        if (!wallet || wallet.balance < totalAmount) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "Insufficient Wallet Balance",
            });
        }

        // Check product stock
        for (let item of orderItems) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: `Product with ID ${item.productId} not found`,
                });
            }

            if (product.stock < item.quantity) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                });
            }
        }

        // Update wallet balance
        wallet.balance -= totalAmount;
        await wallet.save();

        // Update product stock
        for (let item of orderItems) {
            const product = await Product.findById(item.productId);
            product.stock -= item.quantity;
            await product.save();
        }

        // Create new order
        const newOrder = new Order({
            userId,
            dummyOrderId:dummyId,
            couponCode: couponCode || null,
            items: orderItems,
            addressId: selectedAddressId,
            paymentMethod,
            subTotal,
            totalAmount,
            paymentStatus: "Paid",
            orderStatus: "Pending",
        });

        await newOrder.save();

        // Update coupon usage if applicable
        if (coupon) {
            coupon.usedBy.push(userId);
            await coupon.save();
        }

        // Delete cart
        await Cart.findByIdAndDelete(cartId);

        return res.status(HttpStatus.OK).json({
            success: true,
            message: "Order placed successfully using Wallet",
            orderId: newOrder._id,
        });
    } catch (error) {
        console.error("Error processing wallet payment:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

/**
 * Process cash on delivery payment
 */
const processCodPayment = async (req, res, totalAmount, orderItems, selectedAddressId, paymentMethod, subTotal, couponCode, userId, cart, cartId, coupon) => {
    try {
        if (totalAmount > 10000) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "COD is available only for orders up to ₹10,000"
            });
        }

        // Check product stock
        for (let item of orderItems) {
            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: `Product with ID ${item.productId} not found`,
                });
            }

            if (product.stock < item.quantity) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                });
            }

            // Update product stock
            product.stock -= item.quantity;
            await product.save();
        }

        // Create new order
        const newOrder = new Order({
            userId,
            dummyOrderId:dummyId,
            couponCode: couponCode || null,
            items: orderItems,
            addressId: selectedAddressId,
            paymentMethod,
            subTotal,
            totalAmount,
            paymentStatus: "Pending",
            orderStatus: "Pending",
            updatedAt: new Date(),
        });

        await newOrder.save();

        // Update coupon usage if applicable
        if (coupon) {
            coupon.usedBy.push(userId);
            await coupon.save();
        }

        // Delete cart
        await Cart.findByIdAndDelete(cartId);

        return res.status(HttpStatus.OK).json({
            success: true,
            message: "Order placed successfully. Pay on delivery.",
            orderId: newOrder._id,
        });
    } catch (error) {
        console.error("Error processing COD payment:", error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

module.exports = {
    loadCheckout,
    addCheckoutAddress,
    selectAddress,
    processCheckout
}; 