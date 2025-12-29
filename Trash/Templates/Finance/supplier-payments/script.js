/* finance/supplier-payments - template estático (vanilla)
   - Carga data.json
   - Normaliza supplierPayments -> items (objeto principal: payment)
   - KPIs, filtros, orden, paginación
   - CRUD demo (en memoria)
   - Workflow: Pendiente/Aprobado/Rechazado + confirmación + bloqueo + reversa por fila
   - Reglas: ocultar editar en finalizados; reversa visible en finalizados; aprobar/rechazar deshabilitados tras acción
   - Modal View: misma estructura que Edit (form-grid), solo lectura (sin look “apagado”)

   === Especificación funcional por submódulo (variables resueltas) ===
   MODULO              = finance
   SUBMODULO           = supplier-payments
   RUTA                = finance/supplier-payments
   TABLAS (mock)       = FinanceSupplierPayment, FinanceSupplier, FinanceSupplierInvoice, FinanceStatus, FinanceFund, FinanceCostCenter, FinancePaymentMethod, FinanceCurrency
   WORKFLOW            = Pendiente/Aprobado/Rechazado
   OBJETO_PRINCIPAL    = payment
   CAMPO_FECHA         = payment_date
   CAMPO_MONTO         = payment_amount
   CAMPO_PK            = payment_id
   CATALOGOS           = funds, costCenters, statuses, suppliers, supplierInvoices, paymentMethods, currencies
   COND_FINAL          = status_label incluye "aprob" o "rech"
   ESTADO_INICIAL      = Pendiente
*/

const state = {
  raw: null,
  items: [],
  filtered: [],
  page: 1,
  pageSize: 12,
  filters: {
    q: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    supplier: "",
    method: "",
    fund: "",
    costCenter: "",
    onlyWithSupport: false,
    onlyUrgent: false,
    onlyPartial: false,
    onlyWithholding: false
  },
  sortBy: "date_desc",
  confirm: {
    open: false,
    payment_id: null,
    action: null // "approve" | "reject"
  }
};

const el = (id) => document.getElementById(id);
function safeLower(s) { return String(s ?? "").toLowerCase(); }

function isFinalStatus(item) {
  const s = safeLower(item?.status_label);
  return s.includes("aprob") || s.includes("rech");
}

function formatISODate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

function moneyFormatter(currency) {
  const c = String(currency || "CLP").toUpperCase();
  const maxFrac = c === "CLP" ? 0 : 2;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: c, maximumFractionDigits: maxFrac });
}
function formatMoney(value, currency) {
  const n = Number(value || 0);
  try { return moneyFormatter(currency).format(n); } catch { return String(n); }
}

function badgeClass(statusLabel) {
  const s = safeLower(statusLabel);
  if (s.includes("aprob")) return "badge badge--ok";
  if (s.includes("pend")) return "badge badge--warn";
  if (s.includes("rech")) return "badge badge--bad";
  return "badge badge--info";
}

function openModal(id) {
  const m = el(id);
  m.classList.add("is-open");
  m.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const m = el(id);
  m.classList.remove("is-open");
  m.setAttribute("aria-hidden", "true");
}

function setStatusDirect(item, label, statusIdOverride = undefined) {
  item.status_label = label;

  if (typeof statusIdOverride !== "undefined" && statusIdOverride !== null) {
    item.status_id = statusIdOverride;
    return;
  }

  const st = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(label));
  if (st) item.status_id = st.status_id;
}

/* =========================
   Normalización (BD -> UI)
========================= */
function normalize() {
  const d = state.raw;

  const fundsByCode = new Map((d.funds || []).map(f => [f.fund_code, f]));
  const ccByCode = new Map((d.costCenters || []).map(c => [c.cost_center_code, c]));
  const suppliersById = new Map((d.suppliers || []).map(s => [String(s.supplier_id), s]));
  const invoicesById = new Map((d.supplierInvoices || []).map(i => [String(i.invoice_id), i]));
  const methodsById = new Map((d.paymentMethods || []).map(m => [String(m.method_id), m]));
  const currenciesByCode = new Map((d.currencies || []).map(c => [String(c.currency_code).toUpperCase(), c]));
  const statusesById = new Map((d.statuses || []).map(s => [String(s.status_id), s]));
  const pendingStatus = (d.statuses || []).find(s => safeLower(s.status_label) === "pendiente") || null;

  state.items = (d.supplierPayments || []).map(x => {
    const st = statusesById.get(String(x.status_id)) || { status_label: x.status_label || "Pendiente" };
    const sup = suppliersById.get(String(x.supplier_id)) || {};
    const inv = x.invoice_id != null ? (invoicesById.get(String(x.invoice_id)) || {}) : {};
    const mth = methodsById.get(String(x.method_id)) || {};
    const curCode = String(x.currency_code || "CLP").toUpperCase();
    const cur = currenciesByCode.get(curCode) || { currency_code: curCode, currency_name: curCode };

    const item = {
      // PK normalizada
      payment_id: `P-${x.payment_id}`,

      // principales
      payment_date: x.payment_date,
      payment_code: x.payment_code || `PAY-${x.payment_id}`,
      payment_amount: Number(x.payment_amount || 0),

      // relaciones / catálogos
      supplier_id: x.supplier_id ?? null,
      supplier_name: sup.supplier_name || x.supplier_name || "—",
      supplier_rut: sup.supplier_rut || x.supplier_rut || "",

      invoice_id: x.invoice_id ?? null,
      invoice_no: inv.invoice_no || x.invoice_no || "",
      invoice_date: inv.invoice_date || x.invoice_date || "",
      invoice_amount: Number(inv.invoice_amount || 0),

      fund_code: x.fund_code,
      fund_name: (fundsByCode.get(x.fund_code) || {}).fund_name || x.fund_name || "—",

      cost_center_code: x.cost_center_code,
      cost_center_name: (ccByCode.get(x.cost_center_code) || {}).cost_center_name || x.cost_center_name || "—",

      method_id: x.method_id ?? null,
      method_name: mth.method_name || x.method_name || "—",

      currency_code: cur.currency_code || curCode,
      currency_name: cur.currency_name || curCode,
      exchange_rate: Number(x.exchange_rate || 0),

      // campos
      document_no: x.document_no || "",
      bank_reference: x.bank_reference || "",
      description: x.payment_description || x.description || "",

      has_support: Boolean(x.has_support),
      is_urgent: Boolean(x.is_urgent),
      is_partial: Boolean(x.is_partial),
      is_withholding: Boolean(x.is_withholding),
      withholding_rate: Number(x.withholding_rate || 0),

      status_id: x.status_id ?? null,
      status_label: st.status_label || x.status_label || "Pendiente",

      // control acciones
      action_locked: false,
      action_prev_status_id: null,
      action_prev_status_label: null,
      action_last: null
    };

    // Si viene finalizado desde JSON: bloquear y permitir reversa a Pendiente (fallback)
    if (isFinalStatus(item)) {
      item.action_locked = true;
      item.action_last = safeLower(item.status_label).includes("aprob") ? "approve" : "reject";
      item.action_prev_status_label = "Pendiente";
      item.action_prev_status_id = pendingStatus?.status_id ?? null;
    }

    return item;
  });
}

/* =========================
   KPIs
========================= */
function computeKPIs(list) {
  const total = list.reduce((a, b) => a + (b.payment_amount || 0), 0);

  const approved = list
    .filter(i => safeLower(i.status_label).includes("aprob"))
    .reduce((a, b) => a + b.payment_amount, 0);

  const pending = list
    .filter(i => safeLower(i.status_label).includes("pend"))
    .reduce((a, b) => a + b.payment_amount, 0);

  const rejected = list
    .filter(i => safeLower(i.status_label).includes("rech"))
    .reduce((a, b) => a + b.payment_amount, 0);

  const net = approved - rejected;

  return { total, approved, pending, rejected, net, count: list.length };
}

function renderKPIs() {
  const k = computeKPIs(state.filtered);

  // KPI a CLP para consistencia visual del módulo (si hay otras monedas, se muestra sumatoria numérica)
  el("kpiTotal").textContent = formatMoney(k.total, "CLP");
  el("kpiApproved").textContent = formatMoney(k.approved, "CLP");
  el("kpiPending").textContent = formatMoney(k.pending, "CLP");
  el("kpiRejected").textContent = formatMoney(k.rejected, "CLP");

  const netEl = el("kpiNet");
  netEl.textContent = formatMoney(k.net, "CLP");
  netEl.classList.remove("kpi__value--ok", "kpi__value--bad", "kpi__value--warn");
  if (k.net > 0) netEl.classList.add("kpi__value--ok");
  else if (k.net < 0) netEl.classList.add("kpi__value--bad");
  else netEl.classList.add("kpi__value--warn");

  el("kpiTotalHint").textContent = `${k.count} registros (según filtros)`;
  el("kpiApprovedHint").textContent = `Suma aprobados`;
  el("kpiPendingHint").textContent = `Suma pendientes`;
  el("kpiRejectedHint").textContent = `Suma rechazados`;
}

/* =========================
   Orden / filtros / paginación
========================= */
function sortItems(list, mode) {
  const arr = [...list];
  const byDate = (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
  const byAmount = (a, b) => (a.payment_amount || 0) - (b.payment_amount || 0);

  switch (mode) {
    case "date_asc": arr.sort(byDate); break;
    case "date_desc": arr.sort((a, b) => byDate(b, a)); break;
    case "amount_asc": arr.sort(byAmount); break;
    case "amount_desc": arr.sort((a, b) => byAmount(b, a)); break;
    default: arr.sort((a, b) => byDate(b, a));
  }
  return arr;
}

function syncFiltersFromUI() {
  const fd = new FormData(el("filtersForm"));
  state.filters.q = String(fd.get("q") || "");
  state.filters.dateFrom = String(fd.get("dateFrom") || "");
  state.filters.dateTo = String(fd.get("dateTo") || "");
  state.filters.status = String(fd.get("status") || "");
  state.filters.supplier = String(fd.get("supplier") || "");
  state.filters.method = String(fd.get("method") || "");
  state.filters.fund = String(fd.get("fund") || "");
  state.filters.costCenter = String(fd.get("costCenter") || "");
  state.filters.onlyWithSupport = el("onlyWithSupport").checked;
  state.filters.onlyUrgent = el("onlyUrgent").checked;
  state.filters.onlyPartial = el("onlyPartial").checked;
  state.filters.onlyWithholding = el("onlyWithholding").checked;
}

function applyFilters() {
  const f = state.filters;
  const q = safeLower(f.q).trim();
  const from = f.dateFrom ? new Date(f.dateFrom + "T00:00:00") : null;
  const to = f.dateTo ? new Date(f.dateTo + "T23:59:59") : null;

  let result = state.items.filter(i => {
    if (q) {
      const hay =
        safeLower(i.payment_code) + " " +
        safeLower(i.supplier_name) + " " +
        safeLower(i.supplier_rut) + " " +
        safeLower(i.invoice_no) + " " +
        safeLower(i.document_no) + " " +
        safeLower(i.bank_reference) + " " +
        safeLower(i.method_name) + " " +
        safeLower(i.fund_code) + " " +
        safeLower(i.fund_name) + " " +
        safeLower(i.cost_center_code) + " " +
        safeLower(i.cost_center_name) + " " +
        safeLower(i.description);

      if (!hay.includes(q)) return false;
    }

    if (from || to) {
      const d = new Date(i.payment_date);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }

    if (f.status) {
      const s = safeLower(i.status_label);
      const target = safeLower(f.status);
      if (!s.includes(target)) return false;
    }

    if (f.supplier) {
      if (String(i.supplier_id ?? "") !== String(f.supplier)) return false;
    }

    if (f.method) {
      if (String(i.method_id ?? "") !== String(f.method)) return false;
    }

    if (f.fund) {
      if (i.fund_code !== f.fund) return false;
    }

    if (f.costCenter) {
      if (i.cost_center_code !== f.costCenter) return false;
    }

    if (f.onlyWithSupport && !i.has_support) return false;
    if (f.onlyUrgent && !i.is_urgent) return false;
    if (f.onlyPartial && !i.is_partial) return false;
    if (f.onlyWithholding && !i.is_withholding) return false;

    return true;
  });

  result = sortItems(result, state.sortBy);
  state.filtered = result;
  state.page = 1;
  renderAll();
}

function resetFilters() {
  state.filters = {
    q: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    supplier: "",
    method: "",
    fund: "",
    costCenter: "",
    onlyWithSupport: false,
    onlyUrgent: false,
    onlyPartial: false,
    onlyWithholding: false
  };
  el("filtersForm").reset();
  applyFilters();
}

function renderTable() {
  const tbody = el("paymentsTbody");
  tbody.innerHTML = "";

  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(state.page, pages);

  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  el("resultsCount").textContent = `${total} resultados`;
  el("pageInfo").textContent = `${state.page} / ${pages}`;
  el("btnPrev").disabled = state.page <= 1;
  el("btnNext").disabled = state.page >= pages;

  if (slice.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="11" class="muted">Sin resultados para los filtros aplicados.</td>`;
    tbody.appendChild(tr);
    el("tableSummary").textContent = "—";
    return;
  }

  const sumPage = slice.reduce((a, b) => a + (b.payment_amount || 0), 0);
  el("tableSummary").textContent = `Página: total ${formatMoney(sumPage, "CLP")} · ítems ${slice.length}`;

  for (const i of slice) {
    const tr = document.createElement("tr");

    const badge = `<span class="${badgeClass(i.status_label)}"><span class="dot"></span>${i.status_label}</span>`;

    const final = isFinalStatus(i);
    const locked = Boolean(i.action_locked) || final;

    const approveDisabled = locked;
    const rejectDisabled  = locked;

    // Reglas:
    // - Editar NO visible en finalizados (Aprobado/Rechazado)
    // - Reversar visible en finalizados/bloqueados
    const showEdit = !final;
    const showReverse = locked;

    const flags = [
      i.has_support ? `<span class="pill pill--flag">Respaldo</span>` : "",
      i.is_partial ? `<span class="pill pill--flag">Parcial</span>` : "",
      i.is_urgent ? `<span class="pill pill--flag">Urg</span>` : "",
      i.is_withholding ? `<span class="pill pill--flag">Ret</span>` : ""
    ].filter(Boolean).join(" ");

    tr.innerHTML = `
      <td>${formatISODate(i.payment_date)}</td>
      <td><strong>${i.payment_code || "—"}</strong></td>
      <td>${i.supplier_name}${i.supplier_rut ? ` <span class="muted">(${i.supplier_rut})</span>` : ""}</td>
      <td>${i.invoice_no ? `<strong>${i.invoice_no}</strong>` : "—"}</td>
      <td>${i.fund_code} · ${i.fund_name}</td>
      <td>${i.cost_center_code} · ${i.cost_center_name}</td>
      <td>${i.method_name}</td>
      <td class="td-right"><strong>${formatMoney(i.payment_amount, i.currency_code || "CLP")}</strong></td>
      <td>${badge}</td>
      <td>${flags || "—"}</td>
      <td class="td-right">
        <div class="row-actions">
          <button class="iconbtn" type="button" title="Ver" data-action="view" data-id="${i.payment_id}">👁</button>
          ${showEdit ? `<button class="iconbtn" type="button" title="Editar" data-action="edit" data-id="${i.payment_id}">✎</button>` : ""}
          <button class="iconbtn" type="button" title="Aprobar" data-action="approve" data-id="${i.payment_id}" ${approveDisabled ? "disabled" : ""}>✓</button>
          <button class="iconbtn" type="button" title="Rechazar" data-action="reject" data-id="${i.payment_id}" ${rejectDisabled ? "disabled" : ""}>✕</button>
          ${showReverse ? `<button class="iconbtn" type="button" title="Reversar" data-action="reverse" data-id="${i.payment_id}">⟲</button>` : ""}
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

function renderAll() {
  renderKPIs();
  renderTable();
}

/* =========================
   Selects (filtros + edit + view)
========================= */
function populateSelects() {
  const d = state.raw;

  // STATUS
  const statusSel = el("status");
  const editStatusSel = el("editStatus");
  const viewStatusSel = el("viewStatus");

  statusSel.innerHTML = `<option value="">Todos</option>`;
  editStatusSel.innerHTML = "";
  viewStatusSel.innerHTML = "";

  (d.statuses || []).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.status_label;
    opt.textContent = s.status_label;
    statusSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = s.status_id;
    opt2.textContent = s.status_label;
    editStatusSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = s.status_id;
    opt3.textContent = s.status_label;
    viewStatusSel.appendChild(opt3);
  });

  // SUPPLIERS
  const supSel = el("supplier");
  const editSupSel = el("editSupplier");
  const viewSupSel = el("viewSupplier");

  supSel.innerHTML = `<option value="">Todos</option>`;
  editSupSel.innerHTML = "";
  viewSupSel.innerHTML = "";

  (d.suppliers || []).forEach(s => {
    const label = `${s.supplier_name}${s.supplier_rut ? ` (${s.supplier_rut})` : ""}`;

    const opt = document.createElement("option");
    opt.value = s.supplier_id;
    opt.textContent = label;
    supSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = s.supplier_id;
    opt2.textContent = label;
    editSupSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = s.supplier_id;
    opt3.textContent = label;
    viewSupSel.appendChild(opt3);
  });

  // INVOICES (depende proveedor, se filtra dinámicamente en modal; aquí poblamos "todas")
  const editInvSel = el("editInvoice");
  const viewInvSel = el("viewInvoice");
  editInvSel.innerHTML = `<option value="">— Sin factura —</option>`;
  viewInvSel.innerHTML = `<option value="">— Sin factura —</option>`;

  (d.supplierInvoices || []).forEach(i => {
    const opt2 = document.createElement("option");
    opt2.value = i.invoice_id;
    opt2.textContent = `${i.invoice_no} · ${formatISODate(i.invoice_date)} · ${formatMoney(i.invoice_amount, i.currency_code || "CLP")}`;
    editInvSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = i.invoice_id;
    opt3.textContent = `${i.invoice_no} · ${formatISODate(i.invoice_date)} · ${formatMoney(i.invoice_amount, i.currency_code || "CLP")}`;
    viewInvSel.appendChild(opt3);
  });

  // METHODS
  const methodSel = el("method");
  const editMethodSel = el("editMethod");
  const viewMethodSel = el("viewMethod");

  methodSel.innerHTML = `<option value="">Todos</option>`;
  editMethodSel.innerHTML = "";
  viewMethodSel.innerHTML = "";

  (d.paymentMethods || []).forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.method_id;
    opt.textContent = m.method_name;
    methodSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = m.method_id;
    opt2.textContent = m.method_name;
    editMethodSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = m.method_id;
    opt3.textContent = m.method_name;
    viewMethodSel.appendChild(opt3);
  });

  // FUNDS
  const fundSel = el("fund");
  const editFundSel = el("editFund");
  const viewFundSel = el("viewFund");

  fundSel.innerHTML = `<option value="">Todos</option>`;
  editFundSel.innerHTML = "";
  viewFundSel.innerHTML = "";

  (d.funds || []).forEach(f => {
    const label = `${f.fund_code} · ${f.fund_name}`;

    const opt = document.createElement("option");
    opt.value = f.fund_code;
    opt.textContent = label;
    fundSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = f.fund_code;
    opt2.textContent = label;
    editFundSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = f.fund_code;
    opt3.textContent = label;
    viewFundSel.appendChild(opt3);
  });

  // COST CENTERS
  const ccSel = el("costCenter");
  const editCcSel = el("editCostCenter");
  const viewCcSel = el("viewCostCenter");

  ccSel.innerHTML = `<option value="">Todos</option>`;
  editCcSel.innerHTML = "";
  viewCcSel.innerHTML = "";

  (d.costCenters || []).forEach(c => {
    const label = `${c.cost_center_code} · ${c.cost_center_name}`;

    const opt = document.createElement("option");
    opt.value = c.cost_center_code;
    opt.textContent = label;
    ccSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = c.cost_center_code;
    opt2.textContent = label;
    editCcSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = c.cost_center_code;
    opt3.textContent = label;
    viewCcSel.appendChild(opt3);
  });

  // CURRENCIES
  const editCurSel = el("editCurrency");
  const viewCurSel = el("viewCurrency");
  editCurSel.innerHTML = "";
  viewCurSel.innerHTML = "";

  (d.currencies || []).forEach(c => {
    const label = `${String(c.currency_code).toUpperCase()} · ${c.currency_name}`;

    const opt2 = document.createElement("option");
    opt2.value = String(c.currency_code).toUpperCase();
    opt2.textContent = label;
    editCurSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = String(c.currency_code).toUpperCase();
    opt3.textContent = label;
    viewCurSel.appendChild(opt3);
  });
}

/* =========================
   Helpers CRUD / find
========================= */
function findItem(pid) {
  return state.items.find(x => x.payment_id === pid) || null;
}

function nextNumericId() {
  const nums = state.items
    .map(i => Number(String(i.payment_id).replace("P-", "")))
    .filter(n => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 23000;
  return max + 1;
}

function refilterInvoicesForSupplier(selectEl, supplierId, currentValue = "") {
  const d = state.raw;
  const all = d.supplierInvoices || [];
  const sid = String(supplierId || "");

  selectEl.innerHTML = `<option value="">— Sin factura —</option>`;

  const rows = sid ? all.filter(i => String(i.supplier_id) === sid) : all;
  for (const inv of rows) {
    const opt = document.createElement("option");
    opt.value = inv.invoice_id;
    opt.textContent = `${inv.invoice_no} · ${formatISODate(inv.invoice_date)} · ${formatMoney(inv.invoice_amount, inv.currency_code || "CLP")}`;
    selectEl.appendChild(opt);
  }

  if (currentValue) selectEl.value = String(currentValue);
}

/* =========================
   Modal: View
========================= */
function openView(pid) {
  const item = findItem(pid);
  if (!item) return;

  el("viewId").value = item.payment_id;
  el("viewModalTitle").textContent = `Ver · ${item.payment_code || item.payment_id}`;
  el("viewModalSubtitle").textContent = `${formatISODate(item.payment_date)} · ${formatMoney(item.payment_amount, item.currency_code)} · ${item.status_label}`;

  el("viewDate").value = (item.payment_date || "").slice(0, 10);
  el("viewCode").value = item.payment_code || "";

  el("viewSupplier").value = String(item.supplier_id ?? "");
  refilterInvoicesForSupplier(el("viewInvoice"), item.supplier_id, item.invoice_id ? String(item.invoice_id) : "");

  el("viewFund").value = item.fund_code || "";
  el("viewCostCenter").value = item.cost_center_code || "";
  el("viewMethod").value = String(item.method_id ?? "");
  el("viewCurrency").value = String(item.currency_code || "CLP").toUpperCase();
  el("viewFx").value = String(item.exchange_rate ?? 0);
  el("viewAmount").value = String(item.payment_amount ?? 0);

  el("viewDoc").value = item.document_no || "";
  el("viewRef").value = item.bank_reference || "";
  el("viewDesc").value = item.description || "";

  el("viewHasSupport").checked = Boolean(item.has_support);
  el("viewIsUrgent").checked = Boolean(item.is_urgent);
  el("viewIsPartial").checked = Boolean(item.is_partial);
  el("viewIsWithholding").checked = Boolean(item.is_withholding);
  el("viewWithholdingRate").value = String(item.withholding_rate ?? 0);

  if (item.status_id != null) el("viewStatus").value = String(item.status_id);
  else {
    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(item.status_label));
    el("viewStatus").value = found ? String(found.status_id) : "";
  }

  el("viewHint").textContent = `ID: ${item.payment_id}`;
  openModal("viewModal");
}

/* =========================
   Modal: Edit
========================= */
function openNew() {
  el("editId").value = "";
  el("editForm").reset();

  el("editModalTitle").textContent = "Nuevo pago";
  el("editModalSubtitle").textContent = "Registrar pago a proveedor con método, respaldo y estado.";

  // defaults
  el("editDate").value = new Date().toISOString().slice(0, 10);
  el("editCode").value = "";
  el("editHasSupport").checked = true;
  el("editIsUrgent").checked = false;
  el("editIsPartial").checked = false;
  el("editIsWithholding").checked = false;
  el("editWithholdingRate").value = "0";

  // default moneda CLP
  el("editCurrency").value = "CLP";
  el("editFx").value = "0";

  // default estado = Pendiente
  const st = (state.raw.statuses || []).find(s => safeLower(s.status_label) === "pendiente");
  if (st) el("editStatus").value = String(st.status_id);

  // invoices empty (sin proveedor aún)
  refilterInvoicesForSupplier(el("editInvoice"), "", "");

  openModal("editModal");
}

function openEdit(pid) {
  const item = findItem(pid);
  if (!item) return;

  // regla: no se edita si finalizado
  if (isFinalStatus(item)) return;

  el("editId").value = item.payment_id;

  el("editModalTitle").textContent = `Editar · ${item.payment_code || item.payment_id}`;
  el("editModalSubtitle").textContent = "Actualice datos del pago (no finalizado).";

  el("editDate").value = (item.payment_date || "").slice(0, 10);
  el("editCode").value = item.payment_code || "";

  el("editSupplier").value = String(item.supplier_id ?? "");
  refilterInvoicesForSupplier(el("editInvoice"), item.supplier_id, item.invoice_id ? String(item.invoice_id) : "");

  el("editFund").value = item.fund_code || "";
  el("editCostCenter").value = item.cost_center_code || "";
  el("editMethod").value = String(item.method_id ?? "");

  el("editCurrency").value = String(item.currency_code || "CLP").toUpperCase();
  el("editFx").value = String(item.exchange_rate ?? 0);
  el("editAmount").value = String(item.payment_amount ?? 0);

  el("editDoc").value = item.document_no || "";
  el("editRef").value = item.bank_reference || "";
  el("editDesc").value = item.description || "";

  el("editHasSupport").checked = Boolean(item.has_support);
  el("editIsUrgent").checked = Boolean(item.is_urgent);
  el("editIsPartial").checked = Boolean(item.is_partial);
  el("editIsWithholding").checked = Boolean(item.is_withholding);
  el("editWithholdingRate").value = String(item.withholding_rate ?? 0);

  if (item.status_id != null) el("editStatus").value = String(item.status_id);
  else {
    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(item.status_label));
    el("editStatus").value = found ? String(found.status_id) : "";
  }

  openModal("editModal");
}

function validateEdit(payload) {
  const errs = [];

  if (!payload.payment_date) errs.push("Fecha es requerida.");
  if (!payload.supplier_id) errs.push("Proveedor es requerido.");
  if (!payload.fund_code) errs.push("Fondo es requerido.");
  if (!payload.cost_center_code) errs.push("Centro de costo es requerido.");
  if (!payload.method_id) errs.push("Método es requerido.");

  const amount = Number(payload.payment_amount);
  if (!Number.isFinite(amount) || amount <= 0) errs.push("Monto debe ser mayor a 0.");

  const cur = String(payload.currency_code || "CLP").toUpperCase();
  if (cur !== "CLP") {
    const fx = Number(payload.exchange_rate);
    if (!Number.isFinite(fx) || fx <= 0) errs.push("Tipo de cambio es requerido y debe ser > 0 para moneda distinta a CLP.");
  }

  // regla demo: si no hay respaldo, documento debe existir
  if (!payload.has_support && !String(payload.document_no || "").trim()) {
    errs.push("Si no posee respaldo, debe indicar Documento/Comprobante.");
  }

  // regla demo: si es pago parcial, se sugiere asociar factura
  if (payload.is_partial && !payload.invoice_id) {
    errs.push("Si es pago parcial, debe asociar una factura (o desmarcar 'Pago parcial').");
  }

  // retención
  if (payload.is_withholding) {
    const r = Number(payload.withholding_rate);
    if (!Number.isFinite(r) || r <= 0 || r > 100) errs.push("Retención % debe estar entre 0.01 y 100 cuando aplica retención.");
  }

  return errs;
}

function resolveCatalogNames(payload) {
  const d = state.raw;
  const sup = (d.suppliers || []).find(s => String(s.supplier_id) === String(payload.supplier_id));
  const inv = payload.invoice_id ? (d.supplierInvoices || []).find(i => String(i.invoice_id) === String(payload.invoice_id)) : null;
  const fund = (d.funds || []).find(f => f.fund_code === payload.fund_code);
  const cc = (d.costCenters || []).find(c => c.cost_center_code === payload.cost_center_code);
  const mth = (d.paymentMethods || []).find(m => String(m.method_id) === String(payload.method_id));
  const cur = (d.currencies || []).find(c => String(c.currency_code).toUpperCase() === String(payload.currency_code).toUpperCase());
  const st = (d.statuses || []).find(s => Number(s.status_id) === Number(payload.status_id));
  return { sup, inv, fund, cc, mth, cur, st };
}

function saveEdit() {
  const editId = String(el("editId").value || "").trim();

  const payload = {
    payment_date: String(el("editDate").value || ""),
    payment_code: String(el("editCode").value || "").trim(),
    supplier_id: Number(el("editSupplier").value || 0) || null,
    invoice_id: el("editInvoice").value ? Number(el("editInvoice").value) : null,
    fund_code: String(el("editFund").value || ""),
    cost_center_code: String(el("editCostCenter").value || ""),
    method_id: Number(el("editMethod").value || 0) || null,
    currency_code: String(el("editCurrency").value || "CLP").toUpperCase(),
    exchange_rate: Number(el("editFx").value || 0),
    payment_amount: Number(el("editAmount").value || 0),
    document_no: String(el("editDoc").value || "").trim(),
    bank_reference: String(el("editRef").value || "").trim(),
    description: String(el("editDesc").value || "").trim(),
    has_support: Boolean(el("editHasSupport").checked),
    is_urgent: Boolean(el("editIsUrgent").checked),
    is_partial: Boolean(el("editIsPartial").checked),
    is_withholding: Boolean(el("editIsWithholding").checked),
    withholding_rate: Number(el("editWithholdingRate").value || 0),
    status_id: Number(el("editStatus").value || 0)
  };

  const errs = validateEdit(payload);
  if (errs.length) {
    alert("Validación:\n- " + errs.join("\n- "));
    return;
  }

  const { sup, inv, fund, cc, mth, cur, st } = resolveCatalogNames(payload);

  if (!editId) {
    // crear
    const nid = nextNumericId();
    const payment_id = `P-${nid}`;

    const created = {
      payment_id,
      payment_date: payload.payment_date,
      payment_code: payload.payment_code || `PAY-${nid}`,
      payment_amount: payload.payment_amount,

      supplier_id: payload.supplier_id,
      supplier_name: sup?.supplier_name || "—",
      supplier_rut: sup?.supplier_rut || "",

      invoice_id: payload.invoice_id,
      invoice_no: inv?.invoice_no || "",
      invoice_date: inv?.invoice_date || "",
      invoice_amount: Number(inv?.invoice_amount || 0),

      fund_code: payload.fund_code,
      fund_name: fund?.fund_name || "—",

      cost_center_code: payload.cost_center_code,
      cost_center_name: cc?.cost_center_name || "—",

      method_id: payload.method_id,
      method_name: mth?.method_name || "—",

      currency_code: payload.currency_code,
      currency_name: cur?.currency_name || payload.currency_code,
      exchange_rate: payload.exchange_rate,

      document_no: payload.document_no || "",
      bank_reference: payload.bank_reference || "",
      description: payload.description || "",

      has_support: payload.has_support,
      is_urgent: payload.is_urgent,
      is_partial: payload.is_partial,
      is_withholding: payload.is_withholding,
      withholding_rate: payload.withholding_rate,

      status_id: payload.status_id || (st?.status_id ?? null),
      status_label: st?.status_label || "Pendiente",

      action_locked: false,
      action_prev_status_id: null,
      action_prev_status_label: null,
      action_last: null
    };

    state.items.unshift(created);
  } else {
    // editar
    const item = findItem(editId);
    if (!item) return;
    if (isFinalStatus(item)) return; // hard guard

    item.payment_date = payload.payment_date;
    item.payment_code = payload.payment_code || item.payment_code;
    item.payment_amount = payload.payment_amount;

    item.supplier_id = payload.supplier_id;
    item.supplier_name = sup?.supplier_name || item.supplier_name;
    item.supplier_rut = sup?.supplier_rut || item.supplier_rut;

    item.invoice_id = payload.invoice_id;
    item.invoice_no = inv?.invoice_no || "";
    item.invoice_date = inv?.invoice_date || "";
    item.invoice_amount = Number(inv?.invoice_amount || 0);

    item.fund_code = payload.fund_code;
    item.fund_name = fund?.fund_name || item.fund_name;

    item.cost_center_code = payload.cost_center_code;
    item.cost_center_name = cc?.cost_center_name || item.cost_center_name;

    item.method_id = payload.method_id;
    item.method_name = mth?.method_name || item.method_name;

    item.currency_code = payload.currency_code;
    item.currency_name = cur?.currency_name || item.currency_name;
    item.exchange_rate = payload.exchange_rate;

    item.document_no = payload.document_no || "";
    item.bank_reference = payload.bank_reference || "";
    item.description = payload.description || "";

    item.has_support = payload.has_support;
    item.is_urgent = payload.is_urgent;
    item.is_partial = payload.is_partial;
    item.is_withholding = payload.is_withholding;
    item.withholding_rate = payload.withholding_rate;

    item.status_id = payload.status_id || item.status_id;
    item.status_label = st?.status_label || item.status_label;
  }

  closeModal("editModal");
  applyFilters();
}

/* =========================
   Workflow: aprobar/rechazar + confirmación + reversa
========================= */
function openConfirm(pid, action) {
  const item = findItem(pid);
  if (!item) return;

  // Si está finalizado o bloqueado, no corresponde aprobar/rechazar nuevamente
  if (item.action_locked || isFinalStatus(item)) return;

  state.confirm.open = true;
  state.confirm.payment_id = pid;
  state.confirm.action = action;

  const actionLabel = action === "approve" ? "APROBAR" : "RECHAZAR";
  el("confirmTitle").textContent = `Confirmar acción: ${actionLabel}`;
  el("confirmSubtitle").textContent = `${item.payment_code} · ${formatISODate(item.payment_date)} · ${formatMoney(item.payment_amount, item.currency_code)}`;

  el("confirmMessage").textContent = action === "approve"
    ? "¿Confirma que desea APROBAR este pago?"
    : "¿Confirma que desea RECHAZAR este pago?";

  const invLine = item.invoice_no ? `Factura: ${item.invoice_no}\n` : "";
  el("confirmMeta").textContent =
    `Proveedor: ${item.supplier_name}${item.supplier_rut ? ` (${item.supplier_rut})` : ""}\n` +
    invLine +
    `Método: ${item.method_name}\n` +
    `Fondo: ${item.fund_code} · ${item.fund_name}\n` +
    `Centro de costo: ${item.cost_center_code} · ${item.cost_center_name}\n` +
    `Documento: ${item.document_no || "—"}\n` +
    `Flags: ${[
      item.has_support ? "Respaldo" : null,
      item.is_partial ? "Parcial" : null,
      item.is_urgent ? "Urgente" : null,
      item.is_withholding ? `Retención ${item.withholding_rate || 0}%` : null
    ].filter(Boolean).join(", ") || "—"}`;

  el("confirmHint").textContent = `Estado actual: ${item.status_label}`;
  openModal("confirmModal");
}

function confirmAction() {
  if (!state.confirm.open || !state.confirm.payment_id || !state.confirm.action) return;

  const item = findItem(state.confirm.payment_id);
  if (!item) return;

  // guard
  if (item.action_locked || isFinalStatus(item)) {
    closeModal("confirmModal");
    state.confirm.open = false;
    return;
  }

  // guardar estado previo
  item.action_prev_status_id = item.status_id ?? null;
  item.action_prev_status_label = item.status_label || "Pendiente";

  // aplicar estado final
  if (state.confirm.action === "approve") {
    setStatusDirect(item, "Aprobado");
    item.action_last = "approve";
  } else {
    setStatusDirect(item, "Rechazado");
    item.action_last = "reject";
  }

  // bloquear acciones
  item.action_locked = true;

  // reset confirm
  state.confirm.open = false;
  state.confirm.payment_id = null;
  state.confirm.action = null;

  closeModal("confirmModal");
  applyFilters();
}

function reverseAction(pid) {
  const item = findItem(pid);
  if (!item) return;

  // regla: reversa solo si finalizado/bloqueado
  const locked = Boolean(item.action_locked) || isFinalStatus(item);
  if (!locked) return;

  // restaurar estado anterior (fallback al inicial)
  const fallbackLabel = "Pendiente";
  const prevLabel = item.action_prev_status_label || fallbackLabel;
  const prevId = item.action_prev_status_id ?? undefined;

  setStatusDirect(item, prevLabel, prevId);
  item.action_locked = false;
  item.action_last = "reverse";

  // limpiar prev (opcional)
  item.action_prev_status_label = null;
  item.action_prev_status_id = null;

  applyFilters();
}

/* =========================
   Eventos UI
========================= */
function bindEvents() {
  el("btnApplyFilters").addEventListener("click", () => {
    syncFiltersFromUI();
    applyFilters();
  });

  el("btnResetFilters").addEventListener("click", () => resetFilters());

  el("sortBy").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    applyFilters();
  });

  el("btnPrev").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); renderTable(); });
  el("btnNext").addEventListener("click", () => { state.page = state.page + 1; renderTable(); });

  el("btnNewPayment").addEventListener("click", () => openNew());
  el("btnSave").addEventListener("click", () => saveEdit());

  el("btnRefresh").addEventListener("click", async () => {
    // recarga limpia (demo)
    await boot(true);
  });

  el("btnConfirmOk").addEventListener("click", () => confirmAction());

  // Refiltrar facturas al cambiar proveedor en edit
  el("editSupplier").addEventListener("change", (e) => {
    refilterInvoicesForSupplier(el("editInvoice"), e.target.value, "");
  });

  // Si cambia moneda, sugiere FX 0 en CLP
  el("editCurrency").addEventListener("change", (e) => {
    const cur = String(e.target.value || "CLP").toUpperCase();
    if (cur === "CLP") el("editFx").value = "0";
  });

  // Acciones tabla (delegación)
  el("paymentsTbody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!action || !id) return;

    if (action === "view") openView(id);
    if (action === "edit") openEdit(id);
    if (action === "approve") openConfirm(id, "approve");
    if (action === "reject") openConfirm(id, "reject");
    if (action === "reverse") reverseAction(id);
  });
}

/* =========================
   Boot
========================= */
async function boot(forceReload = false) {
  try {
    if (forceReload) {
      state.raw = null;
      state.items = [];
      state.filtered = [];
      state.page = 1;
      state.sortBy = "date_desc";
      resetFilters();
    }

    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar data.json (${res.status})`);
    state.raw = await res.json();

    normalize();
    populateSelects();

    // Inicial: sin filtros (pero orden aplicado)
    state.filtered = sortItems(state.items, state.sortBy);
    state.page = 1;
    renderAll();

  } catch (err) {
    console.error(err);
    alert("Error cargando datos. Revise consola.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await boot(false);
});
