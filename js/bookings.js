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
    document.getElementById('close-create-booking-btn')?.addEventListener('click', closeCreateBookingModal);
    document.getElementById('cancel-create-booking-btn')?.addEventListener('click', closeCreateBookingModal);

    // Bookings Filters & Actions
    document.getElementById('open-create-booking-btn')?.addEventListener('click', openCreateBookingModal);
    document.getElementById('bookings-status-filter')?.addEventListener('change', loadBookings);
    document.getElementById('bookings-search-input')?.addEventListener('input', debounce(loadBookings, 300));
    document.getElementById('bookings-date-from')?.addEventListener('change', loadBookings);
    document.getElementById('bookings-date-to')?.addEventListener('change', loadBookings);

    // Booking Forms & Actions
    function updateBalanceDue() {
        const total = parseFloat(document.getElementById('bd-total-amount')?.value) || 0;
        const deposit = parseFloat(document.getElementById('bd-deposit-amount')?.value) || 0;
        const finalPay = parseFloat(document.getElementById('bd-final-payment-amount')?.value) || 0;
        const balEl = document.getElementById('bd-balance-due');
        if (balEl) {
            balEl.value = Math.max(0, total - deposit - finalPay).toFixed(2);
        }
    }
    document.getElementById('bd-total-amount')?.addEventListener('input', updateBalanceDue);
    document.getElementById('bd-deposit-amount')?.addEventListener('input', updateBalanceDue);
    document.getElementById('bd-final-payment-amount')?.addEventListener('input', updateBalanceDue);
    document.getElementById('booking-edit-form')?.addEventListener('submit', handleSaveBooking);
    document.getElementById('delete-booking-btn')?.addEventListener('click', handleDeleteBooking);

    // Create Booking Form Balance Auto-Calculation & Submit
    function updateCreateBalanceDue() {
        const total = parseFloat(document.getElementById('cb-total-amount')?.value) || 0;
        const deposit = parseFloat(document.getElementById('cb-deposit-amount')?.value) || 0;
        const finalPay = parseFloat(document.getElementById('cb-final-payment-amount')?.value) || 0;
        const balEl = document.getElementById('cb-balance-due');
        if (balEl) {
            balEl.value = Math.max(0, total - deposit - finalPay).toFixed(2);
        }
    }
    document.getElementById('cb-total-amount')?.addEventListener('input', updateCreateBalanceDue);
    document.getElementById('cb-deposit-amount')?.addEventListener('input', updateCreateBalanceDue);
    document.getElementById('cb-final-payment-amount')?.addEventListener('input', updateCreateBalanceDue);
    document.getElementById('create-booking-form')?.addEventListener('submit', handleCreateBooking);

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
window.openCreateBookingModal = openCreateBookingModal;
window.openCreateBookingModalForContact = openCreateBookingModal;
window.closeCreateBookingModal = closeCreateBookingModal;
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

async function openCreateBookingModal(contactContext = null) {
    const modal = document.getElementById('create-booking-modal');
    if (!modal) return;

    // Use passed contactContext or fallback to active conversation thread context
    const ctx = contactContext || (window.currentContactData ? {
        contact: window.currentContactData,
        conversation: { id: window.currentConvId }
    } : null);

    if (!ctx || !ctx.contact || !ctx.contact.phone) {
        const msg = "Please select a guest conversation from the left sidebar to add a booking.";
        if (window.showToast) window.showToast(msg, "warning");
        else alert(msg);
        return;
    }

    document.getElementById('create-booking-form')?.reset();
    document.getElementById('cb-checkout-time').value = '11:00';
    document.getElementById('cb-language').value = 'english';
    document.getElementById('cb-source').value = 'direct';
    document.getElementById('cb-status').value = 'pending';
    document.getElementById('cb-total-amount').value = '0.00';
    document.getElementById('cb-deposit-amount').value = '0.00';
    document.getElementById('cb-refundable-deposit').value = '0.00';
    document.getElementById('cb-final-payment-amount').value = '0.00';
    document.getElementById('cb-balance-due').value = '0.00';

    // Populate contact fields
    const contactIdEl = document.getElementById('cb-contact-id');
    const convIdEl = document.getElementById('cb-conversation-id');
    const phoneEl = document.getElementById('cb-phone');
    const nameEl = document.getElementById('cb-guest-name');
    const modalTitle = document.getElementById('cb-modal-title');

    if (contactIdEl) contactIdEl.value = ctx.contact.id || '';
    if (convIdEl) convIdEl.value = ctx.conversation?.id || '';
    if (phoneEl) {
        phoneEl.value = ctx.contact.phone || '';
        phoneEl.readOnly = true;
    }
    if (nameEl) {
        const rawName = ctx.contact.name || '';
        nameEl.value = rawName.toLowerCase() === 'unknown guest' ? '' : rawName;
    }
    if (modalTitle) {
        modalTitle.textContent = `Create Booking for ${ctx.contact.name || ctx.contact.phone}`;
    }

    // Populate Bungalow selector dropdown
    try {
        const properties = await window.api.getPricingProperties();
        const propSelect = document.getElementById('cb-property');
        if (propSelect) {
            propSelect.innerHTML = '<option value="">-- Select Bungalow --</option>';
            (properties || []).forEach(p => {
                if (p.active !== false) {
                    propSelect.innerHTML += `<option value="${p.id}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`;
                }
            });
        }
    } catch (e) {
        console.error("Failed to load properties for create booking:", e);
    }

    modal.classList.add('active');
    if (window.lucide) lucide.createIcons({}, modal);
}

function closeCreateBookingModal() {
    document.getElementById('create-booking-modal')?.classList.remove('active');
}

async function handleCreateBooking(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('save-create-booking-btn');
    const cancelBtn = document.getElementById('cancel-create-booking-btn');
    if (submitBtn.disabled) return;
    const origHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Creating...';

    const contactId = document.getElementById('cb-contact-id')?.value || null;
    const convId = document.getElementById('cb-conversation-id')?.value || null;
    const phone = document.getElementById('cb-phone').value.trim();
    const guestName = document.getElementById('cb-guest-name').value.trim();
    const checkIn = document.getElementById('cb-check-in').value;
    const checkOut = document.getElementById('cb-check-out').value;
    const checkoutTime = document.getElementById('cb-checkout-time').value || '11:00:00';
    const guestCount = parseInt(document.getElementById('cb-guest-count').value, 10) || 1;
    const hasPets = document.getElementById('cb-has-pets').checked;
    const language = document.getElementById('cb-language').value || 'english';
    const source = document.getElementById('cb-source').value || 'direct';
    const status = document.getElementById('cb-status').value || 'pending';
    const ref = document.getElementById('cb-ref').value.trim() || null;
    const total = parseFloat(document.getElementById('cb-total-amount').value) || 0;
    const deposit = parseFloat(document.getElementById('cb-deposit-amount').value) || 0;
    const refundable = parseFloat(document.getElementById('cb-refundable-deposit').value) || 0;
    const finalPay = parseFloat(document.getElementById('cb-final-payment-amount').value) || 0;
    const balance = parseFloat(document.getElementById('cb-balance-due').value) || 0;
    const depositDue = document.getElementById('cb-deposit-due-date').value || null;
    const paymentDue = document.getElementById('cb-payment-due-date').value || null;
    const notes = document.getElementById('cb-notes').value.trim() || null;

    const propSelect = document.getElementById('cb-property');
    const selectedPropId = propSelect?.value;
    const selectedPropName = propSelect?.selectedOptions[0]?.dataset.name || propSelect?.selectedOptions[0]?.text;

    const units = [];
    if (selectedPropId) {
        units.push({
            property_id: selectedPropId,
            unit_name_snapshot: selectedPropName !== '-- Select Bungalow --' ? selectedPropName : 'Unit',
            accommodation_amount: total,
            cleaning_fee: 0,
            pet_fee: 0,
            discount_amount: 0,
            unit_total: total
        });
    }

    const payload = {
        contact_id: contactId,
        conversation_id: convId,
        phone: phone,
        guest_name: guestName,
        guest_first_name: guestName.split(' ')[0],
        check_in: checkIn,
        check_out: checkOut,
        checkout_time: checkoutTime.length === 5 ? `${checkoutTime}:00` : checkoutTime,
        guest_count: guestCount,
        has_pets: hasPets,
        language_tag: language,
        currency: 'USD',
        source: source,
        status: status,
        reservation_reference: ref,
        total_amount: total,
        deposit_amount: deposit,
        refundable_deposit: refundable,
        final_payment_amount: finalPay,
        balance_due: balance,
        deposit_due_date: depositDue,
        payment_due_date: paymentDue,
        internal_notes: notes,
        units: units
    };

    try {
        const created = await window.api.createBooking(payload);
        if (window.showToast) window.showToast("Booking created successfully!", "success");
        closeCreateBookingModal();
        await loadBookings();
        if (typeof window.loadThread === 'function' && window.currentPhone) {
            window.loadThread(window.currentPhone);
        }
    } catch (err) {
        console.error("Failed to create booking:", err);
        if (window.showToast) window.showToast("Failed to create booking: " + (err.message || err), "error");
        else alert("Failed to create booking: " + (err.message || err));
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
        if (cancelBtn) cancelBtn.disabled = false;
    }
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
    const modal = document.getElementById('booking-detail-modal');
    const spinner = document.getElementById('bd-loading-spinner');
    const form = document.getElementById('booking-edit-form');
    const statusContainer = document.getElementById('bd-status-container');
    const titleEl = document.getElementById('bd-title');

    if (modal) modal.classList.add('active');

    // Show loading state immediately while fetching
    if (spinner) spinner.style.display = 'block';
    if (form) form.style.display = 'none';
    if (statusContainer) statusContainer.style.display = 'none';
    if (titleEl) titleEl.textContent = 'Loading Booking Details...';

    try {
        currentBookingDetail = await window.api.getBooking(bookingId);
        renderBookingDetail();
        if (spinner) spinner.style.display = 'none';
        if (form) form.style.display = 'block';
        if (statusContainer) statusContainer.style.display = 'flex';
    } catch (err) {
        if (spinner) spinner.style.display = 'none';
        if (titleEl) titleEl.textContent = 'Error Loading Booking';
        if (window.showToast) window.showToast("Failed to load booking details: " + err.message, "error");
        else alert("Failed to load booking details: " + err.message);
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
    document.getElementById('bd-final-payment-amount').value = b.final_payment_amount || 0;
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
    const bookingId = b.id;
    const firstUnitId = (b.units && b.units.length > 0) ? b.units[0].id : '';
    cmdContainer.innerHTML = `
        <div style="width:100%; margin-bottom:0.5rem;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.35rem; text-transform:uppercase; letter-spacing:0.5px;">Automated Templates (via n8n)</div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button class="btn-sm btn-secondary" style="border-color:var(--accent-teal);" onclick="sendBookingTemplate('${bookingId}', 'pre_arrival', '${firstUnitId}')">
                    <i data-lucide="door-open" style="width:13px;height:13px;"></i> Pre-Arrival
                </button>
                <button class="btn-sm btn-secondary" style="border-color:var(--accent-teal);" onclick="sendBookingTemplate('${bookingId}', 'pre_checkout')">
                    <i data-lucide="log-out" style="width:13px;height:13px;"></i> Pre-Checkout
                </button>
                <button class="btn-sm btn-secondary" style="border-color:var(--accent-teal);" onclick="sendBookingTemplate('${bookingId}', 'post_checkout_thankyou')">
                    <i data-lucide="heart" style="width:13px;height:13px;"></i> Post-Checkout Thank You
                </button>
            </div>
        </div>
        <div style="width:100%;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.35rem; text-transform:uppercase; letter-spacing:0.5px;">Quick Commands (via admin webhook)</div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
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
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons({}, document.getElementById('booking-detail-modal'));
}

async function triggerStatusTransition(bookingId, newStatus) {
    const isCancel = newStatus === 'cancelled';
    const confirmed = await window.showConfirmModal({
        title: isCancel ? 'Cancel Booking' : 'Update Booking Status',
        message: `Are you sure you want to change this booking status to ${newStatus.toUpperCase()}?`,
        confirmText: isCancel ? 'Cancel Booking' : 'Update Status',
        cancelText: 'Keep Current Status',
        isDanger: isCancel,
        icon: isCancel ? '🚫' : '🔄'
    });

    if (!confirmed) return;

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

    const confirmed = await window.showConfirmModal({
        title: 'Delete Booking',
        message: `Are you sure you want to PERMANENTLY DELETE the booking for "${bName}"?\n\nThis action cannot be undone.`,
        confirmText: 'Delete Booking',
        cancelText: 'Cancel',
        isDanger: true,
        icon: '🗑️'
    });

    if (!confirmed) return;

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
        final_payment_amount: parseFloat(document.getElementById('bd-final-payment-amount')?.value) || 0,
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
        if (typeof window.loadThread === 'function' && window.currentPhone) {
            window.loadThread(window.currentPhone);
        }
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
        const val = prompt("Enter balance due amount (press OK to auto-pull from booking DB):", amount || "");
        if (val !== null && val.trim() !== '') {
            const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) {
                params = { amount: `$${num.toFixed(2)}` };
            }
        }
    }
    try {
        await window.api.executeCommand(commandCode, phone, params);
        if (window.showToast) window.showToast(`Command '${commandCode}' executed successfully!`, "success");
    } catch (err) {
        if (window.showToast) window.showToast("Command execution failed: " + err.message, "error");
        else alert("Command execution failed: " + err.message);
    }
}

// Ensure sendTemplate is available even if api.js was served from older browser cache
if (window.ApiClient && !window.ApiClient.prototype.sendTemplate) {
    window.ApiClient.prototype.sendTemplate = async function(bookingId, templateKey, bookingUnitId = null) {
        const payload = { template_key: templateKey };
        if (bookingUnitId) payload.booking_unit_id = bookingUnitId;
        return this.request(`/admin/bookings/${encodeURIComponent(bookingId)}/send-template`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    };
}
if (window.api && typeof window.api.sendTemplate !== 'function') {
    window.api.sendTemplate = async function(bookingId, templateKey, bookingUnitId = null) {
        const payload = { template_key: templateKey };
        if (bookingUnitId) payload.booking_unit_id = bookingUnitId;
        return this.request(`/admin/bookings/${encodeURIComponent(bookingId)}/send-template`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    };
}

/**
 * Send a WhatsApp template via the new n8n Template Dispatcher pipeline.
 * Backend assembles all 20 fields, POSTs to n8n webhook, which calls the sub-workflow.
 */
async function sendBookingTemplate(bookingId, templateKey, bookingUnitId = '', triggerBtn = null) {
    if (!bookingId) {
        if (window.showToast) window.showToast("No booking selected.", "warning");
        return;
    }

    const friendlyNames = {
        pre_arrival: 'Pre-Arrival Check-in Details',
        pre_checkout: 'Pre-Checkout Reminder',
        post_checkout_thankyou: 'Post-Checkout Thank You'
    };
    const friendlyName = friendlyNames[templateKey] || templateKey;

    // Confirmation dialog
    const confirmed = await window.showConfirmModal({
        title: `Send ${friendlyName}`,
        message: `Are you sure you want to send the "${friendlyName}" WhatsApp template to this guest?\n\nThis will send the template message immediately via WhatsApp. Duplicate sends are automatically prevented.`,
        confirmText: 'Send Template',
        cancelText: 'Cancel',
        isDanger: false,
        icon: '📨'
    });

    if (!confirmed) return;

    // Find and disable the clicked button
    let clickedBtn = triggerBtn || null;
    if (!clickedBtn) {
        const candidateBtns = document.querySelectorAll('#bd-commands-container button, #reservation-details button, #commands-container button');
        candidateBtns.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(friendlyName.split(' ')[0].toLowerCase())) {
                clickedBtn = btn;
            }
        });
    }
    const origHtml = clickedBtn ? clickedBtn.innerHTML : null;
    if (clickedBtn) {
        clickedBtn.disabled = true;
        clickedBtn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span> Sending...';
    }

    try {
        let result;
        if (window.api && typeof window.api.sendTemplate === 'function') {
            result = await window.api.sendTemplate(bookingId, templateKey, bookingUnitId || null);
        } else if (window.api && typeof window.api.request === 'function') {
            const payload = { template_key: templateKey };
            if (bookingUnitId) payload.booking_unit_id = bookingUnitId;
            result = await window.api.request(`/admin/bookings/${encodeURIComponent(bookingId)}/send-template`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } else {
            throw new Error("API client not available");
        }

        if (result.duplicate) {
            if (window.showToast) window.showToast(`"${friendlyName}" was already sent for this booking (duplicate prevented).`, "warning");
        } else {
            if (window.showToast) window.showToast(`"${friendlyName}" sent successfully! 🎉`, "success");
        }

        // Refresh thread if viewing this conversation
        if (typeof window.loadThread === 'function' && window.currentPhone) {
            window.loadThread(window.currentPhone);
        }
    } catch (err) {
        const errMsg = err.message || String(err);
        if (window.showToast) window.showToast(`Failed to send "${friendlyName}": ${errMsg}`, "error");
        else alert(`Failed to send template: ${errMsg}`);
    } finally {
        // Re-enable button
        if (clickedBtn) {
            clickedBtn.disabled = false;
            if (origHtml) {
                clickedBtn.innerHTML = origHtml;
            } else {
                const iconMap = { pre_arrival: 'door-open', pre_checkout: 'log-out', post_checkout_thankyou: 'heart' };
                const icon = iconMap[templateKey] || 'send';
                clickedBtn.innerHTML = `<i data-lucide="${icon}" style="width:13px;height:13px;"></i> ${friendlyName.replace('Check-in Details', '').replace('Reminder', '').replace('Thank You', 'Thank You').trim()}`;
            }
            if (window.lucide) lucide.createIcons({}, clickedBtn);
        }
    }
}
window.sendBookingTemplate = sendBookingTemplate;

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
        const bungalows = await window.api.getBungalows();
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
