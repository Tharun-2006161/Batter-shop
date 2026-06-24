const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { authenticate, isAdmin } = require('../middleware');

const router = express.Router();
router.use(authenticate, isAdmin);

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
    const todayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total_amount' }, idli: { $sum: '$idli_qty' }, dosa: { $sum: '$dosa_qty' } } }
    ]);
    const td = todayAgg[0] || { total: 0, idli: 0, dosa: 0 };

    const creditAgg = await Payment.aggregate([{ $match: { payment_type: 'credit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
    const debitAgg = await Payment.aggregate([{ $match: { payment_type: 'debit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
    const totalCredit = creditAgg[0]?.t || 0;
    const totalPaid = debitAgg[0]?.t || 0;
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const allAgg = await Order.aggregate([{ $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total_amount' } } }]);
    const all = allAgg[0] || { count: 0, total: 0 };

    res.json({
      today: { orders: todayOrders, revenue: td.total, idli_packets: td.idli, dosa_packets: td.dosa },
      overall: { total_orders: all.count, total_revenue: all.total, total_customers: totalCustomers, total_pending: Math.max(0, totalCredit - totalPaid), total_collected: totalPaid }
    });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to fetch admin dashboard.' }); }
});

router.get('/orders', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.order_status = req.query.status;
    if (req.query.payment_status) filter.payment_status = req.query.payment_status;
    if (req.query.date) {
      const d = new Date(req.query.date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.createdAt = { $gte: d, $lt: next };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user_id', 'name email phone');
    res.json({
      orders: orders.map(o => {
        const obj = o.toObject();
        return { ...obj, id: obj._id, created_at: obj.createdAt, updated_at: obj.updatedAt,
          customer_name: obj.user_id?.name || 'Unknown', customer_email: obj.user_id?.email || '', customer_phone: obj.user_id?.phone || '' };
      })
    });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to fetch orders.' }); }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const valid = ['confirmed','preparing','ready','collected','cancelled'];
    if (!valid.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
    await Order.findByIdAndUpdate(req.params.id, { order_status: req.body.status });
    res.json({ message: 'Order status updated.' });
  } catch (error) { res.status(500).json({ error: 'Failed to update order status.' }); }
});

router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ name: 1 });
    const result = await Promise.all(customers.map(async (c) => {
      const orderCount = await Order.countDocuments({ user_id: c._id });
      const crAgg = await Payment.aggregate([{ $match: { user_id: c._id, payment_type: 'credit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
      const paAgg = await Payment.aggregate([{ $match: { user_id: c._id, payment_type: 'debit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
      const tc = crAgg[0]?.t || 0, tp = paAgg[0]?.t || 0;
      return { id: c._id, name: c.name, email: c.email, phone: c.phone, created_at: c.createdAt, order_count: orderCount, total_credit: tc, total_paid: tp, pending_balance: Math.max(0, tc - tp) };
    }));
    res.json({ customers: result });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to fetch customers.' }); }
});

router.post('/payments', async (req, res) => {
  try {
    const { user_id, amount, description } = req.body;
    if (!user_id || !amount || amount <= 0) return res.status(400).json({ error: 'Valid user_id and amount required.' });
    const customer = await User.findOne({ _id: user_id, role: 'customer' });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    await Payment.create({ user_id, amount, payment_type: 'debit', payment_method: 'cash', description: description || `Payment received from ${customer.name}` });

    const oid = new mongoose.Types.ObjectId(user_id);
    const crAgg = await Payment.aggregate([{ $match: { user_id: oid, payment_type: 'credit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
    const paAgg = await Payment.aggregate([{ $match: { user_id: oid, payment_type: 'debit' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
    const remaining_balance = (crAgg[0]?.t || 0) - (paAgg[0]?.t || 0);

    // Apply the payment to oldest unpaid orders
    let remaining_to_apply = amount;
    const unpaidOrders = await Order.find({ user_id, payment_status: 'pending' }).sort({ createdAt: 1 });
    for (const order of unpaidOrders) {
      if (remaining_to_apply >= order.total_amount) {
        order.payment_status = 'paid';
        await order.save();
        remaining_to_apply -= order.total_amount;
      } else {
        break;
      }
    }

    res.json({ message: `Payment of ₹${amount} recorded for ${customer.name}.`, new_balance: Math.max(0, remaining_balance) });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to record payment.' }); }
});

router.put('/settings/prices', async (req, res) => {
  try {
    if (req.body.idli_price !== undefined) await Setting.findOneAndUpdate({ key: 'idli_price' }, { value: String(req.body.idli_price) }, { upsert: true });
    if (req.body.dosa_price !== undefined) await Setting.findOneAndUpdate({ key: 'dosa_price' }, { value: String(req.body.dosa_price) }, { upsert: true });
    res.json({ message: 'Prices updated successfully.' });
  } catch (error) { res.status(500).json({ error: 'Failed to update prices.' }); }
});

module.exports = router;
