// Admin pages
Pages.admin = function() {
  return `<div class="page fade-in">
    <div class="page-header"><h1 class="page-title">🛡️ Admin Panel</h1><p class="page-subtitle">Manage orders, customers and payments</p></div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="showAdminTab('overview')">Overview</button>
      <button class="admin-tab" onclick="showAdminTab('orders')">Orders</button>
      <button class="admin-tab" onclick="showAdminTab('customers')">Customers</button>
      <button class="admin-tab" onclick="showAdminTab('prices')">Prices</button>
    </div>
    <div id="adminContent"><div class="spinner"></div></div>
  </div>`;
};

function renderAdminOverview(d) {
  const t = d.today;
  return `<div class="stats-grid">
    <div class="stat-card primary"><div class="stat-icon">📦</div><div class="stat-value">${t.orders}</div><div class="stat-label">Today's Total Orders</div></div>
    <div class="stat-card"><div class="stat-icon">🫘</div><div class="stat-value">${t.idli_packets}</div><div class="stat-label">Total Idli Packets Today</div></div>
    <div class="stat-card"><div class="stat-icon">🥞</div><div class="stat-value">${t.dosa_packets}</div><div class="stat-label">Total Dosa Packets Today</div></div>
    <div class="stat-card success"><div class="stat-icon">💰</div><div class="stat-value">₹${t.total_amount}</div><div class="stat-label">Total Amount Today</div></div>
    <div class="stat-card" style="border-color:rgba(46,213,115,0.3)"><div class="stat-icon">💳</div><div class="stat-value">₹${t.online_received}</div><div class="stat-label">Online Payment Received</div></div>
    <div class="stat-card danger"><div class="stat-icon">⏳</div><div class="stat-value">₹${t.pending_amount}</div><div class="stat-label">Pending (Pay Later)</div></div>
    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${t.new_customers}</div><div class="stat-label">New Customers Today</div></div>
    <div class="stat-card primary"><div class="stat-icon">👤</div><div class="stat-value">${t.total_customers}</div><div class="stat-label">Total Customers</div></div>
  </div>`;
}

function renderAdminOrders(orders) {
  if (!orders.length) return '<div class="empty-state"><span class="empty-icon">📦</span><p class="empty-text">No orders yet</p></div>';
  let rows = orders.map(o => `<tr>
    <td>#${o.id}</td><td>${o.customer_name}</td><td>${o.customer_phone}</td>
    <td>${o.idli_qty} idli, ${o.dosa_qty} dosa</td><td>₹${o.total_amount}</td>
    <td><span class="badge ${o.payment_status==='paid'?'badge-success':'badge-warning'}">${o.payment_status}</span></td>
    <td><select onchange="updateOrderStatus('${o.id}',this.value)" style="background:var(--bg-dark);color:var(--text-primary);border:1px solid var(--border-light);border-radius:6px;padding:4px 8px;font-size:0.8rem">
      ${['confirmed','preparing','ready','collected','cancelled'].map(s=>`<option value="${s}" ${o.order_status===s?'selected':''}>${s}</option>`).join('')}
    </select></td>
    <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
  </tr>`).join('');
  return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>ID</th><th>Customer</th><th>Phone</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderAdminCustomers(customers) {
  if (!customers.length) return '<div class="empty-state"><span class="empty-icon">👥</span><p class="empty-text">No customers yet</p></div>';
  let rows = customers.map(c => `<tr>
    <td>${c.name}</td><td>${c.email}</td><td>${c.phone}</td><td>${c.order_count}</td>
    <td><span class="badge ${c.pending_balance>0?'badge-danger':'badge-success'}">₹${c.pending_balance}</span></td>
    <td><button class="btn btn-sm btn-primary" onclick="showPaymentModal('${c.id}','${c.name}',${c.pending_balance})">Record Payment</button></td>
  </tr>`).join('');
  return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Pending</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderPricesTab() {
  return `<div class="card" style="max-width:400px">
    <h3 style="margin-bottom:1rem">Update Prices</h3>
    <div class="form-group"><label class="form-label">Idli Batter (₹)</label><input class="form-input" type="number" id="newIdliPrice" value="25" min="1"></div>
    <div class="form-group"><label class="form-label">Dosa Batter (₹)</label><input class="form-input" type="number" id="newDosaPrice" value="25" min="1"></div>
    <button class="btn btn-primary" onclick="updatePrices()">Save Prices</button>
  </div>`;
}
