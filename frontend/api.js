const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : window.location.origin;

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('trendoraToken');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...(options.headers || {})
        },
        ...options
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}`);
    }

    return data;
}

function getCustomer() {
    const saved = localStorage.getItem('trendoraCustomer');
    return saved ? JSON.parse(saved) : null;
}

function saveCustomer(customer, token) {
    localStorage.setItem('trendoraCustomer', JSON.stringify(customer));
    if (token) {
        localStorage.setItem('trendoraToken', token);
    }
}

function logoutCustomer() {
    localStorage.removeItem('trendoraCustomer');
    localStorage.removeItem('trendoraToken');
    window.location.href = '/';
}

function money(value) {
    return `${Number(value || 0).toLocaleString()} FCFA`;
}

// ─── Toast System (replaces alert()) ───
function showToast(message, type = 'success', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; top: 80px; right: 20px; z-index: 9999;
            display: flex; flex-direction: column; gap: 10px; pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: '#22c55e', icon: '✓' },
        error:   { bg: '#ef4444', icon: '✕' },
        info:    { bg: '#6B3FA0', icon: 'ℹ' },
        warning: { bg: '#F27F1B', icon: '⚠' },
    };
    const { bg, icon } = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${bg}; color: white; padding: 12px 18px; border-radius: 10px;
        font-size: 0.9rem; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        display: flex; align-items: center; gap: 10px; pointer-events: all;
        animation: slideInRight 0.3s ease; max-width: 320px; line-height: 1.4;
        cursor: pointer;
    `;
    toast.innerHTML = `<span style="font-size:1.1rem">${icon}</span><span>${message}</span>`;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);

    // Inject keyframes once
    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes slideInRight { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
            @keyframes fadeOut { from { opacity:1; } to { opacity:0; transform:translateY(-10px); } }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Override window.alert with toast
window.alert = (msg) => showToast(String(msg), 'info');

function productImage(product, index = 0) {
    // Use DB image_url if available (may be relative path from /pages/)
    if (product.image_url) {
        // Convert relative path to absolute from current page location
        let url = product.image_url;
        if (url.startsWith('../src/')) url = url.replace('../src/', '/src/');
        return url;
    }
    if (Array.isArray(product.images) && product.images[index]) return product.images[index];

    // Smart fallback: match image based on product name and category keywords
    const name = (product.prod_name || product.name || '').toLowerCase();
    const cat  = (product.cat_name || '').toLowerCase();

    // Specific product names matching
    if (name.includes('ankara')) return '/src/ankara_dress.png';
    if (name.includes('sandal')) return '/src/sandals.png';
    if (name.includes('moisturizer') || name.includes('shea butter')) return '/src/moisturizer.png';
    if (name.includes('hair serum') || name.includes('argan oil') || name.includes('oil') || name.includes('cleanser') || name.includes('lotion')) return '/src/moisturizer.png';
    if (name.includes('polo')) return '/src/polo_shirt.png';
    if (name.includes('jogger')) return '/src/jogger_pants.png';
    if (name.includes('belt')) return '/src/belt.png';

    // General categories / names matching
    if (name.includes('jean') || name.includes('denim') || name.includes('trouser') || name.includes('pant') || name.includes('chino') || name.includes('cargo')) {
        return '/src/jeans.png';
    }
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || name.includes('pump') || name.includes('heel') || cat.includes('shoe')) {
        return '/src/shoe.png';
    }
    if (name.includes('dress') || name.includes('skirt') || name.includes('gown') || name.includes('blouse') || name.includes('wrap top') || name.includes('night dress')) {
        return '/src/dress.png';
    }
    if (name.includes('watch') || name.includes('accessory') || name.includes('necklace') || name.includes('sunglasses') || name.includes('handbag') || name.includes('tote') || cat.includes('watch') || cat.includes('accessory')) {
        return '/src/watch.png';
    }
    if (name.includes('jacket') || name.includes('coat') || name.includes('blazer')) {
        return '/src/jacket.png';
    }
    if (name.includes('hoodie') || name.includes('hoody') || name.includes('sweat') || name.includes('shirt') || name.includes('t-shirt') || name.includes('top')) {
        return '/src/hoodie.png';
    }

    if (cat.includes('shoe'))    return '/src/shoe.png';
    if (cat.includes('watch'))   return '/src/watch.png';
    if (cat.includes('women'))   return '/src/dress.png';
    if (cat.includes('men'))     return '/src/hoodie.png';
    if (cat.includes('beauty') || cat.includes('cosmetics')) return '/src/moisturizer.png';

    // Last resort: cycle through available images
    const allImages = ['/src/shoe.png', '/src/hoodie.png', '/src/dress.png', '/src/watch.png', '/src/jacket.png', '/src/jeans.png', '/src/moisturizer.png'];
    return allImages[index % allImages.length];
}

// --- Global Components Injector ---
document.addEventListener('DOMContentLoaded', () => {
    const customer = getCustomer();
    if (!customer) return; // Don't inject if not logged in
    
    // Inject Notification Bell into navbar if it doesn't have one
    const iconsContainer = document.querySelector('.navbar .icons');
    if (iconsContainer && !document.getElementById('notification-count')) {
        const bellIcon = document.createElement('i');
        bellIcon.className = 'fa fa-bell';
        bellIcon.title = 'Notifications';
        bellIcon.onclick = toggleNotifications;
        bellIcon.innerHTML = `<span class="badge" id="notification-count" style="display: none;">0</span>`;
        iconsContainer.insertBefore(bellIcon, iconsContainer.children[1]); 
    }

    // Inject Floating Support Button
    if (!document.querySelector('.support-fab')) {
        const fab = document.createElement('div');
        fab.className = 'support-fab';
        fab.innerHTML = '<i class="fa fa-headset"></i>';
        fab.onclick = toggleSupportModal;
        document.body.appendChild(fab);
    }

    // Inject Modals
    if (!document.getElementById('support-modal')) {
        const modalsContainer = document.createElement('div');
        modalsContainer.innerHTML = `
            <div id="notifications-dropdown" class="notifications-dropdown" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4 style="margin: 0;">Notifications</h4>
                    <button onclick="markAllNotificationsRead()" style="background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.75rem;">Mark all read</button>
                </div>
                <div id="notifications-list" class="notifications-list"></div>
            </div>
            <div id="support-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <span class="close-btn" onclick="toggleSupportModal()">&times;</span>
                    <h2>Customer Support</h2>
                    <div id="support-tickets"></div>
                    <h3 style="margin-top: 2rem;">Create New Ticket</h3>
                    <form id="support-form">
                        <input type="text" id="support-subject" placeholder="Subject" required style="width: 100%; margin-bottom: 10px; padding: 10px;" />
                        <textarea id="support-message" placeholder="Describe your issue..." required style="width: 100%; margin-bottom: 10px; padding: 10px; height: 100px;"></textarea>
                        <button type="submit" class="btn-primary" style="width: 100%; padding: 12px; background: var(--primary); color: white; border: none; border-radius: var(--radius-full); font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 5px;">Submit Ticket</button>
                    </form>
                </div>
            </div>
            <div id="policy-modal" class="modal-overlay" style="display: none; z-index: 2000;">
            <div class="modal-content" style="max-width: 600px;">
                <span class="close-btn" onclick="togglePolicyModal()">&times;</span>
                <h2>Return Policy for Trendora</h2>
                <div style="text-align: left; margin-top: 1rem; line-height: 1.6;">
                    <h4>Typical Return Process</h4>
                    <ol>
                        <li>Customer logs into their account.</li>
                        <li>Customer opens My Orders.</li>
                        <li>Customer selects an order.</li>
                        <li>Customer clicks Return Item.</li>
                        <li>Customer selects items and provides a return reason.</li>
                        <li>Customer obtains a return label or QR code.</li>
                        <li>Customer ships the package back.</li>
                    </ol>
                    <p><em>Refund is processed after inspection and approval.</em></p>
                    
                    <h4 style="margin-top: 1rem;">Return Conditions</h4>
                    <p>Returned items must:</p>
                    <ul>
                        <li>Be returned within the approved return period (one week).</li>
                        <li>Be unworn.</li>
                        <li>Be unwashed.</li>
                        <li>Be undamaged.</li>
                    </ul>
                    <p>Include original tags and packaging.</p>
                    
                    <h4 style="margin-top: 1rem;">Non-Returnable Items</h4>
                    <ul>
                        <li>Underwear</li>
                        <li>Jewelry</li>
                        <li>Cosmetics</li>
                        <li>Customized products</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalsContainer);

        document.getElementById('support-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subject = document.getElementById('support-subject').value;
            const message = document.getElementById('support-message').value;

            try {
                await apiRequest('/api/support', {
                    method: 'POST',
                    body: JSON.stringify({
                        customer_id: customer.customer_id,
                        subject,
                        message
                    })
                });
                alert('Ticket submitted successfully');
                document.getElementById('support-form').reset();
                loadSupportTickets();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // Load Data
    loadNotifications();
    loadSupportTickets();
});

let notificationsOpen = false;
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    notificationsOpen = !notificationsOpen;
    dropdown.style.display = notificationsOpen ? 'block' : 'none';
}

function toggleSupportModal() {
    const modal = document.getElementById('support-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

function togglePolicyModal() {
    const modal = document.getElementById('policy-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

async function loadNotifications() {
    const customer = getCustomer();
    if (!customer) return;
    try {
        const notifications = await apiRequest(`/api/notifications`);
        const unread = notifications.filter(n => !n.is_read);
        const countBadge = document.getElementById('notification-count');
        const list = document.getElementById('notifications-list');
        
        if (countBadge) {
            if (unread.length > 0) {
                countBadge.textContent = unread.length;
                countBadge.style.display = 'inline-block';
            } else {
                countBadge.style.display = 'none';
            }
        }

        if (list) {
            if (notifications.length === 0) {
                list.innerHTML = '<p style="padding: 1rem;">No notifications.</p>';
                return;
            }

            list.innerHTML = notifications.map(n => `
                <div class="notification-item ${n.is_read ? 'read' : 'unread'}" onclick="markNotificationRead('${n.notification_id}')">
                    <p>${n.message}</p>
                    <small>${new Date(n.created_at).toLocaleString()}</small>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to load notifications:', err);
    }
}

async function markNotificationRead(notifId) {
    try {
        await apiRequest(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
        loadNotifications();
    } catch (err) {
        console.error(err);
    }
}

async function markAllNotificationsRead() {
    try {
        const notifications = await apiRequest(`/api/notifications`);
        await Promise.all(notifications.filter(n => !n.is_read).map(n =>
            apiRequest(`/api/notifications/${n.notification_id}/read`, { method: 'PATCH' })
        ));
        loadNotifications();
    } catch (err) {
        console.error(err);
    }
}

async function loadSupportTickets() {
    const customer = getCustomer();
    if (!customer) return;
    try {
        const tickets = await apiRequest(`/api/support`);
        const ticketsDiv = document.getElementById('support-tickets');
        if (ticketsDiv) {
            if (tickets.length === 0) {
                ticketsDiv.innerHTML = '<p>You have no past tickets.</p>';
                return;
            }

            ticketsDiv.innerHTML = tickets.map(t => `
                <div class="ticket-card">
                    <strong>${t.subject}</strong> <span class="badge ${t.status}">${t.status}</span>
                    <p>${t.message}</p>
                    ${t.admin_response ? `<div class="admin-response"><strong>Admin:</strong> ${t.admin_response}</div>` : ''}
                    <small>${new Date(t.created_at).toLocaleString()}</small>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to load tickets:', err);
    }
}
