const Coupon = require("../models/couponModel");
const Cart = require("../models/cartModel");
const HttpStatus = require('../constants/httpStatus');
const Messages =require('../constants/messages.json')




// load coupon page

//====================================================================================================================================================

const loadCoupon = async (req, res) => {
    try {

        const coupons = await Coupon.find({ isDeleted: false }).sort({ createdAt: -1 });
        return res.render("coupon", { coupons });

    } catch (error) {

        console.error(error.message);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });

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
            return res.status(HttpStatus.BAD_REQUEST).json({
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
            isActive: true,
            updatedAt: new Date()
        });

        await newCoupon.save();

        return res.status(HttpStatus.CREATED).json({
            success: true,
            message: "Coupon created successfully!",
            coupon: newCoupon
        });

    } catch (error) {
        console.error("Error creating coupon:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
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
            return res.status(HttpStatus.NOT_FOUND).json({ message: "Coupon not found" });
        }
        console.log("jiii", coupon)

        res.status(HttpStatus.OK).json({
            success: true,
            coupon
        });
    } catch (error) {
        console.error("Error editing coupon:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};


// update coupon  

//====================================================================================================================================================

const updateCoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        const updateData = req.body;
        console.log("nii", updateData)

        updateData.updatedAt = new Date();

        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!coupon) {
            return res.status(HttpStatus.NOT_FOUND).json({ message: 'Coupon not found' });
        }

        res.json(coupon);
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
}

}


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
        return res.status(HttpStatus.OK).json({ message: "coupon successfully marked as deleted." });
    } catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
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


        if (coupon.usedBy && coupon.usedBy.some(id => id.toString() === userId.toString())) {
            return res.json({
                success: false,
                message: 'You have already used this coupon'
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
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
    }
};



// remove coupon

//====================================================================================================================================================

const removeCoupon = async (req, res) => {
    try {
        const { cartId, grandTotal } = req.body;

        console.log("gooo", grandTotal)

        const cart = await Cart.findById(cartId);

        if (!cart) {
            return res.json({
                success: false,
                message: 'Cart not found'
            });
        }


        cart.couponApplied = null;
        cart.discount = 0;
        cart.finalAmount = cart.totalAmount ||0;

        await cart.save();

        res.json({
            success: true,
            message: 'Coupon removed successfully',
            originalAmount: grandTotal
        });

    } catch (error) {
        console.error('Error removing coupon:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_ERROR });
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