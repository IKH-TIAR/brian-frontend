const API_BASE = 'https://raphael-precipiced-lashunda.ngrok-free.dev/api';
const WS_BASE = 'wss://raphael-precipiced-lashunda.ngrok-free.dev/ws';


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
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Conversations
    async getConversations(search = '') {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request(`/conversations${query}`);
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
}

window.api = new ApiClient();
