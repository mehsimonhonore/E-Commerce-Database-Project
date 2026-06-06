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

function productImage(product, index = 0) {
    if (product.image_url) return product.image_url;
    if (Array.isArray(product.images) && product.images[index]) return product.images[index];

    const localImages = [
        'pho_01.png',
        'pho_02.png',
        'shoe.png',
        'cacao.png',
        'camera.png',
        'something.png',
        'lamp.png',
        'bt.png'
    ];
    return `../src/${localImages[index % localImages.length]}`;
}
