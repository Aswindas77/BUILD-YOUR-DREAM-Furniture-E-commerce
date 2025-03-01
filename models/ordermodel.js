const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  

  },
  couponCode:{
    type: String,
  },
  addressId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Address',
    required:true
  }, 
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', 
 
    },
    quantity: {
      type: Number,

      min: [1, 'Quantity must be at least 1'], 
    },
    price: {
      type: Number,

    }
  }],
  billingAddress: {
    name: { type: String },
    country: { type: String },
    street: { type: String },
    city: { type: String }, 
    state: { type: String },
    postcode: { type: String },
    phone: { type: String },
  },
  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  totalAmount: {
    type: Number,


    min: [0, 'Total amount cannot be negative'], 
  },

  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Processing'],
    default: 'Pending',
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Wallet', 'paypal', 'Cash on Delivery', 'razorpay'],

  },
  shippingDetails: {
    origin: { type: String, default: "India" },
    estimatedArrival: { type: Date, default: new Date('2025-02-15') },
    actualArrival: { type: Date, default: null },
    status: { type: String, enum: ['Pending', 'Shipped', 'Cancelled','Processing', 'Delivered'], default: 'Pending' },
  }
}, {
  timestamps: true, 
});


module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);