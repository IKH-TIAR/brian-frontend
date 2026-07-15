const API_BASE = 'https://grove-retold-outmatch.ngrok-free.dev/api';
const WS_BASE = 'wss://grove-retold-outmatch.ngrok-free.dev/ws';

class ApiClient {
    constructor() {
        this.password = sessionStorage.getItem('hbb_admin_pwd');
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
}

window.api = new ApiClient();
