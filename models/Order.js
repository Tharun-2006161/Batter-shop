const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  idli_qty: {
    type: Number,
    default: 0
  },
  dosa_qty: {
    type: Number,
    default: 0
  },
  idli_price: {
    type: Number,
    required: true
  },
  dosa_price: {
    type: Number,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'payment_pending', 'failed'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['online', 'pay_later'],
    default: 'pay_later'
  },
  order_status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'collected', 'cancelled'],
    default: 'confirmed'
  },
  razorpay_order_id: {
    type: String,
    default: null
  },
  razorpay_payment_id: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
