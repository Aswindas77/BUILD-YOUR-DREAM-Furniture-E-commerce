const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order', 
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  
        required: true
    },
    returnStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Refunded'],
        default: 'Pending'
    },
    returnDate: {
        type: Date,
        default: Date.now
    },
    processedDate: {
        type: Date
    },
    adminRemarks: {
        type: String,
        Boolean:false
    },
    description: {
        type: String,
        required: false 
    }, 
    reason: {
        type: String,
        enum: ['damaged', 'quality', 'wrong_item', 'Other'], 
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
