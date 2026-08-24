function getApiBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${window.location.origin}/api`;
    }
    return 'https://raphael-precipiced-lashunda.ngrok-free.dev/api';
}

function getWsBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${scheme}//${window.location.host}/ws`;
    }
    return 'wss://raphael-precipiced-lashunda.ngrok-free.dev/ws';
}

const API_BASE = getApiBaseUrl();
const WS_BASE = getWsBaseUrl();


class ApiClient {
    constructor() {
        this.password = localStorage.getItem('hbb_admin_pwd');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.password}`, // Basic auth implementation for now
            'ngrok-skip-browser-warning': '69420'
        };

        const config = {
            ...options,
            headers: { ...headers, ...options.headers }
        };

        const response = await fetch(`${API_BASE}${endpoint}`, config);

        if (response.status === 401) {
            localStorage.removeItem('hbb_admin_pwd');
            window.location.reload();
            return;
        }

        if (!response.ok) {
            let errorMsg = `${response.status} ${response.statusText}`;
            try {
                const errData = await response.json();
                if (errData && errData.detail) {
                    errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
                }
            } catch (e) { }
            throw new Error(errorMsg);
        }

        return response.json();
    }

    // Conversations
    async getConversations(search = '', before = null) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (before) params.set('before', before);
        const qs = params.toString();
        return this.request(`/conversations${qs ? '?' + qs : ''}`);
    }

    async getConversationThread(phone, before = null) {
        const query = before ? `?before=${encodeURIComponent(before)}` : '';
        return this.request(`/conversations/${encodeURIComponent(phone)}${query}`);
    }

    // Contacts
    async updateContact(phone, data) {
        return this.request(`/contacts/${encodeURIComponent(phone)}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async updateBookingDetails(conversationId, data) {
        return this.request(`/conversations/${encodeURIComponent(conversationId)}/booking`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async updateContactMode(phone, mode, reason = null) {
        return this.request(`/contacts/${encodeURIComponent(phone)}/mode`, {
            method: 'PATCH',
            body: JSON.stringify({ mode, reason })
        });
    }

    // Escalations
    async resolveEscalation(phone) {
        return this.request(`/escalations/${encodeURIComponent(phone)}/resolve`, {
            method: 'PATCH'
        });
    }

    // Commands
    async getCommands() {
        return this.request(`/commands`);
    }

    async executeCommand(command, phone, params) {
        return this.request(`/commands/execute`, {
            method: 'POST',
            body: JSON.stringify({ command, phone, params })
        });
    }

    async sendAdminReply(phone, text) {
        return this.request(`/admin-reply`, {
            method: 'POST',
            body: JSON.stringify({ phone, text })
        });
    }

    async getAdminCommandsConfig() {
        return this.request('/admin/commands');
    }

    async updateAdminCommand(id, data) {
        return this.request(`/admin/commands/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async resetHistory(phone) {
        return this.request('/admin-reset', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
    }

    // Bungalow Codes
    async getBungalows() {
        return this.request('/admin/bungalows');
    }

    async createBungalow(data) {
        return this.request('/admin/bungalows', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateBungalow(id, data) {
        return this.request(`/admin/bungalows/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteBungalow(id) {
        return this.request(`/admin/bungalows/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }

    // Push Notifications
    async getVapidPublicKey() {
        return this.request('/push/vapid-public-key');
    }

    async subscribePush(subData) {
        return this.request('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(subData)
        });
    }

    async unsubscribePush(endpoint) {
        return this.request('/push/unsubscribe', {
            method: 'POST',
            body: JSON.stringify({ endpoint })
        });
    }

    // Pricing Management
    async getPricingProperties() {
        return this.request('/admin/pricing/properties');
    }

    async updatePricingProperty(id, data) {
        return this.request(`/admin/pricing/properties/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async updatePricingRatePlan(id, data) {
        return this.request(`/admin/pricing/rate-plans/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getPricingTiers() {
        return this.request('/admin/pricing/tiers');
    }

    async getPricingSeasons() {
        return this.request('/admin/pricing/seasons');
    }

    async createPricingSeason(data) {
        return this.request('/admin/pricing/seasons', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePricingSeason(id, data) {
        return this.request(`/admin/pricing/seasons/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async createSeasonPeriod(data) {
        return this.request('/admin/pricing/season-periods', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateSeasonPeriod(id, data) {
        return this.request(`/admin/pricing/season-periods/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteSeasonPeriod(id) {
        return this.request(`/admin/pricing/season-periods/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }

    async getPricingMatrix() {
        return this.request('/admin/pricing/matrix');
    }

    async updatePricingMatrix(items) {
        return this.request('/admin/pricing/matrix', {
            method: 'PUT',
            body: JSON.stringify(items)
        });
    }

    async bulkAdjustPrices(data) {
        return this.request('/admin/pricing/matrix/bulk-adjust', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getPromotions() {
        return this.request('/admin/pricing/promotions');
    }

    async createPromotion(data) {
        return this.request('/admin/pricing/promotions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updatePromotion(id, data) {
        return this.request(`/admin/pricing/promotions/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deletePromotion(id) {
        return this.request(`/admin/pricing/promotions/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
    }

    async getPricingSettings() {
        return this.request('/admin/pricing/settings');
    }

    async updatePricingSettings(data) {
        return this.request('/admin/pricing/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async updateSinglePricingSetting(key, data) {
        return this.request(`/admin/pricing/settings/${encodeURIComponent(key)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Bookings API
    async getBookings(params = {}) {
        const query = new URLSearchParams();
        if (params.status) query.append('status', params.status);
        if (params.check_in_from) query.append('check_in_from', params.check_in_from);
        if (params.check_in_to) query.append('check_in_to', params.check_in_to);
        if (params.search) query.append('search', params.search);
        const qStr = query.toString() ? `?${query.toString()}` : '';
        return this.request(`/admin/bookings${qStr}`);
    }

    async getBooking(id) {
        return this.request(`/admin/bookings/${encodeURIComponent(id)}`);
    }

    async createBooking(data) {
        return this.request('/admin/bookings', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateBooking(id, data) {
        return this.request(`/admin/bookings/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async updateBookingStatus(id, status) {
        return this.request(`/admin/bookings/${encodeURIComponent(id)}/status`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
    }

    async confirmDeposit(phone, depositAmount, paymentDueDate = null) {
        return this.request('/admin/bookings/confirm-deposit', {
            method: 'POST',
            body: JSON.stringify({
                phone: phone,
                deposit_amount: depositAmount,
                payment_due_date: paymentDueDate
            })
        });

    }

    // Template Config API
    async getTemplateConfigs() {
        return this.request('/admin/template-config');
    }

    async updateTemplateConfig(id, data) {
        return this.request(`/admin/template-config/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Template Sends Log API
    async getTemplateSends(params = {}) {
        const query = new URLSearchParams();
        if (params.template_key) query.append('template_key', params.template_key);
        if (params.status) query.append('status', params.status);
        if (params.page) query.append('page', params.page);
        if (params.limit) query.append('limit', params.limit);
        const qStr = query.toString() ? `?${query.toString()}` : '';
        return this.request(`/admin/template-sends${qStr}`);
    }
}

window.api = new ApiClient();
