const Coupon = require("../models/couponModel");
const Cart = require("../models/cartModel");




// load coupon page

//====================================================================================================================================================

const loadCoupon = async (req, res) => {
    try {

        const coupons = await Coupon.find({ isDeleted: false }).sort({ createdAt: -1 });
        return res.render("coupon", { coupons });

    } catch (error) {

        console.error(error.message);
        res.status(500).send("Internal Server Error");

    }
};

// add coupon page

//====================================================================================================================================================

const addCoupon = async (req, res) => {
    try {
        console.log("Received coupon data:", req.body);

        const {
            code,
            description,
            discountPercentage,
            minPurchase,
            startDate,
            expiryDate
        } = req.body;

        const formattedCode = code.toUpperCase();


        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        console.log(existingCoupon);

        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
        }


        const newCoupon = new Coupon({
            code: formattedCode,
            description,
            discountPercentage: Number(discountPercentage),
            minPurchase: Number(minPurchase),
            startDate: new Date(startDate),
            expiryDate: new Date(expiryDate),
            isActive: true
        });

        await newCoupon.save();

        return res.status(201).json({
            success: true,
            message: "Coupon created successfully!",
            coupon: newCoupon
        });

    } catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// edit coupon 

//====================================================================================================================================================

const editCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id)
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        console.log("jiii", coupon)

        res.status(200).json({
            success: true,
            coupon
        });
    } catch (error) {
        console.error("Error editing coupon:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// update coupon 

//====================================================================================================================================================

const updateCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        const updateData = req.body;

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json(coupon);
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// delete coupon 

//====================================================================================================================================================

const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id

        const softdelete = await Coupon.findByIdAndUpdate(
            couponId,
            { isDeleted: true },
            { new: true }

        );
        if (!softdelete) {
            throw new Error("Coupon not found.");
        }
        console.log("coo", softdelete)
        return res.status(200).json({ message: "coupon successfully marked as deleted." });
    } catch (error) {

    }
}





            // ! user side coupon controller //



// get available coupons

//====================================================================================================================================================

const getAvailableCoupons = async (req, res) => {
    try {
        const total = parseFloat(req.query.total);
        const currentDate = new Date();

        
        const coupons = await Coupon.find({
            minPurchase: { $lte: total },
            startDate: { $lte: currentDate },
            expiryDate: { $gte: currentDate },
            isActive: true
        });

        res.json({ success: true, coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ success: false, message: 'Error fetching coupons' });
    }
};


// apply coupon 

//====================================================================================================================================================

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, cartId, grandTotal } = req.body;
        const userId = req.session.User._id;

        
        const coupon = await Coupon.findOne({
            code: couponCode,
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
            isActive: true
        });

        if (!coupon) {
            return res.json({
                success: false,
                message: 'Invalid or expired coupon code'
            });
        }

        
        if (grandTotal < coupon.minPurchase) {
            return res.json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minPurchase} required for this coupon`
            });
        }

        
        const discountAmount = (grandTotal * coupon.discountPercentage) / 100;
        const finalAmount = grandTotal - discountAmount;

        
        await Cart.findByIdAndUpdate(cartId, {
            couponApplied: couponCode,
            discount: discountAmount,
            finalAmount: finalAmount
        });

        res.json({
            success: true,
            originalAmount: grandTotal,
            discount: discountAmount,
            finalAmount: finalAmount
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.json({
            success: false,
            message: 'Error applying coupon'
        });
    }
};


// remove coupon

//====================================================================================================================================================

const removeCoupon = async (req, res) => {
    try {
        const { cartId } = req.body;

        
        const cart = await Cart.findById(cartId);

        if (!cart) {
            return res.json({
                success: false,
                message: 'Cart not found'
            });
        }

        
        cart.couponApplied = null;
        cart.discount = 0;
        cart.finalAmount = cart.totalAmount;

        await cart.save();

        res.json({
            success: true,
            message: 'Coupon removed successfully',
            originalAmount: cart.totalAmount
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.json({
            success: false,
            message: 'Error removing coupon'
        });
    }
};



module.exports = {
    loadCoupon,
    addCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon,
    getAvailableCoupons,
    applyCoupon,
    removeCoupon,

}