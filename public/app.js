// Main Application Logic
let orderState = { idli: 0, dosa: 0, idliPrice: 25, dosaPrice: 25, paymentMethod: null };
let currentPage = 'home';
let currentCalendarDate = new Date();
let dashboardData = null;
let pendingVerificationEmail = null;

function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function navigateTo(page) {
  currentPage = page;
  window.location.hash = page;
  render();
}

function updateNav() {
  const user = API.getUser();
  const nl = document.getElementById('navLinks');
  if (!user) {
    nl.innerHTML = `<button class="nav-btn" onclick="navigateTo('login')">Login</button><button class="nav-btn btn-primary-nav" onclick="navigateTo('register')">Register</button>`;
  } else if (user.role === 'admin') {
    nl.innerHTML = `<button class="nav-btn" onclick="navigateTo('admin')">Dashboard</button><button class="nav-btn btn-logout" onclick="logout()">Logout</button>`;
  } else {
    nl.innerHTML = `<button class="nav-btn" onclick="navigateTo('order')">Order</button><button class="nav-btn" onclick="navigateTo('dashboard')">Dashboard</button><button class="nav-btn btn-logout" onclick="logout()">Logout</button>`;
  }
}

function render() {
  const mc = document.getElementById('mainContent');
  const user = API.getUser();
  let html = '';

  switch (currentPage) {
    case 'home': html = Pages.home(); break;
    case 'login': html = Pages.login(); break;
    case 'register': html = Pages.register(); break;
    case 'admin-login': html = Pages.adminLogin(); break;
    case 'forgot-password': html = Pages.forgotPassword(); break;
    case 'reset-password': html = Pages.resetPassword(); break;
    case 'verify-otp': html = Pages.verifyOtp(); break;
    case 'order':
      if (!user) return navigateTo('login');
      html = Pages.order(); break;
    case 'dashboard':
      if (!user) return navigateTo('login');
      html = Pages.dashboard(); break;
    case 'admin':
      if (!user || user.role !== 'admin') return navigateTo('admin-login');
      html = Pages.admin(); break;
    default: html = Pages.home();
  }

  mc.innerHTML = html;
  updateNav();

  // Post-render hooks
  if (currentPage === 'order') initOrderPage();
  if (currentPage === 'dashboard') loadDashboard();
  if (currentPage === 'admin') showAdminTab('overview');
}

// Auth handlers
async function handleLogin(e) {
  e.preventDefault();
  try {
    const email = document.getElementById('loginEmail').value;
    const data = await API.post('/auth/login', {
      email,
      password: document.getElementById('loginPassword').value
    });
    API.setToken(data.token);
    API.setUser(data.user);
    toast('Welcome back, ' + data.user.name + '!', 'success');
    navigateTo(data.user.role === 'admin' ? 'admin' : 'order');
  } catch (err) { 
    if (err.message.includes('verify your email')) {
      pendingVerificationEmail = document.getElementById('loginEmail').value;
      toast(err.message, 'warning');
      navigateTo('verify-otp');
    } else {
      toast(err.message, 'error'); 
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  try {
    const data = await API.post('/auth/register', {
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      phone: document.getElementById('regPhone').value,
      password: document.getElementById('regPassword').value
    });
    API.setToken(data.token);
    API.setUser(data.user);
    toast('Registration successful! Welcome, ' + data.user.name + '!', 'success');
    navigateTo('order');
  } catch (err) { toast(err.message, 'error'); }
}

async function handleVerifyOTP(e) {
  e.preventDefault();
  try {
    if (!pendingVerificationEmail) throw new Error("Email not found. Please try registering or logging in again.");
    const data = await API.post('/auth/verify-otp', {
      email: pendingVerificationEmail,
      otp: document.getElementById('verifyOtpInput').value
    });
    API.setToken(data.token);
    API.setUser(data.user);
    toast('Email verified successfully! Welcome!', 'success');
    navigateTo('order');
  } catch (err) { toast(err.message, 'error'); }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  try {
    const data = await API.post('/auth/login', {
      email: document.getElementById('adminEmail').value,
      password: document.getElementById('adminPassword').value
    });
    if (data.user.role !== 'admin') { toast('Not an admin account', 'error'); return; }
    API.setToken(data.token);
    API.setUser(data.user);
    toast('Welcome, Admin!', 'success');
    navigateTo('admin');
  } catch (err) { toast(err.message, 'error'); }
}

function logout() {
  API.clearToken();
  toast('Logged out', 'info');
  navigateTo('home');
}

async function handleForgotPassword(e) {
  e.preventDefault();
  try {
    const data = await API.post('/auth/forgot-password', {
      email: document.getElementById('forgotEmail').value
    });
    toast(data.message, 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function handleResetPassword(e) {
  e.preventDefault();
  try {
    // Extract token from URL
    const hashParts = window.location.hash.split('?');
    let token = '';
    if (hashParts.length > 1) {
      const urlParams = new URLSearchParams(hashParts[1]);
      token = urlParams.get('token');
    }
    
    if (!token) throw new Error('Invalid or missing reset token.');

    const data = await API.post('/auth/reset-password', {
      token: token,
      password: document.getElementById('resetPassword').value
    });
    toast(data.message, 'success');
    navigateTo('login');
  } catch (err) { toast(err.message, 'error'); }
}

// Order page
async function initOrderPage() {
  try {
    const prices = await API.get('/orders/prices');
    orderState.idliPrice = prices.idli_price;
    orderState.dosaPrice = prices.dosa_price;
    orderState.idli = 0; orderState.dosa = 0; orderState.paymentMethod = null;
    document.getElementById('idliPriceLabel').textContent = '₹' + prices.idli_price;
    document.getElementById('dosaPriceLabel').textContent = '₹' + prices.dosa_price;

    const status = await API.get('/orders/booking-status');
    const banner = document.getElementById('bookingBanner');
    banner.innerHTML = `<div class="booking-banner ${status.isOpen ? 'booking-open' : 'booking-closed'}">${status.isOpen ? '✅' : '🚫'} ${status.message}</div>`;

    // Check if Razorpay is configured
    const rzpKey = await API.get('/orders/razorpay-key');
    if (!rzpKey.razorpay_enabled) {
      const payOnline = document.getElementById('payOnline');
      if (payOnline) {
        payOnline.style.opacity = '0.5';
        payOnline.style.pointerEvents = 'none';
        payOnline.querySelector('.payment-option-desc').textContent = 'Coming Soon';
      }
    }

    updateOrderSummary();
  } catch (err) { toast(err.message, 'error'); }
}

function changeQty(item, delta) {
  orderState[item] = Math.max(0, orderState[item] + delta);
  document.getElementById(item + 'Qty').textContent = orderState[item];
  updateOrderSummary();
}

function updateOrderSummary() {
  const idliTotal = orderState.idli * orderState.idliPrice;
  const dosaTotal = orderState.dosa * orderState.dosaPrice;
  document.getElementById('idliSubtotal').textContent = '₹' + idliTotal;
  document.getElementById('dosaSubtotal').textContent = '₹' + dosaTotal;
  document.getElementById('orderTotal').textContent = '₹' + (idliTotal + dosaTotal);
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = !(orderState.paymentMethod && (orderState.idli > 0 || orderState.dosa > 0));
}

function selectPayment(method) {
  orderState.paymentMethod = method;
  document.getElementById('payOnline').classList.toggle('selected', method === 'online');
  document.getElementById('payLater').classList.toggle('selected', method === 'pay_later');
  updateOrderSummary();
}

async function placeOrder() {
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    if (orderState.paymentMethod === 'online') {
      // Razorpay online payment flow
      await handleRazorpayPayment();
    } else {
      // Pay later (credit) flow
      const data = await API.post('/orders', {
        idli_qty: orderState.idli, dosa_qty: orderState.dosa,
        payment_method: 'pay_later'
      });
      toast(data.message, 'success');
      navigateTo('dashboard');
    }
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Proceed & Confirm Order';
  }
}

async function handleRazorpayPayment() {
  // Step 1: Create Razorpay order on backend
  const orderData = await API.post('/orders/create-razorpay-order', {
    idli_qty: orderState.idli,
    dosa_qty: orderState.dosa
  });

  // Step 2: Get Razorpay key
  const keyData = await API.get('/orders/razorpay-key');

  // Step 3: Open Razorpay checkout popup
  const options = {
    key: keyData.key_id,
    amount: orderData.amount,
    currency: orderData.currency,
    name: 'Batter Shop',
    description: `Order #${orderData.order_id} - Idli: ${orderState.idli}, Dosa: ${orderState.dosa}`,
    order_id: orderData.razorpay_order_id,
    prefill: {
      name: orderData.customer.name,
      email: orderData.customer.email,
      contact: orderData.customer.phone
    },
    theme: {
      color: '#667eea'
    },
    handler: async function(response) {
      // Step 4: Verify payment on backend
      try {
        const verifyData = await API.post('/orders/verify-payment', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          order_id: orderData.order_id
        });
        toast(verifyData.message, 'success');
        navigateTo('dashboard');
      } catch (err) {
        toast('Payment verification failed: ' + err.message, 'error');
        const btn = document.getElementById('placeOrderBtn');
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed & Confirm Order'; }
      }
    },
    modal: {
      ondismiss: function() {
        toast('Payment cancelled. Your order is saved — you can retry.', 'info');
        const btn = document.getElementById('placeOrderBtn');
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed & Confirm Order'; }
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.on('payment.failed', function(response) {
    toast('Payment failed: ' + (response.error.description || 'Please try again'), 'error');
    const btn = document.getElementById('placeOrderBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Proceed & Confirm Order'; }
  });
  rzp.open();
}

// Customer dashboard
async function loadDashboard() {
  try {
    const data = await API.get('/orders/dashboard');
    dashboardData = data;
    const s = data.summary;
    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card primary"><div class="stat-icon">📦</div><div class="stat-value">${s.total_orders}</div><div class="stat-label">Total Orders</div></div>
      <div class="stat-card success"><div class="stat-icon">💰</div><div class="stat-value">₹${s.total_paid}</div><div class="stat-label">Total Paid</div></div>
      <div class="stat-card danger"><div class="stat-icon">⏳</div><div class="stat-value">₹${s.pending_balance}</div><div class="stat-label">Pending Balance</div></div>
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">₹${s.total_spent}</div><div class="stat-label">Total Ordered</div></div>`;

    if (data.recent_orders.length) {
      let rows = data.recent_orders.map(o => `<tr><td>#${o.id}</td><td>${o.idli_qty} idli, ${o.dosa_qty} dosa</td><td>₹${o.total_amount}</td>
        <td><span class="badge ${o.payment_status==='paid'?'badge-success':'badge-warning'}">${o.payment_status}</span></td>
        <td><span class="badge badge-info">${o.order_status}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td></tr>`).join('');
      document.getElementById('dashOrders').innerHTML = `<table class="data-table"><thead><tr><th>ID</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      document.getElementById('dashOrders').innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><p class="empty-text">No orders yet. Place your first order!</p></div>';
    }

    if (data.payment_history.length) {
      let prows = data.payment_history.map(p => `<tr><td><span class="badge ${p.payment_type==='debit'?'badge-success':'badge-warning'}">${p.payment_type==='debit'?'Paid':'Credit'}</span></td>
        <td>₹${p.amount}</td><td>${p.description||'-'}</td><td>${new Date(p.created_at).toLocaleDateString('en-IN')}</td></tr>`).join('');
      document.getElementById('dashPayments').innerHTML = `<table class="data-table"><thead><tr><th>Type</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead><tbody>${prows}</tbody></table>`;
    } else {
      document.getElementById('dashPayments').innerHTML = '<div class="empty-state"><span class="empty-icon">💳</span><p class="empty-text">No payment history</p></div>';
    }

    renderCalendar();
  } catch (err) { toast(err.message, 'error'); }
}

function changeMonth(delta) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  if (!dashboardData) return;
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  document.getElementById('calendarMonthLabel').textContent = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Group data by day
  const ordersByDay = {};
  const paymentsByDay = {};
  
  dashboardData.recent_orders.forEach(o => {
    const d = new Date(o.created_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const date = d.getDate();
      if (!ordersByDay[date]) ordersByDay[date] = [];
      ordersByDay[date].push(o);
    }
  });

  dashboardData.payment_history.forEach(p => {
    const d = new Date(p.created_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const date = d.getDate();
      if (!paymentsByDay[date]) paymentsByDay[date] = [];
      paymentsByDay[date].push(p);
    }
  });

  let html = '<div class="calendar-grid">';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(d => html += `<div class="calendar-day-header">${d}</div>`);

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const orders = ordersByDay[d] || [];
    const payments = paymentsByDay[d] || [];
    const isToday = isCurrentMonth && today.getDate() === d;
    const hasActivity = orders.length > 0 || payments.length > 0;
    
    let activityHtml = '';
    
    let dailyItems = 0;
    let dailyCost = 0;
    let hasPending = false;
    orders.forEach(o => { 
      dailyItems += o.idli_qty + o.dosa_qty; 
      dailyCost += o.total_amount; 
      if (o.payment_status !== 'paid') hasPending = true;
    });

    if (orders.length > 0) {
      if (hasPending) {
        activityHtml += `<span class="cal-badge" style="background:rgba(255,71,87,0.15);color:var(--danger)">🔴 ${dailyItems} Items (Unpaid)</span>`;
      } else {
        activityHtml += `<span class="cal-badge" style="background:rgba(46,213,115,0.15);color:var(--success)">✅ ${dailyItems} Items (Paid)</span>`;
      }
    }

    let dailyPaid = 0;
    let dailyCredit = 0;
    payments.forEach(p => { if(p.payment_type==='debit') dailyPaid += p.amount; else dailyCredit += p.amount; });
    
    if (dailyPaid > 0) activityHtml += `<span class="cal-badge paid">Paid ₹${dailyPaid}</span>`;

    html += `
      <div class="calendar-day ${hasActivity ? 'has-activity' : ''} ${isToday ? 'today' : ''}" 
           ${hasActivity ? `onclick="showDayDetails(${year}, ${month}, ${d})"` : ''}>
        <div class="calendar-date">${d}</div>
        ${activityHtml}
      </div>
    `;
  }
  html += '</div>';
  document.getElementById('calendarView').innerHTML = html;
}

function showDayDetails(year, month, day) {
  const dOrders = dashboardData.recent_orders.filter(o => { const d = new Date(o.created_at); return d.getDate()===day && d.getMonth()===month && d.getFullYear()===year; });
  const dPayments = dashboardData.payment_history.filter(p => { const d = new Date(p.created_at); return d.getDate()===day && d.getMonth()===month && d.getFullYear()===year && p.payment_type==='debit'; });

  let content = `<h3 style="margin-bottom:0.5rem">Activity for ${day}/${month+1}/${year}</h3>`;
  if (dOrders.length > 0) {
    content += '<h4 style="margin-top:1.5rem;color:var(--text-secondary)">🛍️ Items Bought</h4><ul style="margin-left:1.5rem;font-size:0.95rem;margin-top:0.5rem">';
    dOrders.forEach(o => {
      const isPaid = o.payment_status === 'paid';
      
      let dateInfo = `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem">Ordered: ${new Date(o.created_at).toLocaleDateString('en-IN')}`;
      if (isPaid && o.updated_at && o.updated_at !== o.created_at) {
        dateInfo += ` • Paid on: ${new Date(o.updated_at).toLocaleDateString('en-IN')}`;
      }
      dateInfo += `</div>`;
      
      content += `<li style="margin-bottom:1rem">
        <strong>${o.idli_qty} Idli, ${o.dosa_qty} Dosa</strong> (Total: ₹${o.total_amount}) 
        <span class="badge ${isPaid?'badge-success':'badge-danger'}" style="margin-left:0.5rem">${isPaid?'PAID':'UNPAID'}</span>
        ${dateInfo}
      </li>`;
    });
    content += '</ul>';
  }
  
  if (dPayments.length > 0) {
    content += '<h4 style="margin-top:1.5rem;color:var(--text-secondary)">💰 Money Paid</h4><ul style="margin-left:1.5rem;font-size:0.95rem;margin-top:0.5rem">';
    dPayments.forEach(p => {
      // Simplify descriptions if they contain confusing text
      let desc = p.description || 'Cash payment';
      if (desc.includes('Razorpay Payment')) desc = 'Online Payment';
      if (desc.includes('Payment received from')) desc = 'Cash Payment';
      let paymentDate = new Date(p.created_at).toLocaleDateString('en-IN');
      content += `<li style="margin-bottom:0.5rem"><strong>Paid ₹${p.amount}</strong> - ${desc} <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.3rem">(on ${paymentDate})</span></li>`;
    });
    content += '</ul>';
  }

  document.getElementById('dayDetailsView').innerHTML = `<div style="padding:1rem">${content}</div>`;
}

// Admin tab switching
async function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((t, i) => {
    t.classList.toggle('active', ['overview','orders','customers','prices'][i] === tab);
  });
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="spinner"></div>';

  try {
    if (tab === 'overview') {
      const d = await API.get('/admin/dashboard');
      content.innerHTML = renderAdminOverview(d);
    } else if (tab === 'orders') {
      const d = await API.get('/admin/orders');
      content.innerHTML = renderAdminOrders(d.orders);
    } else if (tab === 'customers') {
      const d = await API.get('/admin/customers');
      content.innerHTML = renderAdminCustomers(d.customers);
    } else if (tab === 'prices') {
      content.innerHTML = renderPricesTab();
      const prices = await API.get('/orders/prices');
      document.getElementById('newIdliPrice').value = prices.idli_price;
      document.getElementById('newDosaPrice').value = prices.dosa_price;
    }
  } catch (err) { toast(err.message, 'error'); }
}

async function updateOrderStatus(id, status) {
  try {
    await API.put('/admin/orders/' + id + '/status', { status });
    toast('Status updated', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

function showPaymentModal(userId, name, pending) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal-content">
    <div class="modal-header"><h3>Record Payment - ${name}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <p style="color:var(--text-secondary);margin-bottom:1rem">Pending: <strong style="color:var(--danger)">₹${pending}</strong></p>
    <div class="form-group"><label class="form-label">Amount (₹)</label><input class="form-input" type="number" id="payAmount" value="${pending}" min="1" max="${pending}"></div>
    <div class="form-group"><label class="form-label">Description</label><input class="form-input" type="text" id="payDesc" placeholder="e.g. Cash payment"></div>
    <button class="btn btn-success btn-block" onclick="recordPayment('${userId}')">Record Payment</button>
  </div>`;
  document.body.appendChild(overlay);
}

async function recordPayment(userId) {
  try {
    const data = await API.post('/admin/payments', {
      user_id: userId,
      amount: parseFloat(document.getElementById('payAmount').value),
      description: document.getElementById('payDesc').value
    });
    toast(data.message, 'success');
    document.querySelector('.modal-overlay')?.remove();
    showAdminTab('customers');
  } catch (err) { toast(err.message, 'error'); }
}

async function updatePrices() {
  try {
    await API.put('/admin/settings/prices', {
      idli_price: parseFloat(document.getElementById('newIdliPrice').value),
      dosa_price: parseFloat(document.getElementById('newDosaPrice').value)
    });
    toast('Prices updated!', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

// Router
window.addEventListener('hashchange', () => {
  currentPage = window.location.hash.slice(1).split('?')[0] || 'home';
  render();
});

// Init
(function init() {
  currentPage = window.location.hash.slice(1).split('?')[0] || 'home';
  const user = API.getUser();
  if (user && currentPage === 'home') {
    currentPage = user.role === 'admin' ? 'admin' : 'order';
  }
  render();
})();
