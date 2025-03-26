const mongoose = require("mongoose");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const Coupon = require('../models/couponModel');
const User = require('../models/userModel.js');
const HttpStatus = require('../constants/httpStatus.js');
const Messages =require('../constants/messages.json')




// loadCart page 

//====================================================================================================================================================

const loadCart = async (req, res) => {
    try {
        const userId = req.session?.User;
        if (!userId) {
            return res.redirect("/user/login")
        }

        const user = req.session?.User;
        const products = await Product.find({
            isDeleted: false, isListed: false,
            stock: { $gt: 0 }
        });

        const categories = await Category.find({ isDeleted: false, isListed: false });





        const cart = await Cart.findOne({ userId })
            .populate({
                path: "products.productId",
                select: "name salesPrice images stock",
            });





        console.log("Cart Data After Populate:", JSON.stringify(cart, null, 2));

        if (!cart || !cart.products || cart.products.length === 0) {
            return res.render("cart", { user, products, categories, cart: [] });
        }

        if (cart.products && cart.products.length > 0) {
            cart.products = cart.products.filter(p => p.productId && p.productId.stock > 0)
        }

        res.render("cart", { user, products, categories, cart });

    } catch (err) {
        console.log("Error loading cart:", err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

//====================================================================================================================================================

// add cart

//====================================================================================================================================================

const addcart = async (req, res) => {
    try {


        const { productId, quantity } = req.body;

        if (!req.session.User || !req.session.User._id) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: "User not authenticated" });
        }



        const userId = req.session.User._id;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const productExists = cart.products.some(item => item.productId.equals(productId));


        if (productExists) {


            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "product is already exist" });
        }

        const product = await Product.findById(productId);

        if (!product.stock > 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'the products is currently unavailable' });
        }


        if (!product) return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found" });



        cart.products.push({
            productId,
            quantity: quantity || 1,
            name: product.name,
            salesPrice: product.salesPrice
        });

        await cart.save();
        res.json({ success: true, message: "Product added to cart", cart });

    } catch (err) {
        console.error("Error adding to cart:", err.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

//====================================================================================================================================================

// updaate cart

//====================================================================================================================================================

const updateCart = async (req, res) => {
    try {
        const { cart } = req.body;
        const userId = req.session?.User;

        if (!cart || !userId) {
            return res.status().json({ success: false, message: 'Invalid request' });
        }


        const product = await Product.findById(cart.productId);

        if (!product) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found" });
        }


        if (product.stock === 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: "No stock available"
            });
        }


        if (cart.currentQty > product.stock) {
            return res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: `Not enough stock available. Only ${product.stock} left.`
            });
        }


        if (cart.currentQty > 5) {
            return res.status(HttpStatus.NOT_FOUND).json({
                success: false,
                message: "Maximum purchase quantity is 5 products"
            });
        }


        const updatedOrder = await Cart.findOneAndUpdate(
            { userId: userId._id, 'products.productId': cart.productId },
            { $set: { 'products.$.quantity': cart.currentQty } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Cart not found' });
        }

        res.status(HttpStatus.OK).json({ success: true, message: 'Cart updated successfully', cart: updatedOrder });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// delete cart product

//====================================================================================================================================================

const deleteCart = async (req, res) => {

    try {
        const userId = req.session?.User;
        const productId = req.query.id;

        const cart = await Cart.findOne({ userId });

        if (!cart || !cart.products || cart.products.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Cart is empty" });
        }

        const productIndex = cart.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: "Product not found in cart" });
        }

        cart.products.splice(productIndex, 1);
        console.log("product deleted")

        await cart.save();

        let newTotal = 0;
        cart.products.forEach(item => {
            newTotal += item.salesPrice * item.quantity;
        });

        return res.status(HttpStatus.OK).json({ success: true, message: "Product removed from cart", newTotal });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }


};

// load checkout page

//====================================================================================================================================================

const loadCheckout = async (req, res) => {
    try {
        const Id = req.query.id;
        const grandTotal = req.query.total;
        const cartId = new mongoose.Types.ObjectId(Id);
        const userId = req.session?.User?._id;


        const user = await User.findById(userId)

        if (!userId) {
            return res.redirect('/user/login');
        }
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

        cart.products = cart.products.filter(p => p.productId && p.productId.stock > 0)



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

// Add coupon validation endpoint
const validateCoupon = async (req, res) => {
    try {
        const { couponCode, total } = req.body;
        const userId = req.session?.User._id;

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true,
            validUntil: { $gt: new Date() },
            validFrom: { $lte: new Date() },
            usedCount: { $lt: mongoose.expr({ $ifNull: ['$usageLimit', Infinity] }) }
        });

        if (!coupon) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        if (total < coupon.minPurchase) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minPurchase} required`
            });
        }

        // Calculate discount
        const discountAmount = Math.min(
            (total * coupon.discount) / 100,
            coupon.maxDiscount
        );

        res.json({
            success: true,
            discount: discountAmount,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};

module.exports = {
    loadCart,
    addcart,
    updateCart,
    loadCheckout,
    deleteCart,
    validateCoupon
}; 