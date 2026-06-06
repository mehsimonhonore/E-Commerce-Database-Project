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

checkoutBtn?.addEventListener('click', async () => {
    const address = addressInput.value.trim();
    const phone = paymentPhoneInput.value.trim();
    const method = paymentMethodSelect.value;

    if (!cartItems.length) {
        alert('Your cart is empty.');
        return;
    }

    if (!address) {
        alert('Please enter a delivery address.');
        addressInput.focus();
        return;
    }

    if (!phone) {
        alert('Please enter your payment phone number.');
        paymentPhoneInput.focus();
        return;
    }

    // Basic mobile money phone validation
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
        alert('Please enter a valid phone number (7-15 digits).');
        paymentPhoneInput.focus();
        return;
    }

    try {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing payment...';

        const result = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                customer_id: customer.customer_id,
                address_line: address,
                payment_method: method,
                coupon_code: appliedCoupon ? appliedCoupon.code : null
            })
        });

        alert(`Order ${result.order.order_number} placed successfully!`);
        window.location.href = 'orders.html';

    } catch (err) {
        alert(err.message);
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Proceed to Checkout';
    }
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
