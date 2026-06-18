// Order and Dashboard pages
Pages.order = function() {
  return `<div class="page fade-in">
    <div class="page-header"><h1 class="page-title">🛒 Place Order</h1><p class="page-subtitle">Select items and choose payment</p></div>
    <div id="bookingBanner"></div>
    <div class="order-grid">
      <div class="product-card"><span class="product-icon">🫘</span><h3 class="product-name">Idli Batter</h3><p class="product-price" id="idliPriceLabel">₹25</p>
        <div class="qty-control"><button class="qty-btn" onclick="changeQty('idli',-1)">−</button><span class="qty-value" id="idliQty">0</span><button class="qty-btn" onclick="changeQty('idli',1)">+</button></div></div>
      <div class="product-card"><span class="product-icon">🥞</span><h3 class="product-name">Dosa Batter</h3><p class="product-price" id="dosaPriceLabel">₹25</p>
        <div class="qty-control"><button class="qty-btn" onclick="changeQty('dosa',-1)">−</button><span class="qty-value" id="dosaQty">0</span><button class="qty-btn" onclick="changeQty('dosa',1)">+</button></div></div>
    </div>
    <div class="order-summary" id="orderSummary">
      <div class="summary-row"><span>Idli Batter</span><span id="idliSubtotal">₹0</span></div>
      <div class="summary-row"><span>Dosa Batter</span><span id="dosaSubtotal">₹0</span></div>
      <div class="summary-row"><span class="summary-total">Total</span><span class="summary-total" id="orderTotal">₹0</span></div>
    </div>
    <h3 style="margin-bottom:1rem;font-size:1rem">Payment Method</h3>
    <div class="payment-options">
      <div class="payment-option" id="payOnline" onclick="selectPayment('online')"><span class="payment-option-icon">💳</span><div class="payment-option-title">Pay via Razorpay</div><div class="payment-option-desc">UPI, Cards, Net Banking</div></div>
      <div class="payment-option" id="payLater" onclick="selectPayment('pay_later')"><span class="payment-option-icon">📋</span><div class="payment-option-title">Pay Later</div><div class="payment-option-desc">Order on credit</div></div>
    </div>
    <button class="btn btn-primary btn-block btn-lg" style="margin-top:1.5rem" onclick="placeOrder()" id="placeOrderBtn" disabled>Proceed & Confirm Order</button>
    <p style="text-align:center;margin-top:0.75rem;font-size:0.75rem;color:var(--text-secondary)">🔒 Online payments secured by Razorpay</p>
  </div>`;
};

Pages.dashboard = function() {
  return `<div class="page fade-in">
    <div class="page-header"><h1 class="page-title">📊 My Dashboard</h1><p class="page-subtitle">Your orders and payment summary</p></div>
    <div class="stats-grid" id="dashStats"><div class="spinner"></div></div>
    <div class="section-header" style="margin-top:2rem">
      <h3 class="section-title">📅 My Monthly Calendar</h3>
      <div style="display:flex;gap:1rem;align-items:center;">
        <button class="btn btn-sm btn-outline" onclick="changeMonth(-1)">← Prev</button>
        <span id="calendarMonthLabel" style="font-weight:bold;font-size:1.1rem"></span>
        <button class="btn btn-sm btn-outline" onclick="changeMonth(1)">Next →</button>
      </div>
    </div>
    <div id="calendarView" class="calendar-container"><div class="spinner"></div></div>

    <div class="section-header" style="margin-top:2rem"><h3 class="section-title">Recent Orders</h3></div>
    <div class="table-wrapper" id="dashOrders"><div class="spinner"></div></div>
    <div class="section-header" style="margin-top:2rem"><h3 class="section-title">Payment History</h3></div>
    <div class="table-wrapper" id="dashPayments"><div class="spinner"></div></div>
  </div>`;
};
