document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Check Auth
    const pwd = localStorage.getItem('hbb_admin_pwd');
    if (!pwd) {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-container').classList.remove('active');
    } else {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-container').classList.add('active');
        window.api.password = pwd;
        initApp();
    }

    // Login Form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const pwdInput = document.getElementById('password').value;
        localStorage.setItem('hbb_admin_pwd', pwdInput);
        window.api.password = pwdInput;

        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-container').classList.add('active');
        initApp();
    });
});

let currentPhone = null;
let currentConvId = null;
let ws = null;
let adminCommands = {};

let swRegistration = null;

// Synthesize audio chime for normal messages
function playMessageChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.warn("Audio chime error:", e);
    }
}

// Synthesize audio chime for escalation (urgent double beep)
function playEscalationChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Tone 1
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.2);

        // Tone 2 (Higher, urgent pitch)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.25);
        gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.25);
        osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.warn("Escalation chime error:", e);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                swRegistration = reg;
                console.log("Service Worker registered successfully.");
            })
            .catch(err => {
                console.warn("Service Worker registration failed:", err);
            });
    }
}

function updateNotificationBellUI() {
    const bellBtn = document.getElementById('enable-notifications-btn');
    if (!bellBtn) return;
    if ("Notification" in window) {
        if (Notification.permission === 'granted') {
            bellBtn.style.color = 'var(--accent-teal)';
            bellBtn.title = 'Notifications Enabled';
        } else if (Notification.permission === 'denied') {
            bellBtn.style.color = 'var(--accent-red)';
            bellBtn.title = 'Notifications Blocked in Browser Settings';
        } else {
            bellBtn.style.color = 'var(--text-muted)';
            bellBtn.title = 'Click to Enable Notifications';
        }
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("This browser does not support web notifications.");
        return;
    }
    try {
        const permission = await Notification.requestPermission();
        updateNotificationBellUI();

        if (permission === 'granted') {
            // Subscribe to Web Push via Service Worker & VAPID Key
            if ('serviceWorker' in navigator && swRegistration) {
                try {
                    const res = await window.api.getVapidPublicKey();
                    if (res && res.public_key) {
                        const convertedVapidKey = urlBase64ToUint8Array(res.public_key);
                        let sub = await swRegistration.pushManager.getSubscription();
                        if (!sub) {
                            sub = await swRegistration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: convertedVapidKey
                            });
                        }
                        await window.api.subscribePush(sub.toJSON());
                        console.log("Web Push subscription active & saved to backend!");
                    }
                } catch (pushErr) {
                    console.warn("Could not register device Web Push token:", pushErr);
                }
            }
            alert("Push notifications enabled! You will now receive offline alerts when the site is closed.");
        } else if (permission === 'denied') {
            alert("Notification permission was denied. Please allow notifications in your browser/phone site settings.");
        }
    } catch (e) {
        console.error("Failed to request notification permission:", e);
    }
}

function showSystemNotification(title, options, phone) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    const defaultOptions = {
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        vibrate: [200, 100, 200],
        ...options
    };

    if (swRegistration && 'showNotification' in swRegistration) {
        swRegistration.showNotification(title, defaultOptions);
    } else {
        const n = new Notification(title, defaultOptions);
        n.onclick = () => {
            window.focus();
            if (phone && phone !== currentPhone) {
                const appContainer = document.getElementById('app-container');
                appContainer.classList.remove('view-sidebar', 'view-info');
                appContainer.classList.add('view-main');
                loadThread(phone);
            }
        };
    }
}

async function initApp() {
    registerServiceWorker();
    updateNotificationBellUI();

    setupWebSocket();
    await loadConversations();
    await loadCommands();
    setupEventListeners();
}

function setupWebSocket() {
    ws = new WebSocket(WS_BASE);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_message') {
            handleNewMessageEvent(msg.data);
        }
    };

    ws.onclose = () => {
        setTimeout(setupWebSocket, 5000); // Reconnect
    };
}

async function loadConversations(search = '') {
    try {
        const convs = await window.api.getConversations(search);
        renderConversationList(convs);
    } catch (e) {
        console.error("Failed to load conversations:", e);
    }
}

function formatCRTime(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr);
    if (!str.endsWith('Z') && !str.includes('+') && !str.includes('Z')) {
        str = str + 'Z';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica' });
}

function renderConversationList(convs) {
    const list = document.getElementById('conversation-list');
    list.innerHTML = '';

    convs.forEach(c => {
        const div = document.createElement('div');
        div.className = `conv-item ${c.phone === currentPhone ? 'active' : ''} ${c.is_escalated ? 'escalated' : ''}`;
        div.dataset.phone = c.phone;

        const nameDisplay = c.name || c.phone;
        const timeStr = formatCRTime(c.last_message_at);
        const modeDotClass = c.mode === 'HUMAN' ? 'human' : 'bot';

        div.innerHTML = `
            <div class="conv-header">
                <span class="conv-name"><span class="status-dot ${modeDotClass}"></span>${nameDisplay}</span>
                <span class="conv-time">${timeStr}</span>
            </div>
            <div class="conv-preview">${c.latest_message_role === 'assistant' ? '🤖 ' : ''}${c.latest_message_role === 'admin' ? '👤 ' : ''}${c.latest_message}</div>
            <div class="badges">
                ${!c.name ? '<span class="badge lead">Lead</span>' : '<span class="badge client">Client</span>'}
                ${c.is_returning ? '<span class="badge returning">Returning</span>' : ''}
                ${c.unread_count > 0 ? `<span class="badge unread">${c.unread_count} Unread</span>` : ''}
            </div>
        `;

        div.addEventListener('click', () => loadThread(c.phone));
        list.appendChild(div);
    });
}

async function loadThread(phone) {
    currentPhone = phone;

    // Update UI active states
    document.querySelectorAll('.conv-item').forEach(el => {
        el.classList.toggle('active', el.dataset.phone === phone);
    });

    document.getElementById('empty-state').classList.remove('active');
    document.getElementById('thread-view').classList.add('active');

    // Switch to main view on mobile
    const appContainer = document.getElementById('app-container');
    appContainer.classList.remove('view-sidebar', 'view-info');
    appContainer.classList.add('view-main');

    try {
        const data = await window.api.getConversationThread(phone);
        currentConvId = data.conversation.id;
        renderThread(data);

        // Instantly clear the unread badge on this sidebar item locally
        const activeItem = document.querySelector(`.conv-item[data-phone="${phone}"]`);
        if (activeItem) {
            const badge = activeItem.querySelector('.badge.unread');
            if (badge) badge.remove();
        }
    } catch (e) {
        console.error("Failed to load thread:", e);
    }
}

async function loadOlderMessages() {
    if (!currentPhone) return;
    const list = document.getElementById('message-list');
    const firstMsg = list.querySelector('.message[data-id]');
    if (!firstMsg) return;

    const btn = document.getElementById('load-older-btn');
    if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }

    try {
        const data = await window.api.getConversationThread(currentPhone, firstMsg.dataset.id);
        if (!data.messages || data.messages.length === 0) {
            if (btn) btn.remove();
            return;
        }

        // Save scroll position before prepending
        const prevScrollHeight = list.scrollHeight;

        // Prepend older messages after the "Load older" button but before existing messages
        const fragment = document.createDocumentFragment();
        data.messages.forEach(msg => {
            fragment.appendChild(buildMessageEl(msg));
        });
        const insertPoint = btn ? btn.nextSibling : list.firstChild;
        list.insertBefore(fragment, insertPoint);

        // Restore scroll position so it doesn't jump
        list.scrollTop = list.scrollHeight - prevScrollHeight;

        // Update or remove the load-older button
        if (btn) {
            if (data.has_more) {
                btn.textContent = 'Load older messages';
                btn.disabled = false;
            } else {
                btn.remove();
            }
        }
    } catch (e) {
        console.error('Failed to load older messages:', e);
        if (btn) { btn.textContent = 'Load older messages'; btn.disabled = false; }
    }
}

function buildMessageEl(msg) {
    const div = document.createElement('div');
    div.className = `message msg-${msg.role}`;
    div.dataset.id = msg.id;
    const timeStr = formatCRTime(msg.created_at);
    div.innerHTML = `${msg.content}<span class="time">${timeStr}</span>`;
    return div;
}

function renderThread(data) {
    const { contact, conversation, messages, has_more } = data;

    // Header
    document.getElementById('thread-name').textContent = contact.name || "Unknown Guest";
    document.getElementById('thread-phone').textContent = contact.phone;

    document.getElementById('badge-returning').classList.toggle('hidden', !conversation.is_returning);
    
    document.getElementById('quick-catchup-btn').style.display = 'flex';
    document.getElementById('clear-history-btn').style.display = 'flex';
    
    // Mode toggle
    const modeToggle = document.getElementById('mode-toggle');
    const isHuman = contact.mode === 'HUMAN';
    modeToggle.checked = isHuman;

    const replyInput = document.getElementById('reply-input');
    const replySubmit = document.getElementById('reply-submit');
    const replyWarning = document.getElementById('reply-warning');

    if (isHuman) {
        replyInput.disabled = false;
        replySubmit.disabled = false;
        replyWarning.classList.add('hidden');
    } else {
        replyInput.disabled = true;
        replySubmit.disabled = true;
        replyWarning.classList.remove('hidden');
    }

    // Messages
    const list = document.getElementById('message-list');
    list.innerHTML = '';

    // Show "Load older" button at the top if there are more messages
    if (has_more) {
        const olderBtn = document.createElement('button');
        olderBtn.id = 'load-older-btn';
        olderBtn.textContent = 'Load older messages';
        olderBtn.style.cssText = 'display:block;margin:8px auto 12px;padding:6px 14px;font-size:0.8rem;background:var(--bg-secondary);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);';
        olderBtn.addEventListener('click', loadOlderMessages);
        list.appendChild(olderBtn);
    }

    let isEscalated = false;
    let escReason = "";

    messages.forEach(msg => {
        list.appendChild(buildMessageEl(msg));
        if (msg.escalated && msg.role === 'assistant' && isHuman) {
            isEscalated = true;
            escReason = msg.escalation_reason || "Check messages";
        }
    });

    // Scroll to bottom
    list.scrollTop = list.scrollHeight;

    // Escalation Banner
    const banner = document.getElementById('escalation-banner');
    if (isEscalated) {
        document.getElementById('escalation-reason-text').textContent = escReason;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }

    // Reservation details
    const resDetails = document.getElementById('reservation-details');
    document.getElementById('edit-booking-btn').style.display = 'block';
    if (conversation.bungalow) {
        resDetails.innerHTML = `
            <div class="details-row"><span class="details-label">Bungalow</span> <span>${conversation.bungalow}</span></div>
            <div class="details-row"><span class="details-label">Check-in</span> <span>${conversation.check_in || 'N/A'}</span></div>
            <div class="details-row"><span class="details-label">Check-out</span> <span>${conversation.check_out || 'N/A'}</span></div>
        `;
    } else {
        resDetails.innerHTML = '<p>No active booking.</p>';
    }
}

async function loadCommands() {
    try {
        adminCommands = await window.api.getCommands();
        renderCommands();
    } catch (e) {
        console.error("Failed to load commands:", e);
    }
}

function renderCommands() {
    const container = document.getElementById('commands-container');
    container.innerHTML = '';

    Object.keys(adminCommands).forEach(category => {
        const group = document.createElement('div');
        group.className = 'command-group';
        group.innerHTML = `<h4>${category.toUpperCase()}</h4>`;

        adminCommands[category].forEach(cmd => {
            const btn = document.createElement('button');
            btn.className = 'cmd-btn';
            btn.textContent = cmd.label;
            btn.addEventListener('click', () => openCommandModal(cmd));
            group.appendChild(btn);
        });

        container.appendChild(group);
    });
}

function setupEventListeners() {
    // Search
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadConversations(e.target.value);
        }, 300);
    });

    // Mode toggle
    document.getElementById('mode-toggle').addEventListener('change', async (e) => {
        if (!currentPhone) return;
        const newMode = e.target.checked ? 'HUMAN' : 'BOT';
        try {
            await window.api.updateContactMode(currentPhone, newMode, 'Toggled in UI');
            loadThread(currentPhone);
            loadConversations(document.getElementById('search-input').value);
        } catch (err) {
            console.error(err);
            e.target.checked = !e.target.checked;
        }
    });

    // Quick Catch Up Button
    document.getElementById('quick-catchup-btn').addEventListener('click', async (e) => {
        if (!currentPhone) return;
        const btn = e.currentTarget;
        if (btn.disabled) return;
        const origHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 14px; height: 14px;"></i> Catching up...`;
        btn.disabled = true;
        try {
            await window.api.executeCommand('catchup', currentPhone, {});
            loadThread(currentPhone);
        } catch (err) {
            console.error("Catch up failed", err);
            alert("Failed to execute Catch Up command.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = origHTML;
            lucide.createIcons();
        }
    });

    // Clear History Button
    document.getElementById('clear-history-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (btn.disabled) return;
        
        if (!currentPhone) return;
        if (!confirm("Are you sure you want to completely clear the chat history for this guest? This cannot be undone.")) return;
        
        const origHTML = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 16px; height: 16px;"></i> Clearing...`;
        btn.disabled = true;
        
        try {
            await window.api.resetHistory(currentPhone);
            // Wait briefly for N8N to process it and delete the rows
            setTimeout(() => {
                loadThread(currentPhone);
                loadConversations(document.getElementById('search-input').value);
                btn.disabled = false;
                btn.innerHTML = origHTML;
                lucide.createIcons();
            }, 1000);
        } catch (err) {
            console.error("Failed to clear history", err);
            alert("Failed to clear history");
            btn.disabled = false;
            btn.innerHTML = origHTML;
            lucide.createIcons();
        }
    });

    // Mobile View Navigation
    const appContainer = document.getElementById('app-container');
    document.getElementById('mobile-back-btn').addEventListener('click', () => {
        appContainer.classList.remove('view-main', 'view-info');
        appContainer.classList.add('view-sidebar');
        currentPhone = null;
        document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    });
    document.getElementById('mobile-info-btn').addEventListener('click', () => {
        appContainer.classList.remove('view-sidebar', 'view-main');
        appContainer.classList.add('view-info');
    });
    document.getElementById('mobile-close-info-btn').addEventListener('click', () => {
        appContainer.classList.remove('view-sidebar', 'view-info');
        appContainer.classList.add('view-main');
    });

    // Resolve escalation
    document.getElementById('resolve-escalation-btn').addEventListener('click', async () => {
        if (!currentPhone) return;
        try {
            await window.api.resolveEscalation(currentPhone);
            loadThread(currentPhone);
            loadConversations();
        } catch (e) { console.error(e); }
    });

    // Admin Reply
    document.getElementById('reply-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('reply-submit');
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;

        const input = document.getElementById('reply-input');
        const text = input.value.trim();
        if (!text || !currentPhone) {
            submitBtn.disabled = false;
            return;
        }
        
        input.value = '';
        try {
            await window.api.sendAdminReply(currentPhone, text);
            loadThread(currentPhone);
        } catch(e) { console.error(e); } finally {
            submitBtn.disabled = false;
        }
    });

    // Edit Name Modal
    const nameModal = document.getElementById('name-modal');
    document.getElementById('edit-name-btn').addEventListener('click', () => {
        document.getElementById('edit-name-input').value = document.getElementById('thread-name').textContent === 'Unknown Guest' ? '' : document.getElementById('thread-name').textContent;
        document.getElementById('edit-returning-checkbox').checked = !document.getElementById('badge-returning').classList.contains('hidden');
        nameModal.classList.add('active');
    });
    document.getElementById('cancel-name-btn').addEventListener('click', () => nameModal.classList.remove('active'));
    document.getElementById('save-name-btn').addEventListener('click', async () => {
        const name = document.getElementById('edit-name-input').value;
        const isReturning = document.getElementById('edit-returning-checkbox').checked;
        try {
            await window.api.updateContact(currentPhone, { name, is_returning: isReturning });
            nameModal.classList.remove('active');
            loadThread(currentPhone);
            loadConversations();
        } catch (e) { console.error(e); }
    });

    // Edit Booking Modal
    const bookingModal = document.getElementById('booking-modal');
    document.getElementById('edit-booking-btn').addEventListener('click', () => {
        if (!currentPhone) return;
        const name = document.getElementById('thread-name').textContent;
        document.getElementById('booking-name').value = name === 'Unknown Guest' ? '' : name;

        // Fetch current conversation data if available from the DOM elements
        const rows = document.querySelectorAll('#reservation-details .details-row');
        let checkin = '', checkout = '', bungalow = '';
        rows.forEach(row => {
            const label = row.querySelector('.details-label').textContent;
            const val = row.querySelectorAll('span')[1].textContent;
            if (label === 'Bungalow') bungalow = val === 'N/A' ? '' : val;
            if (label === 'Check-in') checkin = val === 'N/A' ? '' : val;
            if (label === 'Check-out') checkout = val === 'N/A' ? '' : val;
        });

        document.getElementById('booking-bungalow').value = bungalow;
        document.getElementById('booking-checkin').value = checkin;
        document.getElementById('booking-checkout').value = checkout;

        bookingModal.classList.add('active');
    });

    document.getElementById('cancel-booking-btn').addEventListener('click', () => bookingModal.classList.remove('active'));
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('save-booking-btn');
        if (submitBtn.disabled) return;
        const origText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const data = {
                name: document.getElementById('booking-name').value,
                bungalow: document.getElementById('booking-bungalow').value,
                check_in: document.getElementById('booking-checkin').value || null,
                check_out: document.getElementById('booking-checkout').value || null
            };
            await window.api.updateBookingDetails(currentConvId, data);
            bookingModal.classList.remove('active');
            loadThread(currentPhone);
        } catch (e) {
            console.error(e);
            alert("Failed to save booking details");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = origText;
        }
    });

    // Command Modal
    const cmdModal = document.getElementById('command-modal');
    document.getElementById('cancel-cmd-btn').addEventListener('click', () => cmdModal.classList.remove('active'));

    document.getElementById('cmd-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn.disabled) return; // Prevent multiple submissions if triggered via Enter key
        
        const origText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Executing...";

        const cmdName = cmdModal.dataset.cmd;
        const params = {};

        const inputs = document.querySelectorAll('.cmd-param-input input');
        inputs.forEach(input => {
            params[input.name] = input.value;
        });

        try {
            await window.api.executeCommand(cmdName, currentPhone, params);
            cmdModal.classList.remove('active');
            loadThread(currentPhone);
        } catch (err) {
            console.error("Command failed", err);
            alert("Command failed to execute");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = origText;
        }
    });

    // Notification Bell Listener
    document.getElementById('enable-notifications-btn')?.addEventListener('click', requestNotificationPermission);

    // Settings Modal
    document.getElementById('open-settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('close-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('active');
        document.getElementById('settings-modal').classList.remove('view-editor');
    });
    
    document.getElementById('mobile-back-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('view-editor');
        document.getElementById('settings-editor').style.display = 'none';
        document.querySelectorAll('.settings-cmd-item').forEach(el => el.classList.remove('active'));
    });

    document.getElementById('command-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCommandConfig();
    });

    // Bungalow Codes Modal
    document.getElementById('open-bungalows-btn').addEventListener('click', openBungalowModal);
    document.getElementById('close-bungalows-btn').addEventListener('click', () => {
        document.getElementById('bungalow-modal').classList.remove('active');
    });
    document.getElementById('add-bungalow-btn').addEventListener('click', () => openBungalowForm());
    document.getElementById('cancel-bungalow-btn').addEventListener('click', () => {
        document.getElementById('bungalow-form-modal').classList.remove('active');
    });
    document.getElementById('bungalow-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveBungalow();
    });
}

function openCommandModal(cmd) {
    if (!currentPhone) {
        alert("Please select a conversation first.");
        return;
    }

    const modal = document.getElementById('command-modal');
    document.getElementById('cmd-title').textContent = `Execute ${cmd.label}`;
    modal.dataset.cmd = cmd.command;

    const paramsContainer = document.getElementById('cmd-params');
    paramsContainer.innerHTML = '';

    if (cmd.required_params && cmd.required_params.length > 0) {
        cmd.required_params.forEach(param => {
            const div = document.createElement('div');
            div.className = 'cmd-param-input';
            const paramKey = typeof param === 'object' ? (param.key || param.name) : param;
            const paramLabel = typeof param === 'object' ? (param.label || paramKey) : param;
            
            // Default to required if not explicitly set to false
            const isRequired = typeof param === 'object' && param.required === false ? false : true;
            const requiredAttr = isRequired ? 'required' : '';
            
            div.innerHTML = `
                <label>${paramLabel}</label>
                <input type="text" name="${paramKey}" placeholder="${paramLabel}" ${requiredAttr}>
            `;
            paramsContainer.appendChild(div);
        });
    } else {
        paramsContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">No parameters required.</p>';
    }

    modal.classList.add('active');
}

function handleNewMessageEvent(data) {
    const appContainer = document.getElementById('app-container');
    const isMainViewActive = appContainer ? appContainer.classList.contains('view-main') : true;
    const isCurrentThread = (data.phone === currentPhone) && isMainViewActive;

    // If we are looking at the thread, update it
    if (isCurrentThread) {
        loadThread(currentPhone);
    }
    
    const isEscalated = Boolean(data.escalated);
    const nameDisplay = (data.name && String(data.name).trim()) ? data.name.trim() : (data.phone || "Guest");

    if (isEscalated) {
        // ALWAYS trigger escalation chime and notification for escalation events regardless of message role
        playEscalationChime();
        showSystemNotification(
            "🚨 ESCALATION ALERT: " + nameDisplay,
            {
                body: data.escalation_reason || data.content || "Conversation escalated to HUMAN mode!",
                tag: "escalation-" + data.phone
            },
            data.phone
        );
    } else if (data.role === 'user') {
        // Normal guest message notification if not on current thread or tab is in background
        if (!isCurrentThread || document.hidden) {
            playMessageChime();
            showSystemNotification(
                "New Message: " + nameDisplay,
                {
                    body: data.content,
                    tag: "msg-" + data.phone
                },
                data.phone
            );
        }
    }

    // Refresh conversation list to show new preview and push to top
    loadConversations(document.getElementById('search-input').value);
}

// Settings Configuration Logic
let allCommandsConfig = [];

async function openSettingsModal() {
    document.getElementById('settings-modal').classList.add('active');
    document.getElementById('settings-modal').classList.remove('view-editor');
    document.getElementById('settings-editor').style.display = 'none';
    await loadSettingsCommands();
}

async function loadSettingsCommands() {
    try {
        allCommandsConfig = await window.api.getAdminCommandsConfig();
        renderSettingsSidebar();
    } catch (e) {
        console.error("Failed to load full commands config:", e);
    }
}

function renderSettingsSidebar() {
    const list = document.getElementById('settings-command-list');
    list.innerHTML = '';

    allCommandsConfig.forEach(cmd => {
        const item = document.createElement('div');
        item.className = 'settings-cmd-item';
        item.innerHTML = `
            <div class="cmd-name">
                <span>${cmd.label}</span>
                <span class="status-badge ${cmd.is_active ? '' : 'inactive'}">${cmd.is_active ? 'Active' : 'Disabled'}</span>
            </div>
            <div class="cmd-cat">!${cmd.command} &bull; ${cmd.category}</div>
        `;

        item.addEventListener('click', () => {

            document.querySelectorAll('.settings-cmd-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            openSettingsEditor(cmd);
        });

        list.appendChild(item);
    });
}

function openSettingsEditor(cmd) {
    document.getElementById('settings-modal').classList.add('view-editor');
    document.getElementById('settings-editor').style.display = 'block';

    document.getElementById('edit-cmd-id').value = cmd.id;
    document.getElementById('edit-cmd-label').value = cmd.label;
    document.getElementById('edit-cmd-active').checked = cmd.is_active;
    document.getElementById('edit-cmd-set-bot').checked = (cmd.set_mode_after === 'BOT');
    document.getElementById('edit-cmd-prompt').value = cmd.ai_system_prompt || "";
    document.getElementById('edit-cmd-en').value = cmd.template_en || "";
    document.getElementById('edit-cmd-es').value = cmd.template_es || "";
}

async function saveCommandConfig() {
    const id = document.getElementById('edit-cmd-id').value;
    const data = {
        label: document.getElementById('edit-cmd-label').value,
        is_active: document.getElementById('edit-cmd-active').checked,
        set_mode_after: document.getElementById('edit-cmd-set-bot').checked ? 'BOT' : null,
        ai_system_prompt: document.getElementById('edit-cmd-prompt').value,
        template_en: document.getElementById('edit-cmd-en').value,
        template_es: document.getElementById('edit-cmd-es').value
    };

    const submitBtn = document.querySelector('#command-edit-form button[type="submit"]');
    if (submitBtn.disabled) return;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    try {
        await window.api.updateAdminCommand(id, data);
        submitBtn.textContent = 'Saved!';
        submitBtn.style.background = 'var(--success-bg)';
        submitBtn.style.color = 'var(--success-text)';


        await loadSettingsCommands();
        await loadCommands();

        setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            submitBtn.style.color = '';
            submitBtn.disabled = false;
        }, 2000);
    } catch (e) {
        console.error("Failed to update command:", e);
        alert("Failed to save command.");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ── Bungalow Codes CRUD ──
let allBungalows = [];

async function openBungalowModal() {
    document.getElementById('bungalow-modal').classList.add('active');
    await loadBungalows();
}

async function loadBungalows() {
    try {
        allBungalows = await window.api.getBungalows();
        renderBungalowTable();
    } catch (e) {
        console.error('Failed to load bungalows:', e);
    }
}

function renderBungalowTable() {
    const tbody = document.getElementById('bungalow-tbody');
    const table = document.getElementById('bungalow-table');
    const empty = document.getElementById('bungalow-empty');
    const wrapper = document.getElementById('bungalow-grid-wrapper');

    tbody.innerHTML = '';

    // Remove any existing mobile cards
    wrapper.querySelectorAll('.bungalow-card').forEach(c => c.remove());

    if (allBungalows.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        lucide.createIcons();
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    allBungalows.forEach(b => {
        // Desktop table row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="bungalow-name-cell">${escapeHtml(b.bungalow)}</td>
            <td class="bungalow-code-cell">${escapeHtml(b.door_code)}</td>
            <td class="bungalow-code-cell">${escapeHtml(b.lockbox_code)}</td>
            <td>${escapeHtml(b.lockbox_location)}</td>
            <td>${escapeHtml(b.wifi_name)}</td>
            <td>${escapeHtml(b.wifi_password)}</td>
            <td class="notes-cell" title="${escapeHtml(b.special_notes)}">${escapeHtml(b.special_notes)}</td>
            <td>
                <div class="bungalow-actions">
                    <button onclick="openBungalowForm('${b.id}')" title="Edit">
                        <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteBungalow('${b.id}', '${escapeHtml(b.bungalow)}')" title="Delete">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Mobile card
        const card = document.createElement('div');
        card.className = 'bungalow-card';
        let notesHtml = b.special_notes ? `<div class="bungalow-card-notes">${escapeHtml(b.special_notes)}</div>` : '';
        card.innerHTML = `
            <div class="bungalow-card-header">
                <span class="bungalow-card-name">${escapeHtml(b.bungalow)}</span>
                <div class="bungalow-actions">
                    <button onclick="openBungalowForm('${b.id}')" title="Edit">
                        <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteBungalow('${b.id}', '${escapeHtml(b.bungalow)}')" title="Delete">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </div>
            ${b.door_code ? `<div class="bungalow-card-row"><span class="bungalow-card-label">Door Code</span><span class="bungalow-card-value code">${escapeHtml(b.door_code)}</span></div>` : ''}
            ${b.lockbox_code ? `<div class="bungalow-card-row"><span class="bungalow-card-label">Lockbox Code</span><span class="bungalow-card-value code">${escapeHtml(b.lockbox_code)}</span></div>` : ''}
            ${b.lockbox_location ? `<div class="bungalow-card-row"><span class="bungalow-card-label">Lockbox Location</span><span class="bungalow-card-value">${escapeHtml(b.lockbox_location)}</span></div>` : ''}
            ${b.wifi_name ? `<div class="bungalow-card-row"><span class="bungalow-card-label">WiFi Name</span><span class="bungalow-card-value">${escapeHtml(b.wifi_name)}</span></div>` : ''}
            ${b.wifi_password ? `<div class="bungalow-card-row"><span class="bungalow-card-label">WiFi Password</span><span class="bungalow-card-value code">${escapeHtml(b.wifi_password)}</span></div>` : ''}
            ${notesHtml}
        `;
        wrapper.appendChild(card);
    });

    lucide.createIcons();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function openBungalowForm(id = null) {
    const modal = document.getElementById('bungalow-form-modal');
    const title = document.getElementById('bungalow-form-title');
    document.getElementById('bungalow-edit-id').value = id || '';

    if (id) {
        title.textContent = 'Edit Bungalow';
        const b = allBungalows.find(x => x.id === id);
        if (b) {
            document.getElementById('bf-bungalow').value = b.bungalow;
            document.getElementById('bf-door-code').value = b.door_code;
            document.getElementById('bf-lockbox-code').value = b.lockbox_code;
            document.getElementById('bf-lockbox-location').value = b.lockbox_location;
            document.getElementById('bf-wifi-name').value = b.wifi_name;
            document.getElementById('bf-wifi-password').value = b.wifi_password;
            document.getElementById('bf-special-notes').value = b.special_notes;
        }
    } else {
        title.textContent = 'Add Bungalow';
        document.getElementById('bf-bungalow').value = '';
        document.getElementById('bf-door-code').value = '';
        document.getElementById('bf-lockbox-code').value = '';
        document.getElementById('bf-lockbox-location').value = '';
        document.getElementById('bf-wifi-name').value = '';
        document.getElementById('bf-wifi-password').value = '';
        document.getElementById('bf-special-notes').value = '';
    }

    modal.classList.add('active');
}

async function saveBungalow() {
    const id = document.getElementById('bungalow-edit-id').value;
    const btn = document.getElementById('save-bungalow-btn');
    if (btn.disabled) return;

    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const data = {
        bungalow: document.getElementById('bf-bungalow').value.trim(),
        door_code: document.getElementById('bf-door-code').value.trim(),
        lockbox_code: document.getElementById('bf-lockbox-code').value.trim(),
        lockbox_location: document.getElementById('bf-lockbox-location').value.trim(),
        wifi_name: document.getElementById('bf-wifi-name').value.trim(),
        wifi_password: document.getElementById('bf-wifi-password').value.trim(),
        special_notes: document.getElementById('bf-special-notes').value.trim(),
    };

    try {
        if (id) {
            await window.api.updateBungalow(id, data);
        } else {
            await window.api.createBungalow(data);
        }
        document.getElementById('bungalow-form-modal').classList.remove('active');
        await loadBungalows();
    } catch (e) {
        console.error('Failed to save bungalow:', e);
        alert('Failed to save bungalow. ' + (e.message || ''));
    } finally {
        btn.disabled = false;
        btn.textContent = origText;
    }
}

async function deleteBungalow(id, name) {
    if (!confirm(`Are you sure you want to delete bungalow "${name}"? This cannot be undone.`)) return;

    try {
        await window.api.deleteBungalow(id);
        await loadBungalows();
    } catch (e) {
        console.error('Failed to delete bungalow:', e);
        alert('Failed to delete bungalow.');
    }
}
