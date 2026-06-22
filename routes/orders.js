const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Setting = require('../models/Setting');
const User = require('../models/User');
const { authenticate, isBookingOpen } = require('../middleware');
const { sendOrderNotification } = require('../email');

const router = express.Router();

// Razorpay (optional — only if keys are configured)
let Razorpay, razorpay;
try {
  Razorpay = require('razorpay');
} catch (e) { /* razorpay not installed */ }

function getRazorpay() {
  if (!razorpay && Razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
      && process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id') {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// Helper: get price from settings
async function getPrice(key, fallback = 25) {
  const setting = await Setting.findOne({ key });
  return parseFloat(setting?.value || fallback);
}

// Get current prices
router.get('/prices', async (req, res) => {
  try {
    const idliPrice = await getPrice('idli_price');
    const dosaPrice = await getPrice('dosa_price');
    res.json({ idli_price: idliPrice, dosa_price: dosaPrice });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch prices.' }); }
});

// Get Razorpay key for frontend (empty string if not configured)
router.get('/razorpay-key', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const isConfigured = keyId && keyId !== 'your_razorpay_key_id';
  res.json({ key_id: isConfigured ? keyId : '', razorpay_enabled: isConfigured });
});

// Check booking status
router.get('/booking-status', (req, res) => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
  const istDate = new Date(istString);
  const h = istDate.getHours(), m = istDate.getMinutes();
  const t = h * 60 + m;
  const isOpen = t >= 20 * 60 || t <= 14 * 60;
  res.json({ isOpen, currentTime: `${h}:${String(m).padStart(2,'0')}`, bookingWindow: '8:00 PM - 2:00 PM',
    message: isOpen ? 'Booking is open! Place your order now.' : 'Booking is closed. Opens at 8:00 PM.' });
});

// Create Razorpay order (for online payment)
router.post('/create-razorpay-order', authenticate, isBookingOpen, async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) return res.status(400).json({ error: 'Online payments are not configured yet. Please use Pay Later.' });

    const { idli_qty, dosa_qty } = req.body;
    if ((!idli_qty && !dosa_qty) || (idli_qty === 0 && dosa_qty === 0)) {
      return res.status(400).json({ error: 'Please select at least one item.' });
    }

    const idliPrice = await getPrice('idli_price');
    const dosaPrice = await getPrice('dosa_price');
    const iq = parseInt(idli_qty) || 0, dq = parseInt(dosa_qty) || 0;
    const total = (iq * idliPrice) + (dq * dosaPrice);

    // Create order in DB with status 'payment_pending'
    const order = await Order.create({
      user_id: req.user.id, idli_qty: iq, dosa_qty: dq,
      idli_price: idliPrice, dosa_price: dosaPrice, total_amount: total,
      payment_status: 'payment_pending', payment_method: 'online', order_status: 'pending'
    });

    // Create Razorpay order (amount in paise)
    const rzpOrder = await rzp.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: `order_${order._id}`,
      notes: { order_id: String(order._id), customer_name: req.user.name, items: `Idli: ${iq}, Dosa: ${dq}` }
    });

    order.razorpay_order_id = rzpOrder.id;
    await order.save();

    const customer = await User.findById(req.user.id).select('name email phone');

    res.status(201).json({
      order_id: order._id,
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      customer: { name: customer.name, email: customer.email, phone: customer.phone }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// Verify Razorpay payment
router.post('/verify-payment', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return res.status(400).json({ error: 'Missing payment verification data.' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await Order.findByIdAndUpdate(order_id, { payment_status: 'failed', order_status: 'cancelled' });
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    // Payment verified
    const order = await Order.findByIdAndUpdate(order_id, {
      payment_status: 'paid', order_status: 'confirmed', razorpay_payment_id
    }, { new: true });

    await Payment.create({
      user_id: req.user.id, order_id: order._id, amount: order.total_amount,
      payment_type: 'debit', payment_method: 'online',
      description: `Razorpay Payment for Order #${order._id} (${razorpay_payment_id})`
    });

    const customer = await User.findById(req.user.id).select('name email phone');
    sendOrderNotification(order.toObject(), customer.toObject()).catch(console.error);

    res.json({
      message: 'Payment verified successfully! Order confirmed.',
      order: { id: order._id, idli_qty: order.idli_qty, dosa_qty: order.dosa_qty, total_amount: order.total_amount,
        payment_status: 'paid', payment_method: 'online', order_status: 'confirmed', razorpay_payment_id, created_at: order.createdAt }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// Place order (pay-later / credit)
router.post('/', authenticate, isBookingOpen, async (req, res) => {
  try {
    const { idli_qty, dosa_qty, payment_method } = req.body;
    if ((!idli_qty && !dosa_qty) || (idli_qty === 0 && dosa_qty === 0)) return res.status(400).json({ error: 'Please select at least one item.' });
    if (payment_method !== 'pay_later') return res.status(400).json({ error: 'For online payments, use the Razorpay checkout flow.' });

    const idliPrice = await getPrice('idli_price');
    const dosaPrice = await getPrice('dosa_price');
    const iq = parseInt(idli_qty) || 0, dq = parseInt(dosa_qty) || 0;
    const total = (iq * idliPrice) + (dq * dosaPrice);

    const order = await Order.create({
      user_id: req.user.id, idli_qty: iq, dosa_qty: dq,
      idli_price: idliPrice, dosa_price: dosaPrice, total_amount: total,
      payment_status: 'pending', payment_method: 'pay_later', order_status: 'confirmed'
    });

    await Payment.create({
      user_id: req.user.id, order_id: order._id, amount: total,
      payment_type: 'credit', payment_method: 'pay_later',
      description: `Credit for Order #${order._id} (Pay Later)`
    });

    const customer = await User.findById(req.user.id).select('name email phone');
    sendOrderNotification(order.toObject(), customer.toObject()).catch(console.error);

    res.status(201).json({
      message: 'Order placed on credit. Please pay later.',
      order: { id: order._id, idli_qty: iq, dosa_qty: dq, total_amount: total, payment_status: 'pending', payment_method: 'pay_later', order_status: 'confirmed', created_at: order.createdAt }
    });
  } catch (error) { console.error('Order error:', error); res.status(500).json({ error: 'Failed to place order.' }); }
});

// Get my orders
router.get('/my', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    res.json({ orders: orders.map(o => ({ ...o.toObject(), id: o._id, created_at: o.createdAt, updated_at: o.updatedAt })) });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch orders.' }); }
});

// Customer dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const uid = req.user.id;
    const totalOrders = await Order.countDocuments({ user_id: uid });
    const spentAgg = await Order.aggregate([{ $match: { user_id: require('mongoose').Types.ObjectId.createFromHexString(uid) } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }]);
    const totalSpent = spentAgg.length ? spentAgg[0].total : 0;

    const paidAgg = await Payment.aggregate([{ $match: { user_id: require('mongoose').Types.ObjectId.createFromHexString(uid), payment_type: 'debit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalPaid = paidAgg.length ? paidAgg[0].total : 0;

    const creditAgg = await Payment.aggregate([{ $match: { user_id: require('mongoose').Types.ObjectId.createFromHexString(uid), payment_type: 'credit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalCredit = creditAgg.length ? creditAgg[0].total : 0;

    const pending = totalCredit - totalPaid;
    const recentOrders = await Order.find({ user_id: uid }).sort({ createdAt: -1 });
    const paymentHistory = await Payment.find({ user_id: uid }).sort({ createdAt: -1 });

    res.json({
      summary: { total_orders: totalOrders, total_spent: totalSpent, total_paid: totalPaid, pending_balance: Math.max(0, pending), outstanding_amount: Math.max(0, pending) },
      recent_orders: recentOrders.map(o => ({ ...o.toObject(), id: o._id, created_at: o.createdAt })),
      payment_history: paymentHistory.map(p => {
        const obj = p.toObject();
        return { ...obj, id: obj._id, created_at: obj.createdAt,
          idli_qty: obj.order_id?.idli_qty || 0, dosa_qty: obj.order_id?.dosa_qty || 0 };
      }),
      daily_breakdown: []
    });
  } catch (error) { console.error('Dashboard error:', error); res.status(500).json({ error: 'Failed to fetch dashboard.' }); }
});

// Create Razorpay order for paying pending balance (no booking window restriction)
router.post('/pay-pending', authenticate, async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) return res.status(400).json({ error: 'Online payments are not configured yet.' });

    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid payment amount.' });

    // Calculate actual pending balance
    const uid = req.user.id;
    const ObjectId = require('mongoose').Types.ObjectId.createFromHexString(uid);

    const creditAgg = await Payment.aggregate([{ $match: { user_id: ObjectId, payment_type: 'credit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalCredit = creditAgg.length ? creditAgg[0].total : 0;

    const paidAgg = await Payment.aggregate([{ $match: { user_id: ObjectId, payment_type: 'debit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalPaid = paidAgg.length ? paidAgg[0].total : 0;

    const pendingBalance = Math.max(0, totalCredit - totalPaid);
    const payAmount = Math.min(parseFloat(amount), pendingBalance);

    if (payAmount <= 0) return res.status(400).json({ error: 'No pending balance to pay.' });

    // Create Razorpay order (amount in paise)
    const rzpOrder = await rzp.orders.create({
      amount: Math.round(payAmount * 100),
      currency: 'INR',
      receipt: `pending_${uid}_${Date.now()}`,
      notes: { user_id: uid, type: 'pending_balance_payment', amount: String(payAmount) }
    });

    const customer = await User.findById(uid).select('name email phone');

    res.json({
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      pay_amount: payAmount,
      customer: { name: customer.name, email: customer.email, phone: customer.phone }
    });
  } catch (error) {
    console.error('Pay pending error:', error);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// Verify payment for pending balance
router.post('/verify-pending-payment', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pay_amount } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !pay_amount) {
      return res.status(400).json({ error: 'Missing payment verification data.' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed.' });
    }

    const amount = parseFloat(pay_amount);

    // Record payment as debit
    await Payment.create({
      user_id: req.user.id, amount,
      payment_type: 'debit', payment_method: 'online',
      description: `Pending Balance Payment via Razorpay (${razorpay_payment_id})`
    });

    // Mark unpaid orders as paid (oldest first) up to the paid amount
    let remaining = amount;
    const unpaidOrders = await Order.find({ user_id: req.user.id, payment_status: 'pending', payment_method: 'pay_later' }).sort({ createdAt: 1 });
    for (const order of unpaidOrders) {
      if (remaining >= order.total_amount) {
        order.payment_status = 'paid';
        order.razorpay_payment_id = razorpay_payment_id;
        await order.save();
        remaining -= order.total_amount;
      } else {
        break;
      }
    }

    res.json({ message: `Payment of ₹${amount} received successfully! Your pending balance has been updated.` });
  } catch (error) {
    console.error('Verify pending payment error:', error);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

module.exports = router;
