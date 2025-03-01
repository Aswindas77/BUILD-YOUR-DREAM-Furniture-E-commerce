const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    minPurchase: {
        type: Number,
        required: true,
        min: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true,
        index: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    usedBy:[ {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
});

couponSchema.pre("save", function (next) {
    if (this.expiryDate <= this.startDate) {
        return next(new Error("Expiry date must be after start date"));
    }
    next();
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
