const cartList = document.getElementById('cart-list');
const itemCountLabel = document.getElementById('item-count-label');
const subtotalAmount = document.getElementById('subtotal-amount');
const taxAmount = document.getElementById('tax-amount');
const totalAmountLabel = document.getElementById('total-amount');
const cartCountBadge = document.getElementById('cart-count');

const promoCodeInput = document.getElementById('promo-code');
const applyPromoBtn = document.getElementById('apply-promo-btn');
const promoStatus = document.getElementById('promo-status');

const addressInput = document.getElementById('shipping-address');
const paymentMethodSelect = document.getElementById('payment-method');
const paymentPhoneInput = document.getElementById('payment-phone');
const checkoutBtn = document.getElementById('checkout-btn');

const customer = getCustomer();
let cartItems = [];

// Coupon state
let appliedCoupon = null;

if (!customer) {
    window.location.href = '../index.html';
}

async function loadCart() {
    try {
        cartItems = await apiRequest(`/api/cart/${customer.customer_id}`);
        renderCart();
        updateCartBadge();
    } catch (err) {
        cartList.innerHTML = `<p class="empty-state">Failed to load cart: ${err.message}</p>`;
    }
}

function updateCartBadge() {
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountBadge) cartCountBadge.textContent = count;
    if (itemCountLabel) itemCountLabel.textContent = `${count} item${count !== 1 ? 's' : ''} in your cart`;
}

function renderCart() {
    if (!cartItems.length) {
        cartList.innerHTML = '<p class="empty-state">Your shopping cart is empty.</p>';
        subtotalAmount.textContent = '0 FCFA';
        taxAmount.textContent = '0 FCFA';
        totalAmountLabel.textContent = '0 FCFA';
        return;
    }

    cartList.innerHTML = cartItems.map(item => `
        <div class="cart-item" data-item-id="${item.cart_item_id}">
            <img src="${productImage(item)}" alt="${item.prod_name}" />
            <div class="item-details">
                <h3>${item.prod_name}</h3>
                <p class="brand">${item.vendor_name || 'Trendora'}</p>
                <p class="variant">
                    ${item.prod_size ? `Size: ${item.prod_size}` : ''} 
                    ${item.prod_color ? `Color: ${item.prod_color}` : ''}
                </p>
            </div>
            <div class="item-price">${money(item.prod_price)}</div>
            <div class="quantity">
                <button type="button" class="minus" data-action="minus">-</button>
                <input type="number" value="${item.quantity}" min="1" max="10" readonly />
                <button type="button" class="plus" data-action="plus">+</button>
            </div>
            <div class="item-total">${money(parseFloat(item.prod_price) * item.quantity)}</div>
            <button type="button" class="remove" data-action="remove"><i class="fa fa-times"></i></button>
        </div>
    `).join('');

    calculateTotals();
}

function calculateTotals() {
    let subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.prod_price) * item.quantity), 0);
    let discount = 0;

    if (appliedCoupon) {
        if (subtotal >= appliedCoupon.minimum_order_amount) {
            if (appliedCoupon.discount_type === 'percentage') {
                discount = subtotal * (appliedCoupon.discount_value / 100);
            } else {
                discount = appliedCoupon.discount_value;
            }
            promoStatus.style.color = 'var(--green)';
            promoStatus.textContent = `Coupon applied! Saved ${money(discount)}.`;
            promoStatus.style.display = 'block';
        } else {
            appliedCoupon = null;
            promoStatus.style.color = 'var(--red)';
            promoStatus.textContent = `Coupon requires a minimum order of ${money(appliedCoupon.minimum_order_amount)}.`;
            promoStatus.style.display = 'block';
        }
    }

    let taxableSubtotal = Math.max(0, subtotal - discount);
    let tax = taxableSubtotal * 0.10;
    let total = taxableSubtotal + tax;

    subtotalAmount.textContent = money(subtotal);
    taxAmount.textContent = money(tax);
    totalAmountLabel.textContent = money(total);
}

cartList.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const cartItemEl = target.closest('.cart-item');
    if (!cartItemEl) return;

    const cartItemId = cartItemEl.dataset.itemId;
    const item = cartItems.find(i => i.cart_item_id === cartItemId);
    if (!item) return;

    const action = target.dataset.action;

    try {
        if (action === 'minus') {
            if (item.quantity > 1) {
                await updateQuantity(cartItemId, item.quantity - 1);
            }
        } else if (action === 'plus') {
            if (item.quantity < 10) {
                await updateQuantity(cartItemId, item.quantity + 1);
            } else {
                alert('Maximum purchase limit per item is 10.');
            }
        } else if (action === 'remove') {
            if (confirm('Are you sure you want to remove this item?')) {
                await apiRequest(`/api/cart/item/${cartItemId}`, { method: 'DELETE' });
                await loadCart();
            }
        }
    } catch (err) {
        alert(err.message);
    }
});

async function updateQuantity(cartItemId, newQty) {
    await apiRequest(`/api/cart/item/${cartItemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: newQty })
    });
    await loadCart();
}

applyPromoBtn?.addEventListener('click', async () => {
    const code = promoCodeInput.value.trim();
    if (!code) {
        promoStatus.style.color = 'var(--red)';
        promoStatus.textContent = 'Please enter a coupon code.';
        promoStatus.style.display = 'block';
        return;
    }

    try {
        const coupon = await apiRequest(`/api/orders/coupon/${code}`);
        appliedCoupon = coupon;
        calculateTotals();
    } catch (err) {
        appliedCoupon = null;
        promoStatus.style.color = 'var(--red)';
        promoStatus.textContent = err.message;
        promoStatus.style.display = 'block';
        calculateTotals();
    }
});

// ─── Payment Simulator Flow ───
const paymentModal = document.getElementById('payment-modal');
const inputStage = document.getElementById('payment-input-stage');
const processingStage = document.getElementById('payment-processing-stage');
const successStage = document.getElementById('payment-success-stage');
const providerLogo = document.getElementById('payment-provider-logo');

const modalAmount = document.getElementById('modal-payment-amount');
const modalPhone = document.getElementById('modal-payment-phone');
const pinInput = document.getElementById('momo-pin');
const statusText = document.getElementById('payment-status-text');

const momoCancelBtn = document.getElementById('momo-cancel-btn');
const momoConfirmBtn = document.getElementById('momo-confirm-btn');
const momoSuccessDone = document.getElementById('momo-success-done');

let checkoutData = null;

checkoutBtn?.addEventListener('click', () => {
    const address = addressInput.value.trim();
    const phone = paymentPhoneInput.value.trim();
    const method = paymentMethodSelect.value;

    if (!cartItems.length) {
        showToast('Your cart is empty.', 'error');
        return;
    }

    if (!address) {
        showToast('Please enter a delivery address.', 'warning');
        addressInput.focus();
        return;
    }

    if (!phone) {
        showToast('Please enter your payment phone number.', 'warning');
        paymentPhoneInput.focus();
        return;
    }

    // Basic mobile money phone validation
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
        showToast('Please enter a valid phone number (7-15 digits).', 'warning');
        paymentPhoneInput.focus();
        return;
    }

    // Store data for submission
    checkoutData = { address, phone, method };

    // Setup modal logo & branding
    if (method === 'MTN_MOMO') {
        providerLogo.innerHTML = `
            <div style="background: #FFCC00; color: #000; font-weight: 800; padding: 10px 20px; border-radius: 12px; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(255,204,0,0.3);">
                <span style="background: #000; color: #FFCC00; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.9rem;">MTN</span>
                MTN Mobile Money
            </div>
        `;
    } else {
        providerLogo.innerHTML = `
            <div style="background: #FF6600; color: #FFF; font-weight: 800; padding: 10px 20px; border-radius: 12px; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(255,102,0,0.3);">
                <i class="fa fa-mobile-screen-button"></i>
                Orange Money
            </div>
        `;
    }

    modalAmount.textContent = totalAmountLabel.textContent;
    modalPhone.textContent = phone;
    pinInput.value = '';

    // Show input stage and hide other stages
    inputStage.style.display = 'block';
    processingStage.style.display = 'none';
    successStage.style.display = 'none';
    
    // Display modal
    paymentModal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); align-items: center; justify-content: center; z-index: 3000; animation: fadeIn 0.2s ease;';
    pinInput.focus();
});

momoCancelBtn?.addEventListener('click', () => {
    paymentModal.style.display = 'none';
});

momoConfirmBtn?.addEventListener('click', handleMomoPayment);
pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleMomoPayment();
});

async function handleMomoPayment() {
    const pin = pinInput.value.trim();
    if (!pin || pin.length < 4) {
        showToast('Please enter a valid 4-digit PIN.', 'warning');
        pinInput.focus();
        return;
    }

    // Shift to processing stage
    inputStage.style.display = 'none';
    processingStage.style.display = 'block';

    try {
        // Step 1 simulation
        statusText.textContent = "Connecting to telecom operator gateway...";
        await new Promise(r => setTimeout(r, 1200));

        // Step 2 simulation
        statusText.textContent = `Pushing authorization notification to ${checkoutData.phone}...`;
        await new Promise(r => setTimeout(r, 1200));

        // Step 3 simulation
        statusText.textContent = "Verifying authentication PIN and wallet balance...";
        await new Promise(r => setTimeout(r, 1200));

        // Step 4: Actual API Order placement call
        statusText.textContent = "PIN Authorized! Placing secure order on Trendora...";
        
        const result = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                customer_id: customer.customer_id,
                address_line: checkoutData.address,
                payment_method: checkoutData.method,
                coupon_code: appliedCoupon ? appliedCoupon.code : null
            })
        });

        // Step 5: Finished
        processingStage.style.display = 'none';
        successStage.style.display = 'block';

    } catch (err) {
        showToast(err.message || 'Payment processing failed.', 'error');
        processingStage.style.display = 'none';
        inputStage.style.display = 'block';
    }
}

momoSuccessDone?.addEventListener('click', () => {
    paymentModal.style.display = 'none';
    window.location.href = 'orders.html';
});

// Search handler
const navSearch = document.getElementById('nav-search');
navSearch?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const query = navSearch.value.trim();
        if (query) {
            window.location.href = `home.html?search=${encodeURIComponent(query)}`;
        }
    }
});

// Pre-fill user phone number if available
if (customer && customer.phone_num) {
    paymentPhoneInput.value = customer.phone_num;
}

loadCart();
