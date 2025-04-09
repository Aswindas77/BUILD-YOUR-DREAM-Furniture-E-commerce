const HttpStatus = require("../constants/httpStatus");
const Product =require("../models/productModel");


const productStock =async (req,res,next)=>{
    try {
        const cartItems =req.body.cartId;
        console.log("hurrayy",cartItems)

        if (!cartItems || !cartItems.productId ) {
            return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Invalid cart data' });
        }

        const product = await Product.findById(cartItems.productId)

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (cartItems.currentQty > product.stock ||product.stock=== 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Only ${product.stock} items left in stock` 
            });
        }

        next();

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });

    }
}


module.exports = { 
    productStock
};