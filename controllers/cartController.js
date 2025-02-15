const mongoose = require("mongoose");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Address = require('../models/addressModel')
const Orders = require("../models/ordermodel");
const Cart = require('../models/cartModel')
const USER = require("../models/userModel");



// loadCart page 

//====================================================================================================================================================


const loadCart = async (req, res) => {
    try {
        const userId = req.session?.User;
        if (!userId) {
            return res.redirect("/user/login")
        }

        const user = req.session?.User;
        const products = await Product.find({ isDeleted: false, isListed: false });
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



        res.render("cart", { user, products, categories, cart });

    } catch (err) {
        console.log("Error loading cart:", err.message);
    }
};


//====================================================================================================================================================


// add cart

//====================================================================================================================================================
const addcart = async (req, res) => {
    try {


        const { productId, quantity } = req.body;

        if (!req.session.User || !req.session.User._id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const userId = req.session.User._id;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const productExists = cart.products.some(item => item.productId.equals(productId));


        if (productExists) {


            return res.status(400).json({ msg: 'alreadyexist' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

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
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        // Fetch the product stock
        const product = await Product.findById(cart.productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Check if the product is out of stock
        if (product.stock === 0) {
            return res.status(400).json({
                success: false,
                message: "No stock available"
            });
        }

        // Check if requested quantity is greater than available stock
        if (cart.currentQty > product.stock) {
            return res.status(401).json({
                success: false,
                message: `Not enough stock available. Only ${product.stock} left.`
            });
        }

        // Check if quantity exceeds 5
        if (cart.currentQty > 5) {
            return res.status(400).json({
                success: false,
                message: "Maximum purchase quantity is 5 products"
            });
        }

        // Update cart quantity if stock is available
        const updatedOrder = await Cart.findOneAndUpdate(
            { userId: userId._id, 'products.productId': cart.productId },
            { $set: { 'products.$.quantity': cart.currentQty } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        res.status(200).json({ success: true, message: 'Cart updated successfully', cart: updatedOrder });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// delete cart product
const deleteCart = async (req, res) => {

    try {
        const userId = req.session?.User;
        const productId = req.query.id;

        const cart = await Cart.findOne({ userId });

        if (!cart || !cart.products || cart.products.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const productIndex = cart.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        cart.products.splice(productIndex, 1);
        console.log("product deleted")

        await cart.save();

        let newTotal = 0;
        cart.products.forEach(item => {
            newTotal += item.salesPrice * item.quantity;
        });

        return res.status(200).json({ success: true, message: "Product removed from cart", newTotal });
    } catch (error) {

    }


}

// load checkout page

const loadCheckout = async (req, res) => {
    try {
        const Id = req.query.id;
        const grandTotal = req.query.total;

        const cartId = new mongoose.Types.ObjectId(Id);



        if (!cartId) {
            console.log("Cart ID missing!");
            return res.status(400).send("Cart ID is required");
        }

        const cart = await Cart.findById(cartId)
            .populate({
                path: 'products.productId',
                select: 'name salesPrice quantity'
            })
            .exec();





        const user = req.session?.User;
        const { _id } = req.session?.User;
        const userId = new mongoose.Types.ObjectId(_id);

        const products = await Product.find({ isDeleted: false, isListed: false });
        const categories = await Category.find({ isDeleted: false, isListed: false });
        const userAddresses = await Address.findOne({ userId: userId }).populate("userId");

        if (userAddresses) {
            userAddresses.address = userAddresses.address.filter(addr => !addr.isDeleted);
        }

       

        res.render("checkOut", {
            user,
            products,
            categories,
            addresses: userAddresses ? userAddresses.address : [],
            cart
        });

    } catch (error) {
        console.error("Error in loadCheckout:", error);
        res.status(500).send("Internal Server Error");
    }
};


// checkout Page






module.exports = {
    loadCart,
    addcart,
    updateCart,
    loadCheckout,
    deleteCart,
    
    
}