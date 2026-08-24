// Bookings, Template Config & Template Sends Log Module

let currentBookings = [];
let currentBookingDetail = null;
let currentTemplateConfigs = [];
let currentTemplateSends = [];
let templateSendsPage = 1;

function initBookingsModule() {
    // Buttons in sidebar header
    document.getElementById('open-bookings-btn')?.addEventListener('click', openBookingsModal);
    document.getElementById('open-template-config-btn')?.addEventListener('click', openTemplateConfigModal);
    document.getElementById('open-template-sends-btn')?.addEventListener('click', openTemplateSendsModal);

    // Modal Close Buttons
    document.getElementById('close-bookings-btn')?.addEventListener('click', closeBookingsModal);
    document.getElementById('close-booking-detail-btn')?.addEventListener('click', closeBookingDetailModal);
    document.getElementById('close-template-config-btn')?.addEventListener('click', closeTemplateConfigModal);
    document.getElementById('close-template-sends-btn')?.addEventListener('click', closeTemplateSendsModal);

    // Bookings Filters
    document.getElementById('bookings-status-filter')?.addEventListener('change', loadBookings);
    document.getElementById('bookings-search-input')?.addEventListener('input', debounce(loadBookings, 300));
    document.getElementById('bookings-date-from')?.addEventListener('change', loadBookings);
    document.getElementById('bookings-date-to')?.addEventListener('change', loadBookings);

    // Booking Forms & Actions
    document.getElementById('booking-edit-form')?.addEventListener('submit', handleSaveBooking);

    // Template Config Forms
    document.getElementById('tc-edit-form')?.addEventListener('submit', handleSaveTemplateConfig);
    document.getElementById('close-tc-edit-btn')?.addEventListener('click', () => {
        document.getElementById('tc-edit-modal')?.classList.remove('active');
    });

    // Template Sends Filters
    document.getElementById('ts-template-filter')?.addEventListener('input', debounce(loadTemplateSends, 300));
    document.getElementById('ts-status-filter')?.addEventListener('change', loadTemplateSends);
    document.getElementById('ts-prev-page-btn')?.addEventListener('click', () => {
        if (templateSendsPage > 1) {
            templateSendsPage--;
            loadTemplateSends();
        }
    });
    document.getElementById('ts-next-page-btn')?.addEventListener('click', () => {
        templateSendsPage++;
        loadTemplateSends();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookingsModule);
} else {
    initBookingsModule();
}

window.openBookingsModal = openBookingsModal;
window.openBookingDetailModal = openBookingDetailModal;
window.openTemplateConfigModal = openTemplateConfigModal;
window.openTemplateSendsModal = openTemplateSendsModal;
window.closeBookingsModal = closeBookingsModal;
window.closeBookingDetailModal = closeBookingDetailModal;
window.closeTemplateConfigModal = closeTemplateConfigModal;
window.closeTemplateSendsModal = closeTemplateSendsModal;
window.handleDeleteBooking = handleDeleteBooking;

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==================================================
// 1. BOOKINGS MANAGEMENT
// ==================================================

async function openBookingsModal() {
    document.getElementById('bookings-modal')?.classList.add('active');
    await loadBookings();
    if (window.lucide) lucide.createIcons({}, document.getElementById('bookings-modal'));
}

function closeBookingsModal() {
    document.getElementById('bookings-modal')?.classList.remove('active');
}

async function loadBookings() {
    const status = document.getElementById('bookings-status-filter')?.value || '';
    const search = document.getElementById('bookings-search-input')?.value || '';
    const check_in_from = document.getElementById('bookings-date-from')?.value || '';
    const check_in_to = document.getElementById('bookings-date-to')?.value || '';

    const listEl = document.getElementById('bookings-list-container');
    if (listEl) listEl.innerHTML = '<div class="list-loading"></div>';

    try {
        currentBookings = await window.api.getBookings({ status, search, check_in_from, check_in_to });
        renderBookingsList();
    } catch (err) {
        console.error("Failed to load bookings:", err);
        if (listEl) listEl.innerHTML = `<p class="list-loading-error">Failed to load bookings: ${escapeHtml(err.message)}</p>`;
    }
}

function renderBookingsList() {
    const container = document.getElementById('bookings-list-container');
    if (!container) return;

    if (currentBookings.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No bookings found matching filters.</p>';
        return;
    }

    let html = '';
    (currentBookings || []).forEach(b => {
        const guestName = b.guest_name || b.contact?.name || 'Guest';
        const phone = b.contact?.phone || '';
        const stStr = b.status ? String(b.status).toLowerCase() : 'pending';
        const statusClass = `status-${stStr}`;
        const ref = b.reservation_reference ? `Ref: ${b.reservation_reference}` : '';
        const dates = b.check_in && b.check_out ? `${b.check_in} → ${b.check_out}` : 'Dates TBD';
        const amtNum = typeof b.total_amount === 'number' ? b.total_amount : parseFloat(b.total_amount || 0);
        const amount = `$${amtNum.toFixed(2)}`;

        html += `
            <div class="booking-card" onclick="openBookingDetailModal('${b.id}')">
                <div class="booking-card-header">
                    <div>
                        <span class="booking-guest-name">${escapeHtml(guestName)}</span>
                        <span class="booking-phone">${escapeHtml(phone)}</span>
                        ${ref ? `<span class="booking-ref">${escapeHtml(ref)}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="booking-status-badge ${statusClass}">${escapeHtml((b.status || 'PENDING').toUpperCase())}</span>
                        <span class="booking-total">${amount}</span>
                    </div>
                </div>
                <div class="booking-card-body">
                    <div><i data-lucide="calendar" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>${dates}</div>
                    <div><i data-lucide="users" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>${b.guest_count || 1} guests ${b.has_pets ? '• 🐾 Pets' : ''}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({}, container);
}

async function openBookingDetailModal(bookingId) {
    try {
        currentBookingDetail = await window.api.getBooking(bookingId);
        renderBookingDetail();
        document.getElementById('booking-detail-modal')?.classList.add('active');
    } catch (err) {
        alert("Failed to load booking details: " + err.message);
    }
}

function closeBookingDetailModal() {
    document.getElementById('booking-detail-modal')?.classList.remove('active');
}

function renderBookingDetail() {
    const b = currentBookingDetail;
    if (!b) return;

    document.getElementById('bd-id').value = b.id;
    document.getElementById('bd-title').textContent = `Booking: ${b.guest_name || 'Guest'} (${b.reservation_reference || 'No Ref'})`;
    
    // Status Badge & Transition Buttons
    const statusContainer = document.getElementById('bd-status-container');
    const statusClass = `status-${b.status.toLowerCase()}`;
    
    let transitionBtns = '';
    if (b.status === 'pending') {
        transitionBtns += `<button class="btn-sm btn-success" onclick="triggerStatusTransition('${b.id}', 'confirmed')">Mark Confirmed</button>`;
        transitionBtns += `<button class="btn-sm btn-delete" onclick="triggerStatusTransition('${b.id}', 'cancelled')">Cancel</button>`;
    } else if (b.status === 'confirmed') {
        transitionBtns += `<button class="btn-sm btn-primary" onclick="triggerStatusTransition('${b.id}', 'checked_in')">Check In</button>`;
        transitionBtns += `<button class="btn-sm btn-delete" onclick="triggerStatusTransition('${b.id}', 'cancelled')">Cancel</button>`;
    } else if (b.status === 'checked_in' || b.status === 'active') {
        transitionBtns += `<button class="btn-sm btn-success" onclick="triggerStatusTransition('${b.id}', 'completed')">Complete Stay</button>`;
    }

    statusContainer.innerHTML = `
        <span class="booking-status-badge ${statusClass}" style="font-size:0.9rem; padding:0.35rem 0.75rem;">${escapeHtml(b.status.toUpperCase())}</span>
        <div style="display:inline-flex; gap:0.5rem; margin-left:1rem;">${transitionBtns}</div>
    `;

    // Form inputs
    document.getElementById('bd-guest-name').value = b.guest_name || '';
    document.getElementById('bd-guest-first-name').value = b.guest_first_name || '';
    document.getElementById('bd-check-in').value = b.check_in || '';
    document.getElementById('bd-check-out').value = b.check_out || '';
    document.getElementById('bd-checkout-time').value = b.checkout_time || '11:00:00';
    document.getElementById('bd-guest-count').value = b.guest_count || 1;
    document.getElementById('bd-has-pets').checked = !!b.has_pets;
    document.getElementById('bd-language').value = b.language_tag || 'english';
    document.getElementById('bd-currency').value = b.currency || 'USD';
    document.getElementById('bd-total-amount').value = b.total_amount || 0;
    document.getElementById('bd-deposit-amount').value = b.deposit_amount || 0;
    document.getElementById('bd-refundable-deposit').value = b.refundable_deposit || 0;
    document.getElementById('bd-balance-due').value = b.balance_due || 0;
    document.getElementById('bd-deposit-due-date').value = b.deposit_due_date || '';
    document.getElementById('bd-payment-due-date').value = b.payment_due_date || '';
    document.getElementById('bd-notes').value = b.internal_notes || '';

    // Render Units
    const unitsContainer = document.getElementById('bd-units-container');
    unitsContainer.innerHTML = '';
    if (b.units && b.units.length > 0) {
        b.units.forEach(u => {
            const uDiv = document.createElement('div');
            uDiv.className = 'booking-unit-item';
            uDiv.innerHTML = `
                <strong>${escapeHtml(u.unit_name_snapshot || u.property_name || 'Unit')}</strong>
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
                    Accom: $${u.accommodation_amount.toFixed(2)} | Clean: $${u.cleaning_fee.toFixed(2)} | Pet: $${u.pet_fee.toFixed(2)} | Disc: $${u.discount_amount.toFixed(2)} = <strong>$${u.unit_total.toFixed(2)}</strong>
                </div>
            `;
            unitsContainer.appendChild(uDiv);
        });
    } else {
        unitsContainer.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">No units attached.</p>';
    }

    // Pricing Snapshot (Collapsible JSON Viewer)
    const jsonContainer = document.getElementById('bd-pricing-snapshot-json');
    if (b.pricing_snapshot) {
        jsonContainer.textContent = JSON.stringify(b.pricing_snapshot, null, 2);
    } else {
        jsonContainer.textContent = 'No pricing snapshot recorded.';
    }

    // Command Action Buttons (surface 4 commands with pre-filled phone)
    const cmdContainer = document.getElementById('bd-commands-container');
    const guestPhone = b.contact?.phone || '';
    cmdContainer.innerHTML = `
        <button class="btn-sm btn-secondary" onclick="launchBookingCommand('ontime_checkout', '${guestPhone}')">
            <i data-lucide="clock" style="width:13px;height:13px;"></i> On-time Checkout
        </button>
        <button class="btn-sm btn-secondary" onclick="launchBookingCommand('deposit_reminder', '${guestPhone}')">
            <i data-lucide="dollar-sign" style="width:13px;height:13px;"></i> Deposit Reminder
        </button>
        <button class="btn-sm btn-secondary" onclick="launchBookingCommand('balance_due', '${guestPhone}', '${b.balance_due ? '$' + b.balance_due.toFixed(2) : '$0.00'}')">
            <i data-lucide="credit-card" style="width:13px;height:13px;"></i> Balance Due
        </button>
        <button class="btn-sm btn-secondary" onclick="launchBookingCommand('rainy_season_parking', '${guestPhone}')">
            <i data-lucide="cloud-rain" style="width:13px;height:13px;"></i> Rainy Season Parking
        </button>
    `;

    if (window.lucide) lucide.createIcons({}, document.getElementById('booking-detail-modal'));
}

async function triggerStatusTransition(bookingId, newStatus) {
    if (!confirm(`Are you sure you want to change status to ${newStatus.toUpperCase()}?`)) return;
    try {
        await window.api.updateBookingStatus(bookingId, newStatus);
        if (window.showToast) window.showToast(`Status updated to ${newStatus.toUpperCase()}`, "success");
        await openBookingDetailModal(bookingId);
        await loadBookings();
    } catch (err) {
        if (window.showToast) window.showToast("Failed to update status: " + err.message, "error");
        else alert("Failed to update status: " + err.message);
    }
}

async function handleDeleteBooking() {
    const id = document.getElementById('bd-id').value;
    const bName = document.getElementById('bd-guest-name').value || 'this booking';
    if (!id) return;
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE booking for "${bName}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    try {
        await window.api.deleteBooking(id);
        if (window.showToast) window.showToast("Booking deleted successfully!", "success");
        closeBookingDetailModal();
        await loadBookings();
    } catch (err) {
        if (window.showToast) window.showToast("Failed to delete booking: " + err.message, "error");
        else alert("Failed to delete booking: " + err.message);
    }
}

async function handleSaveBooking(e) {
    e.preventDefault();
    const id = document.getElementById('bd-id').value;
    const data = {
        guest_name: document.getElementById('bd-guest-name').value.trim(),
        guest_first_name: document.getElementById('bd-guest-first-name').value.trim(),
        check_in: document.getElementById('bd-check-in').value || null,
        check_out: document.getElementById('bd-check-out').value || null,
        checkout_time: document.getElementById('bd-checkout-time').value || '11:00:00',
        guest_count: parseInt(document.getElementById('bd-guest-count').value, 10) || 1,
        has_pets: document.getElementById('bd-has-pets').checked,
        language_tag: document.getElementById('bd-language').value,
        currency: document.getElementById('bd-currency').value,
        total_amount: parseFloat(document.getElementById('bd-total-amount').value) || 0,
        deposit_amount: parseFloat(document.getElementById('bd-deposit-amount').value) || 0,
        refundable_deposit: parseFloat(document.getElementById('bd-refundable-deposit').value) || 0,
        balance_due: parseFloat(document.getElementById('bd-balance-due').value) || 0,
        deposit_due_date: document.getElementById('bd-deposit-due-date').value || null,
        payment_due_date: document.getElementById('bd-payment-due-date').value || null,
        internal_notes: document.getElementById('bd-notes').value.trim()
    };

    try {
        await window.api.updateBooking(id, data);
        if (window.showToast) window.showToast("Booking details saved successfully!", "success");
        closeBookingDetailModal();
        await loadBookings();
    } catch (err) {
        if (window.showToast) window.showToast("Failed to save booking: " + err.message, "error");
        else alert("Failed to save booking: " + err.message);
    }
}

function launchBookingCommand(commandCode, phone, defaultAmount = '') {
    if (!phone) {
        if (window.showToast) window.showToast("No guest phone number available for this booking.", "warning");
        else alert("No guest phone number available for this booking.");
        return;
    }
    // Launch standard execution flow via window.openCommandModal
    if (typeof window.openCommandModal === 'function') {
        window.openCommandModal(commandCode, phone, { amount: defaultAmount });
    } else {
        // Fallback execute
        executeCommandDirectly(commandCode, phone, defaultAmount);
    }
}

async function executeCommandDirectly(commandCode, phone, amount = '') {
    let params = {};
    if (commandCode === 'balance_due') {
        const val = prompt("Enter balance due amount in format $X.XX (e.g. $150.00):", amount || "$150.00");
        if (!val) return;
        if (!/^\$\d+\.\d{2}$/.test(val)) {
            if (window.showToast) window.showToast("Invalid amount format! Amount must match exact format $X.XX (e.g. $150.00)", "warning");
            else alert("Invalid amount format! Amount must match exact format $X.XX (e.g. $150.00)");
            return;
        }
        params = { amount: val };
    }
    try {
        await window.api.executeCommand({ command: commandCode, phone: phone, params: params });
        if (window.showToast) window.showToast(`Command '${commandCode}' executed successfully!`, "success");
    } catch (err) {
        if (window.showToast) window.showToast("Command execution failed: " + err.message, "error");
        else alert("Command execution failed: " + err.message);
    }
}

function togglePricingSnapshot() {
    const el = document.getElementById('bd-pricing-snapshot-json');
    if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
}

// ==================================================
// 2. PROPERTY TEMPLATE CONFIGURATION
// ==================================================

async function openTemplateConfigModal() {
    document.getElementById('template-config-modal')?.classList.add('active');
    await loadTemplateConfigs();
}

function closeTemplateConfigModal() {
    document.getElementById('template-config-modal')?.classList.remove('active');
}

async function loadTemplateConfigs() {
    const tbody = document.getElementById('tc-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="list-loading"></td></tr>';

    try {
        currentTemplateConfigs = await window.api.getTemplateConfigs();
        renderTemplateConfigs();
    } catch (err) {
        console.error("Failed to load template configs:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red); padding:1rem; text-align:center;">Failed to load template configurations.</td></tr>`;
    }
}

function renderTemplateConfigs() {
    const tbody = document.getElementById('tc-tbody');
    if (!tbody) return;

    if (currentTemplateConfigs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No property template configurations found.</td></tr>';
        return;
    }

    let html = '';
    currentTemplateConfigs.forEach(cfg => {
        html += `
            <tr>
                <td style="font-weight:600; color:var(--accent-teal);">${escapeHtml(cfg.property_name)} (${escapeHtml(cfg.property_code)})</td>
                <td>${escapeHtml(cfg.bungalow_name || 'None')}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${cfg.map_link ? `<a href="${escapeHtml(cfg.map_link)}" target="_blank" style="color:var(--accent-teal);">${escapeHtml(cfg.map_link)}</a>` : '<span style="color:var(--text-muted);">None</span>'}
                </td>
                <td>${escapeHtml(cfg.default_checkout_time)}</td>
                <td><span class="status-badge ${cfg.is_active ? '' : 'inactive'}">${cfg.is_active ? 'Active' : 'Disabled'}</span></td>
                <td>
                    <button class="btn-sm btn-secondary" onclick="openTemplateConfigEditModal('${cfg.id}')">Edit</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function openTemplateConfigEditModal(configId) {
    const cfg = currentTemplateConfigs.find(c => c.id === configId);
    if (!cfg) return;

    document.getElementById('tc-edit-id').value = cfg.id;
    document.getElementById('tc-edit-title').textContent = `Template Config: ${cfg.property_name}`;
    document.getElementById('tc-map-link').value = cfg.map_link || '';
    document.getElementById('tc-default-checkout-time').value = cfg.default_checkout_time || '11:00:00';
    document.getElementById('tc-is-active').checked = !!cfg.is_active;

    // Populate Bungalow Code select dropdown
    const selectEl = document.getElementById('tc-bungalow-select');
    selectEl.innerHTML = '<option value="">(None)</option>';

    try {
        const bungalows = await window.api.listBungalows();
        bungalows.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.bungalow;
            if (b.id === cfg.bungalow_code_id) opt.selected = true;
            selectEl.appendChild(opt);
        });
    } catch (e) {
        console.warn("Failed to load bungalow list for template config:", e);
    }

    document.getElementById('tc-edit-modal')?.classList.add('active');
}

async function handleSaveTemplateConfig(e) {
    e.preventDefault();
    const id = document.getElementById('tc-edit-id').value;
    const data = {
        map_link: document.getElementById('tc-map-link').value.trim(),
        default_checkout_time: document.getElementById('tc-default-checkout-time').value || '11:00:00',
        is_active: document.getElementById('tc-is-active').checked,
        bungalow_code_id: document.getElementById('tc-bungalow-select').value || null
    };

    try {
        await window.api.updateTemplateConfig(id, data);
        document.getElementById('tc-edit-modal')?.classList.remove('active');
        await loadTemplateConfigs();
    } catch (err) {
        alert("Failed to save template configuration: " + err.message);
    }
}

// ==================================================
// 3. WHATSAPP TEMPLATE SEND LOG
// ==================================================

async function openTemplateSendsModal() {
    document.getElementById('template-sends-modal')?.classList.add('active');
    templateSendsPage = 1;
    await loadTemplateSends();
}

function closeTemplateSendsModal() {
    document.getElementById('template-sends-modal')?.classList.remove('active');
}

async function loadTemplateSends() {
    const template_key = document.getElementById('ts-template-filter')?.value.trim() || '';
    const status = document.getElementById('ts-status-filter')?.value || '';
    const tbody = document.getElementById('ts-tbody');

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="list-loading"></td></tr>';

    try {
        const data = await window.api.getTemplateSends({ template_key, status, page: templateSendsPage, limit: 30 });
        currentTemplateSends = data.sends;
        renderTemplateSends(data.has_more);
    } catch (err) {
        console.error("Failed to load template sends log:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red); padding:1rem; text-align:center;">Failed to load send logs.</td></tr>`;
    }
}

function renderTemplateSends(hasMore) {
    const tbody = document.getElementById('ts-tbody');
    if (!tbody) return;

    if (currentTemplateSends.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No template send logs found.</td></tr>';
        return;
    }

    let html = '';
    currentTemplateSends.forEach(s => {
        const tsFormatted = s.timestamp ? new Date(s.timestamp).toLocaleString() : 'N/A';
        html += `
            <tr>
                <td style="font-weight:600; color:var(--accent-teal);">${escapeHtml(s.template_key)}</td>
                <td>${escapeHtml(s.phone)}</td>
                <td><span class="status-badge" style="background:rgba(255,255,255,0.05); color:var(--text-primary);">${escapeHtml(s.language || 'EN')}</span></td>
                <td><span class="status-badge ${s.status === 'sent' || s.status === 'delivered' ? '' : 'inactive'}">${escapeHtml(s.status)}</span></td>
                <td style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(tsFormatted)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Page indicator & buttons
    const prevBtn = document.getElementById('ts-prev-page-btn');
    const nextBtn = document.getElementById('ts-next-page-btn');
    const pageNum = document.getElementById('ts-page-num');

    if (pageNum) pageNum.textContent = `Page ${templateSendsPage}`;
    if (prevBtn) prevBtn.disabled = (templateSendsPage <= 1);
    if (nextBtn) nextBtn.disabled = !hasMore;
}

// Global escapeHtml helper if not defined elsewhere
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
