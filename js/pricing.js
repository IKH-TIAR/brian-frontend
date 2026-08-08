document.addEventListener('DOMContentLoaded', () => {
    // Open/Close Pricing Modal
    const openBtn = document.getElementById('open-pricing-btn');
    const closeBtn = document.getElementById('close-pricing-btn');
    const modal = document.getElementById('pricing-modal');

    if (openBtn) openBtn.addEventListener('click', openPricingModal);
    if (closeBtn) closeBtn.addEventListener('click', closePricingModal);

    // Tab buttons
    const tabBtns = document.querySelectorAll('.pricing-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.pricing-tab-panel').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.dataset.tab;
            document.getElementById(`tab-pricing-${targetTab}`).classList.add('active');
            loadTabContent(targetTab);
        });
    });

    // Form Submissions
    setupRatePlanEditForm();
    setupBulkAdjustForm();
    setupSeasonPeriodForm();
    setupPromotionForm();
    setupSettingsForm();

    // Matrix Filters
    document.getElementById('matrix-property-filter')?.addEventListener('change', renderPricingMatrix);
    document.getElementById('matrix-tier-filter')?.addEventListener('change', renderPricingMatrix);
    document.getElementById('save-matrix-btn')?.addEventListener('click', savePricingMatrix);
    document.getElementById('bulk-adjust-btn')?.addEventListener('click', openBulkAdjustModal);
    document.getElementById('add-season-period-btn')?.addEventListener('click', () => openSeasonPeriodModal());
    document.getElementById('add-promotion-btn')?.addEventListener('click', () => openPromotionModal());
});

let currentPropertiesData = [];
let currentMatrixData = null;
let currentSeasonsData = [];
let currentPromotionsData = [];
let modifiedMatrixPrices = {};

async function openPricingModal() {
    document.getElementById('pricing-modal').classList.add('active');
    // Default to active tab
    const activeTab = document.querySelector('.pricing-tab-btn.active')?.dataset.tab || 'properties';
    await loadTabContent(activeTab);
}

function closePricingModal() {
    document.getElementById('pricing-modal').classList.remove('active');
}

async function loadTabContent(tab) {
    try {
        if (tab === 'properties') {
            await loadPricingProperties();
        } else if (tab === 'matrix') {
            await loadPricingMatrix();
        } else if (tab === 'seasons') {
            await loadPricingSeasons();
        } else if (tab === 'promotions') {
            await loadPricingPromotions();
        } else if (tab === 'settings') {
            await loadPricingSettings();
        }
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error(`Failed loading tab ${tab}:`, e);
    }
}

// ==================================================
// 1. PROPERTIES & RATE PLANS TAB
// ==================================================

async function loadPricingProperties() {
    currentPropertiesData = await window.api.getPricingProperties();
    renderPricingProperties();
}

function renderPricingProperties() {
    const tbody = document.getElementById('pricing-properties-tbody');
    const cardsContainer = document.getElementById('pricing-properties-cards');
    if (!tbody) return;

    tbody.innerHTML = '';
    cardsContainer.innerHTML = '';

    currentPropertiesData.forEach(prop => {
        prop.rate_plans.forEach(plan => {
            // Table row
            const tr = document.createElement('tr');
            const displayName = prop.rate_plans.length > 1 ? `${prop.name} — ${plan.name}` : prop.name;
            
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--accent-teal);">${escapeHtml(displayName)}</td>
                <td>Std: ${plan.standard_capacity} | Max: ${plan.maximum_capacity}</td>
                <td>$${plan.cleaning_fee.toFixed(2)}</td>
                <td>$${plan.extra_person_fee_per_night.toFixed(2)}</td>
                <td>$${plan.refundable_deposit.toFixed(2)}</td>
                <td><span class="status-badge ${plan.pets_allowed ? '' : 'inactive'}">${plan.pets_allowed ? 'Yes' : 'No'}</span></td>
                <td><span class="status-badge ${plan.active ? '' : 'inactive'}">${plan.active ? 'Active' : 'Disabled'}</span></td>
                <td>
                    <button class="btn-sm btn-secondary" onclick="openRatePlanEditModal('${plan.id}')">
                        <i data-lucide="edit-2" style="width:13px;height:13px;"></i> Edit
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            const card = document.createElement('div');
            card.className = 'pricing-card';
            card.innerHTML = `
                <div class="pricing-card-header">
                    <span class="pricing-card-title">${escapeHtml(displayName)}</span>
                    <button class="btn-sm btn-secondary" onclick="openRatePlanEditModal('${plan.id}')">Edit</button>
                </div>
                <div class="pricing-card-row"><span>Capacities:</span> <span>Std: ${plan.standard_capacity} / Max: ${plan.maximum_capacity}</span></div>
                <div class="pricing-card-row"><span>Cleaning Fee:</span> <span>$${plan.cleaning_fee.toFixed(2)}</span></div>
                <div class="pricing-card-row"><span>Extra Person/Nt:</span> <span>$${plan.extra_person_fee_per_night.toFixed(2)}</span></div>
                <div class="pricing-card-row"><span>Deposit:</span> <span>$${plan.refundable_deposit.toFixed(2)}</span></div>
                <div class="pricing-card-row"><span>Pets / Active:</span> <span>${plan.pets_allowed ? 'Pets Allowed' : 'No Pets'} • ${plan.active ? 'Active' : 'Disabled'}</span></div>
            `;
            cardsContainer.appendChild(card);
        });
    });
}

function openRatePlanEditModal(planId) {
    let targetPlan = null;
    let targetProp = null;
    for (const prop of currentPropertiesData) {
        for (const rp of prop.rate_plans) {
            if (rp.id === planId) {
                targetPlan = rp;
                targetProp = prop;
                break;
            }
        }
    }
    if (!targetPlan) return;

    document.getElementById('rpe-plan-id').value = targetPlan.id;
    document.getElementById('rate-plan-edit-title').textContent = `Edit ${targetProp.name} (${targetPlan.name})`;
    document.getElementById('rpe-name').value = targetPlan.name;
    document.getElementById('rpe-std-cap').value = targetPlan.standard_capacity;
    document.getElementById('rpe-max-cap').value = targetPlan.maximum_capacity;
    document.getElementById('rpe-cleaning-fee').value = targetPlan.cleaning_fee;
    document.getElementById('rpe-extra-person-fee').value = targetPlan.extra_person_fee_per_night;
    document.getElementById('rpe-deposit').value = targetPlan.refundable_deposit;
    document.getElementById('rpe-pets-allowed').checked = targetPlan.pets_allowed;
    document.getElementById('rpe-active').checked = targetPlan.active;

    document.getElementById('rate-plan-edit-modal').classList.add('active');
}

function setupRatePlanEditForm() {
    const form = document.getElementById('rate-plan-edit-form');
    const cancelBtn = document.getElementById('cancel-rpe-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => document.getElementById('rate-plan-edit-modal').classList.remove('active'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const planId = document.getElementById('rpe-plan-id').value;
            const data = {
                name: document.getElementById('rpe-name').value.trim(),
                standard_capacity: parseInt(document.getElementById('rpe-std-cap').value, 10),
                maximum_capacity: parseInt(document.getElementById('rpe-max-cap').value, 10),
                cleaning_fee: parseFloat(document.getElementById('rpe-cleaning-fee').value),
                extra_person_fee_per_night: parseFloat(document.getElementById('rpe-extra-person-fee').value),
                refundable_deposit: parseFloat(document.getElementById('rpe-deposit').value),
                pets_allowed: document.getElementById('rpe-pets-allowed').checked,
                active: document.getElementById('rpe-active').checked,
            };

            if (data.maximum_capacity < data.standard_capacity) {
                alert("Maximum capacity cannot be less than standard capacity.");
                return;
            }

            try {
                await window.api.updatePricingRatePlan(planId, data);
                document.getElementById('rate-plan-edit-modal').classList.remove('active');
                await loadPricingProperties();
            } catch (err) {
                alert("Failed to update rate plan: " + err.message);
            }
        });
    }
}

// ==================================================
// 2. SEASONAL PRICES MATRIX TAB
// ==================================================

async function loadPricingMatrix() {
    currentMatrixData = await window.api.getPricingMatrix();
    modifiedMatrixPrices = {};
    populateMatrixFilters();
    renderPricingMatrix();
}

function populateMatrixFilters() {
    const propSelect = document.getElementById('matrix-property-filter');
    if (!propSelect || !currentMatrixData) return;

    propSelect.innerHTML = '<option value="">All Properties</option>';
    currentMatrixData.properties.forEach(p => {
        p.rate_plans.forEach(rp => {
            const displayName = p.rate_plans.length > 1 ? `${p.name} — ${rp.name}` : p.name;
            const opt = document.createElement('option');
            opt.value = rp.id;
            opt.textContent = displayName;
            propSelect.appendChild(opt);
        });
    });
}

function renderPricingMatrix() {
    if (!currentMatrixData) return;

    const thead = document.getElementById('pricing-matrix-thead');
    const tbody = document.getElementById('pricing-matrix-tbody');
    const selectedPlanId = document.getElementById('matrix-property-filter').value;
    const selectedTierCode = document.getElementById('matrix-tier-filter').value;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Filter Tiers
    const activeTiers = currentMatrixData.tiers.filter(t => !selectedTierCode || t.code === selectedTierCode);

    // Build Header Row
    const headerTr = document.createElement('tr');
    headerTr.innerHTML = '<th>Property / Configuration</th><th>Tier</th>';
    currentMatrixData.seasons.forEach(s => {
        headerTr.innerHTML += `<th>${escapeHtml(s.name)}</th>`;
    });
    thead.appendChild(headerTr);

    // Build Body Rows
    currentMatrixData.properties.forEach(prop => {
        prop.rate_plans.forEach(plan => {
            if (selectedPlanId && plan.id !== selectedPlanId) return;

            const displayName = prop.rate_plans.length > 1 ? `${prop.name} — ${plan.name}` : prop.name;

            activeTiers.forEach((tier, tIdx) => {
                const tr = document.createElement('tr');
                let html = '';

                // Property name column spans row count of tiers
                if (tIdx === 0) {
                    html += `<td rowspan="${activeTiers.length}" style="font-weight: 600; vertical-align: middle; border-right: 1px solid var(--border);">${escapeHtml(displayName)}</td>`;
                }

                html += `<td style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">${escapeHtml(tier.code)}</td>`;

                currentMatrixData.seasons.forEach(season => {
                    const key = `${plan.id}_${season.id}_${tier.id}`;
                    const existing = modifiedMatrixPrices[key] !== undefined ? modifiedMatrixPrices[key] : (currentMatrixData.prices[key]?.nightly_rate || 0);

                    html += `
                        <td>
                            <input type="number" step="1" min="0" 
                                class="matrix-price-input ${modifiedMatrixPrices[key] !== undefined ? 'modified' : ''}" 
                                data-plan-id="${plan.id}" 
                                data-season-id="${season.id}" 
                                data-tier-id="${tier.id}" 
                                value="${existing}" 
                                onchange="onMatrixPriceChange(this)">
                        </td>
                    `;
                });

                tr.innerHTML = html;
                tbody.appendChild(tr);
            });
        });
    });

    if (window.lucide) lucide.createIcons();
}

function onMatrixPriceChange(inputEl) {
    const planId = inputEl.dataset.planId;
    const seasonId = inputEl.dataset.seasonId;
    const tierId = inputEl.dataset.tierId;
    const val = parseFloat(inputEl.value) || 0;

    const key = `${planId}_${seasonId}_${tierId}`;
    modifiedMatrixPrices[key] = val;
    inputEl.classList.add('modified');
}

async function savePricingMatrix() {
    const keys = Object.keys(modifiedMatrixPrices);
    if (keys.length === 0) {
        alert("No price changes to save.");
        return;
    }

    const saveBtn = document.getElementById('save-matrix-btn');
    const origText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const items = keys.map(k => {
        const [planId, seasonId, tierId] = k.split('_');
        return {
            property_rate_plan_id: planId,
            season_id: seasonId,
            pricing_tier_id: tierId,
            nightly_rate: modifiedMatrixPrices[k],
            active: true
        };
    });

    try {
        await window.api.updatePricingMatrix(items);
        modifiedMatrixPrices = {};
        await loadPricingMatrix();
        alert("Seasonal prices updated successfully!");
    } catch (e) {
        alert("Failed to save prices: " + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
    }
}

// Bulk Price Adjust Modal
function openBulkAdjustModal() {
    if (!currentMatrixData) return;

    const container = document.getElementById('ba-seasons-checkboxes');
    container.innerHTML = '';

    currentMatrixData.seasons.forEach(s => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.style.marginBottom = '0';
        label.style.fontSize = '0.8rem';
        label.innerHTML = `<input type="checkbox" name="ba-season" value="${s.id}" checked> ${escapeHtml(s.name)}`;
        container.appendChild(label);
    });

    document.getElementById('bulk-adjust-modal').classList.add('active');
}

function setupBulkAdjustForm() {
    const form = document.getElementById('bulk-adjust-form');
    const cancelBtn = document.getElementById('cancel-ba-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => document.getElementById('bulk-adjust-modal').classList.remove('active'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const adjType = document.getElementById('ba-type').value;
            const amount = parseFloat(document.getElementById('ba-amount').value);
            const intlChecked = document.getElementById('ba-tier-intl').checked;
            const localChecked = document.getElementById('ba-tier-local').checked;

            const selectedSeasons = Array.from(document.querySelectorAll('input[name="ba-season"]:checked')).map(el => el.value);

            if (isNaN(amount) || amount < 0) {
                alert("Please enter a valid positive amount.");
                return;
            }
            if (selectedSeasons.length === 0) {
                alert("Please select at least one season.");
                return;
            }

            const tierCodes = [];
            if (intlChecked) tierCodes.push("INTERNATIONAL");
            if (localChecked) tierCodes.push("LOCAL");

            if (tierCodes.length === 0) {
                alert("Please select at least one pricing tier.");
                return;
            }

            const applyBtn = document.getElementById('apply-ba-btn');
            applyBtn.disabled = true;
            applyBtn.textContent = "Applying...";

            try {
                const res = await window.api.bulkAdjustPrices({
                    adjustment_type: adjType,
                    amount: amount,
                    season_ids: selectedSeasons,
                    tier_codes: tierCodes
                });
                document.getElementById('bulk-adjust-modal').classList.remove('active');
                await loadPricingMatrix();
                alert(`Bulk adjustment applied to ${res.updated_count} price records!`);
            } catch (err) {
                alert("Bulk adjustment failed: " + err.message);
            } finally {
                applyBtn.disabled = false;
                applyBtn.textContent = "Apply Adjustment";
            }
        });
    }
}

// ==================================================
// 3. SEASONS & DATES TAB
// ==================================================

async function loadPricingSeasons() {
    currentSeasonsData = await window.api.getPricingSeasons();
    renderPricingSeasons();
}

function renderPricingSeasons() {
    const container = document.getElementById('seasons-container');
    if (!container) return;

    container.innerHTML = '';

    currentSeasonsData.forEach(season => {
        const card = document.createElement('div');
        card.className = 'season-card';

        let periodsHtml = '';
        if (season.periods.length === 0) {
            periodsHtml = '<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">No date ranges defined.</p>';
        } else {
            periodsHtml = '<div class="periods-list">';
            season.periods.forEach(p => {
                const warningTag = p.has_overlap ? `<span class="overlap-warning-badge" title="${p.overlap_details.join('; ')}">⚠️ Overlap Warning</span>` : '';
                periodsHtml += `
                    <div class="period-item">
                        <div>
                            <span style="font-weight: 600;">${p.start_date}</span> to <span style="font-weight: 600;">${p.end_date}</span>
                            ${p.notes ? `<span class="period-notes">(${escapeHtml(p.notes)})</span>` : ''}
                            ${warningTag}
                        </div>
                        <div class="period-actions">
                            <button class="btn-sm btn-secondary" onclick="openSeasonPeriodModal('${p.id}')">Edit</button>
                            <button class="btn-sm btn-delete" onclick="deleteSeasonPeriod('${p.id}')">Delete</button>
                        </div>
                    </div>
                `;
            });
            periodsHtml += '</div>';
        }

        card.innerHTML = `
            <div class="season-card-header">
                <div>
                    <span class="season-card-name">${escapeHtml(season.name)}</span>
                    <span class="season-card-code">(${escapeHtml(season.code)})</span>
                    <span class="season-card-priority">Priority: ${season.priority}</span>
                </div>
                <button class="btn-sm btn-primary" onclick="openSeasonPeriodModal(null, '${season.id}')">
                    + Add Range
                </button>
            </div>
            ${periodsHtml}
        `;
        container.appendChild(card);
    });
}

function openSeasonPeriodModal(periodId = null, seasonId = null) {
    const select = document.getElementById('sp-season-select');
    select.innerHTML = '';

    currentSeasonsData.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.code})`;
        select.appendChild(opt);
    });

    if (periodId) {
        document.getElementById('sp-modal-title').textContent = "Edit Season Date Range";
        document.getElementById('sp-edit-id').value = periodId;

        // Find period
        let foundP = null;
        for (const s of currentSeasonsData) {
            for (const p of s.periods) {
                if (p.id === periodId) {
                    foundP = p;
                    break;
                }
            }
        }
        if (foundP) {
            select.value = foundP.season_id;
            document.getElementById('sp-start-date').value = foundP.start_date;
            document.getElementById('sp-end-date').value = foundP.end_date;
            document.getElementById('sp-notes').value = foundP.notes;
        }
    } else {
        document.getElementById('sp-modal-title').textContent = "Add Season Date Range";
        document.getElementById('sp-edit-id').value = "";
        if (seasonId) select.value = seasonId;
        document.getElementById('sp-start-date').value = "";
        document.getElementById('sp-end-date').value = "";
        document.getElementById('sp-notes').value = "";
    }

    document.getElementById('season-period-modal').classList.add('active');
}

function setupSeasonPeriodForm() {
    const form = document.getElementById('season-period-form');
    const cancelBtn = document.getElementById('cancel-sp-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => document.getElementById('season-period-modal').classList.remove('active'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('sp-edit-id').value;
            const seasonId = document.getElementById('sp-season-select').value;
            const startDate = document.getElementById('sp-start-date').value;
            const endDate = document.getElementById('sp-end-date').value;
            const notes = document.getElementById('sp-notes').value.trim();

            if (endDate < startDate) {
                alert("End date cannot be earlier than start date.");
                return;
            }

            try {
                if (editId) {
                    await window.api.updateSeasonPeriod(editId, { start_date: startDate, end_date: endDate, notes: notes });
                } else {
                    await window.api.createSeasonPeriod({ season_id: seasonId, start_date: startDate, end_date: endDate, notes: notes });
                }
                document.getElementById('season-period-modal').classList.remove('active');
                await loadPricingSeasons();
            } catch (err) {
                alert("Failed to save date range: " + err.message);
            }
        });
    }
}

async function deleteSeasonPeriod(periodId) {
    if (!confirm("Are you sure you want to remove this date range?")) return;
    try {
        await window.api.deleteSeasonPeriod(periodId);
        await loadPricingSeasons();
    } catch (e) {
        alert("Failed to delete date range: " + e.message);
    }
}

// ==================================================
// 4. PROMOTIONS TAB
// ==================================================

async function loadPricingPromotions() {
    currentPromotionsData = await window.api.getPromotions();
    if (currentPropertiesData.length === 0) {
        currentPropertiesData = await window.api.getPricingProperties();
    }
    renderPricingPromotions();
}

function renderPricingPromotions() {
    const container = document.getElementById('promotions-container');
    if (!container) return;

    container.innerHTML = '';

    if (currentPromotionsData.length === 0) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 2rem;">No promotions active. Click "Add Promotion" to create one.</p>';
        return;
    }

    currentPromotionsData.forEach(promo => {
        const card = document.createElement('div');
        card.className = 'promotion-card';

        let pricesListHtml = '';
        if (promo.property_prices.length > 0) {
            pricesListHtml = '<div class="promo-prices-grid">';
            promo.property_prices.forEach(pp => {
                pricesListHtml += `
                    <div class="promo-price-chip">
                        <span>${escapeHtml(pp.display_name || pp.property_name || pp.rate_plan_code)}:</span>
                        <strong style="color: var(--accent-teal);">$${pp.nightly_rate.toFixed(2)}</strong>
                    </div>
                `;
            });
            pricesListHtml += '</div>';
        }

        card.innerHTML = `
            <div class="promotion-card-header">
                <div>
                    <span class="promotion-title">${escapeHtml(promo.name)}</span>
                    <span class="status-badge ${promo.enabled ? '' : 'inactive'}">${promo.enabled ? 'Enabled' : 'Disabled'}</span>
                    ${promo.waive_pet_fee ? '<span class="status-badge" style="background: rgba(13, 148, 136, 0.2); color: #5eead4;">Pet Fee Waived</span>' : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-sm btn-secondary" onclick="openPromotionModal('${promo.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deletePromotion('${promo.id}')">Delete</button>
                </div>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${escapeHtml(promo.description || '')}</p>
            <div style="font-size: 0.8rem; margin-bottom: 0.75rem;">
                <strong>Dates:</strong> ${promo.start_date} to ${promo.end_date} (Priority: ${promo.priority})
            </div>
            ${pricesListHtml}
        `;
        container.appendChild(card);
    });
}

function openPromotionModal(promoId = null) {
    const listContainer = document.getElementById('promo-properties-list');
    listContainer.innerHTML = '';

    let existingPromo = null;
    if (promoId) {
        existingPromo = currentPromotionsData.find(p => p.id === promoId);
    }

    if (existingPromo) {
        document.getElementById('promo-modal-title').textContent = "Edit Promotion";
        document.getElementById('promo-edit-id').value = existingPromo.id;
        document.getElementById('promo-name').value = existingPromo.name;
        document.getElementById('promo-desc').value = existingPromo.description || "";
        document.getElementById('promo-start-date').value = existingPromo.start_date;
        document.getElementById('promo-end-date').value = existingPromo.end_date;
        document.getElementById('promo-enabled').checked = existingPromo.enabled;
        document.getElementById('promo-waive-pet').checked = existingPromo.waive_pet_fee;
    } else {
        document.getElementById('promo-modal-title').textContent = "Add Promotion";
        document.getElementById('promo-edit-id').value = "";
        document.getElementById('promo-name').value = "";
        document.getElementById('promo-desc').value = "";
        document.getElementById('promo-start-date').value = "";
        document.getElementById('promo-end-date').value = "";
        document.getElementById('promo-enabled').checked = true;
        document.getElementById('promo-waive-pet').checked = false;
    }

    // Populate properties list with price inputs
    currentPropertiesData.forEach(prop => {
        prop.rate_plans.forEach(plan => {
            const displayName = prop.rate_plans.length > 1 ? `${prop.name} — ${plan.name}` : prop.name;
            const existingPp = existingPromo ? existingPromo.property_prices.find(pp => pp.property_rate_plan_id === plan.id) : null;
            const isChecked = existingPp !== undefined && existingPp !== null;
            const rateVal = existingPp ? existingPp.nightly_rate : "";

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifySpaceBetween = 'space-between';
            row.style.alignItems = 'center';
            row.style.gap = '1rem';

            row.innerHTML = `
                <label class="checkbox-label" style="margin-bottom: 0; flex: 1; font-size: 0.8rem;">
                    <input type="checkbox" class="promo-plan-checkbox" data-plan-id="${plan.id}" ${isChecked ? 'checked' : ''} onchange="togglePromoRateInput(this)"> ${escapeHtml(displayName)}
                </label>
                <input type="number" step="0.01" min="0" placeholder="Nightly Rate ($)" 
                    class="promo-plan-rate-input" 
                    id="promo-rate-${plan.id}" 
                    value="${rateVal}" 
                    ${isChecked ? '' : 'disabled'} 
                    style="width: 130px; padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-dark); color: white;">
            `;
            listContainer.appendChild(row);
        });
    });

    document.getElementById('promotion-form-modal').classList.add('active');
}

function togglePromoRateInput(checkbox) {
    const planId = checkbox.dataset.planId;
    const input = document.getElementById(`promo-rate-${planId}`);
    if (input) {
        input.disabled = !checkbox.checked;
        if (!checkbox.checked) input.value = '';
    }
}

function setupPromotionForm() {
    const form = document.getElementById('promotion-form');
    const cancelBtn = document.getElementById('cancel-promo-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => document.getElementById('promotion-form-modal').classList.remove('active'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('promo-edit-id').value;
            const name = document.getElementById('promo-name').value.trim();
            const desc = document.getElementById('promo-desc').value.trim();
            const startDate = document.getElementById('promo-start-date').value;
            const endDate = document.getElementById('promo-end-date').value;
            const enabled = document.getElementById('promo-enabled').checked;
            const waivePet = document.getElementById('promo-waive-pet').checked;

            if (endDate < startDate) {
                alert("End date cannot be earlier than start date.");
                return;
            }

            const propertyPrices = [];
            const checkboxes = document.querySelectorAll('.promo-plan-checkbox:checked');

            for (const cb of checkboxes) {
                const planId = cb.dataset.planId;
                const rateInput = document.getElementById(`promo-rate-${planId}`);
                const rateVal = parseFloat(rateInput.value);

                if (isNaN(rateVal) || rateVal < 0) {
                    alert("Please enter a valid non-negative rate for selected properties.");
                    return;
                }

                propertyPrices.push({
                    property_rate_plan_id: planId,
                    nightly_rate: rateVal,
                    active: true
                });
            }

            const payload = {
                name: name,
                description: desc,
                start_date: startDate,
                end_date: endDate,
                enabled: enabled,
                waive_pet_fee: waivePet,
                priority: 1000,
                property_prices: propertyPrices
            };

            try {
                if (editId) {
                    await window.api.updatePromotion(editId, payload);
                } else {
                    await window.api.createPromotion(payload);
                }
                document.getElementById('promotion-form-modal').classList.remove('active');
                await loadPricingPromotions();
            } catch (err) {
                alert("Failed to save promotion: " + err.message);
            }
        });
    }
}

async function deletePromotion(promoId) {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
        await window.api.deletePromotion(promoId);
        await loadPricingPromotions();
    } catch (e) {
        alert("Failed to delete promotion: " + e.message);
    }
}

// ==================================================
// 5. GENERAL SETTINGS TAB
// ==================================================

async function loadPricingSettings() {
    const s = await window.api.getPricingSettings();
    document.getElementById('ps-currency').value = s.currency || 'USD';
    document.getElementById('ps-pet-fee').value = s.default_pet_fee;
    document.getElementById('ps-extra-person-fee').value = s.default_extra_person_fee;
    document.getElementById('ps-deposit').value = s.multi_property_refundable_deposit;
}

function setupSettingsForm() {
    const form = document.getElementById('pricing-settings-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                currency: document.getElementById('ps-currency').value.trim(),
                default_pet_fee: parseFloat(document.getElementById('ps-pet-fee').value),
                default_extra_person_fee: parseFloat(document.getElementById('ps-extra-person-fee').value),
                multi_property_refundable_deposit: parseFloat(document.getElementById('ps-deposit').value),
            };

            const btn = document.getElementById('save-pricing-settings-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                await window.api.updatePricingSettings(data);
                alert("Pricing settings saved successfully!");
            } catch (err) {
                alert("Failed to save settings: " + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Settings';
            }
        });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
