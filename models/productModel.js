const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        
    },
    brand: { 
        type: String,
    },
    salesPrice: {
        type: Number,
        min: 0,
    },
    productOffer: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    stock: {
        type: Number,
        min: 0,
    },
    
    images: {
        type: [String], 
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    ratings: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isListed: {
        type: Boolean,
        default: false,
    },
});

const Products = mongoose.model('Products', productSchema);
module.exports = Products;
