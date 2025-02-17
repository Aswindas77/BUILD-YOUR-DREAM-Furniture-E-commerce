const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  transId: { type: String,   }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",  },
  method: { type: String, enum: [ "Wallet", "razorpay","paypal", "Cash on Delivery"],   }, 
  status: { type: String, enum: ["pending", "completed", "failed"],  }, 
  amount: { type: Number,  },
  type: { type: String, enum: ["credit", "debit"], required: true, }
}, {
  timestamps: true
});

module.exports = mongoose.model("payments", paymentSchema);
