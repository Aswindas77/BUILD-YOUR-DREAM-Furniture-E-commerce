const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 1
                },
                name: {
                    type: String,

                    trim: true
                },
                salesPrice: {
                    type: Number,
                    min: 0
                },
                productOffer: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100
                },
                maxQuantity: {
                    type: Number,
                    default: 5,
                    min: 1
                }
            }
        ],
        grandTotal: {
            type: Number,
            min: 0
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart
