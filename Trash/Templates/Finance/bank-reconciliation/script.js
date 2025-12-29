/* finance/bank-reconciliation - template estático (vanilla)
   - Carga data.json
   - Normaliza bankStatementTransactions -> items (objeto principal: reconciliation)
   - KPIs, filtros, orden, paginación
   - CRUD demo (en memoria)
   - Workflow: Pendiente/Conciliado/Discrepancia + confirmación + bloqueo + reversa por fila
   - Reglas: ocultar editar en finalizados; reversa visible en finalizados; aprobar/rechazar deshabilitados tras acción
   - Modal View: misma estructura que Edit (form-grid), solo lectura (sin look “apagado”)

   === Especificación funcional (variables resueltas) ===
   MODULO              = finance
   SUBMODULO           = bank-reconciliation
   RUTA                = finance/bank-reconciliation
   TABLAS (mock)       = FinanceBankStatementTxn, FinanceLedgerMovement, FinanceBankAccount, FinanceStatus, FinanceTxnType, FinanceCostCenter
   WORKFLOW            = Pendiente/Conciliado/Discrepancia
   OBJETO_PRINCIPAL    = reconciliation
   CAMPO_FECHA         = statement_date
   CAMPO_MONTO         = statement_amount
   CAMPO_PK            = statement_id
   CATALOGOS           = bankAccounts, costCenters, statuses, txnTypes, ledgerMovements
   COND_FINAL          = status_label incluye "concil" o "discrep"
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
    txnType: "",
    bankAccount: "",
    costCenter: "",
    onlyMatched: false,
    onlyWithSupport: false,
    onlyAutoMatch: false
  },
  sortBy: "date_desc",
  confirm: {
    open: false,
    statement_id: null,
    action: null // "approve" | "reject"
  }
};

const el = (id) => document.getElementById(id);
function safeLower(s) { return String(s ?? "").toLowerCase(); }

function isFinalStatus(item) {
  const s = safeLower(item?.status_label);
  return s.includes("concil") || s.includes("discrep");
}

function formatCLP(value) {
  const n = Number(value || 0);
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function formatISODate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

function badgeClass(statusLabel) {
  const s = safeLower(statusLabel);
  if (s.includes("concil")) return "badge badge--ok";
  if (s.includes("pend")) return "badge badge--warn";
  if (s.includes("discrep")) return "badge badge--bad";
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

/* =========================
   Normalización (BD -> UI)
========================= */
function normalize() {
  const d = state.raw;

  const accByCode = new Map((d.bankAccounts || []).map(a => [a.bank_account_code, a]));
  const ccByCode  = new Map((d.costCenters || []).map(c => [c.cost_center_code, c]));
  const typeByCode= new Map((d.txnTypes || []).map(t => [t.txn_type_code, t]));
  const stById    = new Map((d.statuses || []).map(s => [String(s.status_id), s]));
  const ledgerById= new Map((d.ledgerMovements || []).map(l => [String(l.ledger_id), l]));
  const pendingSt = (d.statuses || []).find(s => safeLower(s.status_label) === "pendiente") || null;

  state.items = (d.bankStatementTransactions || []).map(x => {
    const st = stById.get(String(x.status_id)) || { status_label: x.status_label || "Pendiente" };
    const acc = accByCode.get(x.bank_account_code) || {};
    const typ = typeByCode.get(x.txn_type_code) || {};

    const led = x.ledger_match_id != null ? ledgerById.get(String(x.ledger_match_id)) : null;

    const item = {
      // PK normalizada
      statement_id: `BR-${x.statement_id}`,

      // principales
      statement_date: x.statement_date,
      statement_code: x.statement_code || `BR-${x.statement_id}`,
      bank_account_code: x.bank_account_code,
      bank_account_name: acc.bank_account_name || x.bank_account_name || "—",

      txn_type_code: x.txn_type_code, // CR | DB
      txn_type_name: typ.txn_type_name || x.txn_type_name || "—",

      statement_reference: x.statement_reference || "",
      statement_amount: Number(x.statement_amount || 0),

      // opcionales / relaciones
      cost_center_code: x.cost_center_code || "",
      cost_center_name: (x.cost_center_code && ccByCode.get(x.cost_center_code))
        ? ccByCode.get(x.cost_center_code).cost_center_name
        : (x.cost_center_name || "—"),

      description: x.description || "",

      ledger_match_id: x.ledger_match_id ?? null,
      ledger_code: led?.ledger_code || x.ledger_code || "",
      ledger_glosa: led?.ledger_glosa || x.ledger_glosa || "",

      is_matched: Boolean(x.is_matched),
      has_support: Boolean(x.has_support),
      is_auto_match: Boolean(x.is_auto_match),

      status_id: x.status_id ?? null,
      status_label: st.status_label || x.status_label || "Pendiente",

      // control acciones (workflow)
      action_locked: false,
      action_prev_status_id: null,
      action_prev_status_label: null,
      action_last: null
    };

    // Si viene finalizado desde JSON: bloquear y permitir reversa a Pendiente (fallback)
    if (isFinalStatus(item)) {
      item.action_locked = true;
      item.action_last = safeLower(item.status_label).includes("concil") ? "approve" : "reject";
      item.action_prev_status_label = "Pendiente";
      item.action_prev_status_id = pendingSt?.status_id ?? null;
    }

    return item;
  });
}

/* =========================
   KPIs
========================= */
function signedAmount(item) {
  const typ = safeLower(item.txn_type_code);
  const amt = Number(item.statement_amount || 0);
  return typ === "db" ? -Math.abs(amt) : Math.abs(amt);
}

function computeKPIs(list) {
  const totalAbs = list.reduce((a, b) => a + Math.abs(Number(b.statement_amount || 0)), 0);

  const reconciled = list
    .filter(i => safeLower(i.status_label).includes("concil"))
    .reduce((a, b) => a + Math.abs(Number(b.statement_amount || 0)), 0);

  const pending = list
    .filter(i => safeLower(i.status_label).includes("pend"))
    .reduce((a, b) => a + Math.abs(Number(b.statement_amount || 0)), 0);

  const discrepancy = list
    .filter(i => safeLower(i.status_label).includes("discrep"))
    .reduce((a, b) => a + Math.abs(Number(b.statement_amount || 0)), 0);

  const net = list.reduce((a, b) => a + signedAmount(b), 0);

  return { totalAbs, reconciled, pending, discrepancy, net, count: list.length };
}

function renderKPIs() {
  const k = computeKPIs(state.filtered);

  el("kpiTotal").textContent = formatCLP(k.totalAbs);
  el("kpiReconciled").textContent = formatCLP(k.reconciled);
  el("kpiPending").textContent = formatCLP(k.pending);
  el("kpiDiscrepancy").textContent = formatCLP(k.discrepancy);

  const netEl = el("kpiNet");
  netEl.textContent = formatCLP(k.net);
  netEl.classList.remove("kpi__value--ok", "kpi__value--bad", "kpi__value--warn");
  if (k.net > 0) netEl.classList.add("kpi__value--ok");
  else if (k.net < 0) netEl.classList.add("kpi__value--bad");
  else netEl.classList.add("kpi__value--warn");

  el("kpiTotalHint").textContent = `${k.count} registros (según filtros)`;
  el("kpiReconciledHint").textContent = `Suma abs. conciliados`;
  el("kpiPendingHint").textContent = `Suma abs. pendientes`;
  el("kpiDiscrepancyHint").textContent = `Suma abs. discrepancias`;
}

/* =========================
   Orden / filtros / paginación
========================= */
function sortItems(list, mode) {
  const arr = [...list];
  const byDate = (a, b) => new Date(a.statement_date).getTime() - new Date(b.statement_date).getTime();
  const byAmount = (a, b) => Math.abs(Number(a.statement_amount || 0)) - Math.abs(Number(b.statement_amount || 0));

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
  state.filters.txnType = String(fd.get("txnType") || "");
  state.filters.bankAccount = String(fd.get("bankAccount") || "");
  state.filters.costCenter = String(fd.get("costCenter") || "");
  state.filters.onlyMatched = el("onlyMatched").checked;
  state.filters.onlyWithSupport = el("onlyWithSupport").checked;
  state.filters.onlyAutoMatch = el("onlyAutoMatch").checked;
}

function applyFilters() {
  const f = state.filters;
  const q = safeLower(f.q).trim();
  const from = f.dateFrom ? new Date(f.dateFrom + "T00:00:00") : null;
  const to = f.dateTo ? new Date(f.dateTo + "T23:59:59") : null;

  let result = state.items.filter(i => {
    if (q) {
      const hay =
        safeLower(i.statement_code) + " " +
        safeLower(i.bank_account_code) + " " +
        safeLower(i.bank_account_name) + " " +
        safeLower(i.txn_type_code) + " " +
        safeLower(i.txn_type_name) + " " +
        safeLower(i.statement_reference) + " " +
        safeLower(i.description) + " " +
        safeLower(i.ledger_code) + " " +
        safeLower(i.ledger_glosa) + " " +
        safeLower(i.cost_center_code) + " " +
        safeLower(i.cost_center_name);

      if (!hay.includes(q)) return false;
    }

    if (from || to) {
      const d = new Date(i.statement_date);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }

    if (f.status) {
      const s = safeLower(i.status_label);
      const target = safeLower(f.status);
      if (!s.includes(target)) return false;
    }

    if (f.txnType) {
      if (String(i.txn_type_code) !== String(f.txnType)) return false;
    }

    if (f.bankAccount) {
      if (String(i.bank_account_code) !== String(f.bankAccount)) return false;
    }

    if (f.costCenter) {
      if (String(i.cost_center_code || "") !== String(f.costCenter)) return false;
    }

    if (f.onlyMatched && !i.is_matched) return false;
    if (f.onlyWithSupport && !i.has_support) return false;
    if (f.onlyAutoMatch && !i.is_auto_match) return false;

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
    txnType: "",
    bankAccount: "",
    costCenter: "",
    onlyMatched: false,
    onlyWithSupport: false,
    onlyAutoMatch: false
  };
  el("filtersForm").reset();
  applyFilters();
}

function renderTable() {
  const tbody = el("reconTbody");
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

  const sumPageSigned = slice.reduce((a, b) => a + signedAmount(b), 0);
  el("tableSummary").textContent = `Página: neto ${formatCLP(sumPageSigned)} · ítems ${slice.length}`;

  for (const i of slice) {
    const tr = document.createElement("tr");

    const badge = `<span class="${badgeClass(i.status_label)}"><span class="dot"></span>${i.status_label}</span>`;
    const match = i.is_matched
      ? `<span class="pill pill--match">Matched</span>`
      : `<span class="pill pill--flag">Sin match</span>`;

    const flags = [
      i.has_support ? `<span class="pill pill--flag">Rsp</span>` : "",
      i.is_auto_match ? `<span class="pill pill--flag">Auto</span>` : "",
      i.cost_center_code ? `<span class="pill pill--flag">${i.cost_center_code}</span>` : ""
    ].filter(Boolean).join(" ");

    const final = isFinalStatus(i);
    const locked = Boolean(i.action_locked) || final;

    // Reglas:
    // - Editar NO visible en finalizados (Conciliado/Discrepancia)
    // - Reversar visible en finalizados/bloqueados
    // - Aprobar/Rechazar deshabilitados tras acción
    const showEdit = !final;
    const showReverse = locked;

    const amountLabel = formatCLP(Math.abs(Number(i.statement_amount || 0)));
    const amountSigned = signedAmount(i);

    tr.innerHTML = `
      <td>${formatISODate(i.statement_date)}</td>
      <td><strong>${i.statement_code || "—"}</strong></td>
      <td>${i.bank_account_code} · ${i.bank_account_name}</td>
      <td>${i.txn_type_name}</td>
      <td>${i.statement_reference || "—"}</td>
      <td>${i.description ? i.description : "—"}</td>
      <td class="td-right"><strong>${amountLabel}</strong><div class="muted">${amountSigned < 0 ? "Débito" : "Crédito"}</div></td>
      <td>${badge}</td>
      <td>${match}</td>
      <td>${flags || "—"}</td>
      <td class="td-right">
        <div class="row-actions">
          <button class="iconbtn" type="button" title="Ver" data-action="view" data-id="${i.statement_id}">👁</button>
          ${showEdit ? `<button class="iconbtn" type="button" title="Editar" data-action="edit" data-id="${i.statement_id}">✎</button>` : ""}
          <button class="iconbtn" type="button" title="Aprobar (Conciliar)" data-action="approve" data-id="${i.statement_id}" ${locked ? "disabled" : ""}>✓</button>
          <button class="iconbtn" type="button" title="Rechazar (Discrepancia)" data-action="reject" data-id="${i.statement_id}" ${locked ? "disabled" : ""}>✕</button>
          ${showReverse ? `<button class="iconbtn" type="button" title="Reversar" data-action="reverse" data-id="${i.statement_id}">⟲</button>` : ""}
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

  // TXN TYPES
  const typeSel = el("txnType");
  const editTypeSel = el("editTxnType");
  const viewTypeSel = el("viewTxnType");

  typeSel.innerHTML = `<option value="">Todos</option>`;
  editTypeSel.innerHTML = "";
  viewTypeSel.innerHTML = "";

  (d.txnTypes || []).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.txn_type_code;
    opt.textContent = `${t.txn_type_name}`;
    typeSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = t.txn_type_code;
    opt2.textContent = `${t.txn_type_name}`;
    editTypeSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = t.txn_type_code;
    opt3.textContent = `${t.txn_type_name}`;
    viewTypeSel.appendChild(opt3);
  });

  // BANK ACCOUNTS
  const accSel = el("bankAccount");
  const editAccSel = el("editBankAccount");
  const viewAccSel = el("viewBankAccount");

  accSel.innerHTML = `<option value="">Todas</option>`;
  editAccSel.innerHTML = "";
  viewAccSel.innerHTML = "";

  (d.bankAccounts || []).forEach(a => {
    const label = `${a.bank_account_code} · ${a.bank_account_name}`;
    const opt = document.createElement("option");
    opt.value = a.bank_account_code;
    opt.textContent = label;
    accSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = a.bank_account_code;
    opt2.textContent = label;
    editAccSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = a.bank_account_code;
    opt3.textContent = label;
    viewAccSel.appendChild(opt3);
  });

  // COST CENTERS
  const ccSel = el("costCenter");
  const editCcSel = el("editCostCenter");
  const viewCcSel = el("viewCostCenter");

  ccSel.innerHTML = `<option value="">Todos</option>`;
  editCcSel.innerHTML = `<option value="">—</option>`;
  viewCcSel.innerHTML = `<option value="">—</option>`;

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

  // LEDGER MATCH
  const editLedSel = el("editLedgerMatch");
  const viewLedSel = el("viewLedgerMatch");

  editLedSel.innerHTML = `<option value="">— Sin match —</option>`;
  viewLedSel.innerHTML = `<option value="">— Sin match —</option>`;

  (d.ledgerMovements || []).forEach(l => {
    const label = `${l.ledger_code} · ${formatISODate(l.ledger_date)} · ${formatCLP(l.ledger_amount)} · ${l.ledger_glosa}`;
    const opt2 = document.createElement("option");
    opt2.value = String(l.ledger_id);
    opt2.textContent = label;
    editLedSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = String(l.ledger_id);
    opt3.textContent = label;
    viewLedSel.appendChild(opt3);
  });
}

/* =========================
   Helpers CRUD / find
========================= */
function findItem(iid) {
  return state.items.find(x => x.statement_id === iid) || null;
}

function nextNumericId() {
  const nums = state.items
    .map(i => Number(String(i.statement_id).replace("BR-", "")))
    .filter(n => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 250000;
  return max + 1;
}

/* =========================
   Modal: View
========================= */
function openView(iid) {
  const item = findItem(iid);
  if (!item) return;

  el("viewId").value = item.statement_id;
  el("viewModalTitle").textContent = `Ver · ${item.statement_code || item.statement_id}`;
  el("viewModalSubtitle").textContent =
    `${formatISODate(item.statement_date)} · ${item.txn_type_name} · ${formatCLP(Math.abs(item.statement_amount))} · ${item.status_label}`;

  el("viewDate").value = (item.statement_date || "").slice(0, 10);
  el("viewCode").value = item.statement_code || "";
  el("viewBankAccount").value = item.bank_account_code || "";
  el("viewTxnType").value = item.txn_type_code || "";
  el("viewReference").value = item.statement_reference || "";
  el("viewCostCenter").value = item.cost_center_code || "";
  el("viewAmount").value = String(item.statement_amount ?? 0);
  el("viewLedgerMatch").value = item.ledger_match_id != null ? String(item.ledger_match_id) : "";
  el("viewDesc").value = item.description || "";

  el("viewHasSupport").checked = Boolean(item.has_support);
  el("viewIsAutoMatch").checked = Boolean(item.is_auto_match);
  el("viewIsMatched").checked = Boolean(item.is_matched);

  if (item.status_id != null) el("viewStatus").value = String(item.status_id);
  else {
    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(item.status_label));
    el("viewStatus").value = found ? String(found.status_id) : "";
  }

  el("viewHint").textContent = `ID: ${item.statement_id}${item.ledger_code ? ` · Ledger: ${item.ledger_code}` : ""}`;
  openModal("viewModal");
}

/* =========================
   Modal: Edit
========================= */
function openNew() {
  el("editId").value = "";
  el("editForm").reset();

  el("editModalTitle").textContent = "Nuevo movimiento";
  el("editModalSubtitle").textContent = "Registrar movimiento de extracto (demo) con match contable opcional.";

  el("editDate").value = new Date().toISOString().slice(0, 10);
  el("editCode").value = "";
  el("editHasSupport").checked = true;
  el("editIsAutoMatch").checked = false;
  el("editIsMatched").checked = false;

  // defaults
  const st = (state.raw.statuses || []).find(s => safeLower(s.status_label) === "pendiente");
  if (st) el("editStatus").value = String(st.status_id);

  const firstAcc = (state.raw.bankAccounts || [])[0];
  if (firstAcc) el("editBankAccount").value = firstAcc.bank_account_code;

  const firstType = (state.raw.txnTypes || [])[0];
  if (firstType) el("editTxnType").value = firstType.txn_type_code;

  el("editLedgerMatch").value = "";

  openModal("editModal");
}

function openEdit(iid) {
  const item = findItem(iid);
  if (!item) return;

  // regla: no se edita si finalizado
  if (isFinalStatus(item)) return;

  el("editId").value = item.statement_id;
  el("editModalTitle").textContent = `Editar · ${item.statement_code || item.statement_id}`;
  el("editModalSubtitle").textContent = "Actualice datos del movimiento (no finalizado).";

  el("editDate").value = (item.statement_date || "").slice(0, 10);
  el("editCode").value = item.statement_code || "";
  el("editBankAccount").value = item.bank_account_code || "";
  el("editTxnType").value = item.txn_type_code || "";
  el("editReference").value = item.statement_reference || "";
  el("editCostCenter").value = item.cost_center_code || "";
  el("editAmount").value = String(item.statement_amount ?? 0);
  el("editLedgerMatch").value = item.ledger_match_id != null ? String(item.ledger_match_id) : "";
  el("editDesc").value = item.description || "";

  el("editHasSupport").checked = Boolean(item.has_support);
  el("editIsAutoMatch").checked = Boolean(item.is_auto_match);
  el("editIsMatched").checked = Boolean(item.is_matched);

  if (item.status_id != null) el("editStatus").value = String(item.status_id);
  else {
    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(item.status_label));
    el("editStatus").value = found ? String(found.status_id) : "";
  }

  openModal("editModal");
}

function validateEdit(payload) {
  const errs = [];

  if (!payload.statement_date) errs.push("Fecha es requerida.");
  if (!payload.bank_account_code) errs.push("Cuenta bancaria es requerida.");
  if (!payload.txn_type_code) errs.push("Tipo es requerido.");

  const amount = Number(payload.statement_amount);
  if (!Number.isFinite(amount) || amount <= 0) errs.push("Monto debe ser mayor a 0.");

  // regla demo: si se marca matched, debe existir un ledger_match_id
  if (payload.is_matched && !payload.ledger_match_id) {
    errs.push("Si marca “matched”, debe seleccionar un movimiento contable (Ledger).");
  }

  // regla demo: si no hay respaldo, referencia obligatoria
  if (!payload.has_support && !String(payload.statement_reference || "").trim()) {
    errs.push("Si no posee respaldo, debe indicar referencia de extracto.");
  }

  return errs;
}

function saveEdit() {
  const editId = String(el("editId").value || "").trim();

  const payload = {
    statement_date: String(el("editDate").value || ""),
    statement_code: String(el("editCode").value || "").trim(),
    bank_account_code: String(el("editBankAccount").value || ""),
    txn_type_code: String(el("editTxnType").value || ""),
    statement_reference: String(el("editReference").value || "").trim(),
    cost_center_code: String(el("editCostCenter").value || ""),
    statement_amount: Number(el("editAmount").value || 0),
    ledger_match_id: String(el("editLedgerMatch").value || "").trim() ? Number(el("editLedgerMatch").value) : null,
    description: String(el("editDesc").value || "").trim(),
    has_support: Boolean(el("editHasSupport").checked),
    is_auto_match: Boolean(el("editIsAutoMatch").checked),
    is_matched: Boolean(el("editIsMatched").checked),
    status_id: Number(el("editStatus").value || 0)
  };

  const errs = validateEdit(payload);
  if (errs.length) {
    alert("Validación:\n- " + errs.join("\n- "));
    return;
  }

  // resolver catálogos -> nombres
  const acc = (state.raw.bankAccounts || []).find(a => a.bank_account_code === payload.bank_account_code);
  const typ = (state.raw.txnTypes || []).find(t => t.txn_type_code === payload.txn_type_code);
  const cc  = payload.cost_center_code
    ? (state.raw.costCenters || []).find(c => c.cost_center_code === payload.cost_center_code)
    : null;
  const st  = (state.raw.statuses || []).find(s => Number(s.status_id) === Number(payload.status_id));
  const led = payload.ledger_match_id != null
    ? (state.raw.ledgerMovements || []).find(l => Number(l.ledger_id) === Number(payload.ledger_match_id))
    : null;

  if (!editId) {
    // crear
    const nid = nextNumericId();
    const statement_id = `BR-${nid}`;

    const created = {
      statement_id,
      statement_date: payload.statement_date,
      statement_code: payload.statement_code || `BR-${nid}`,
      bank_account_code: payload.bank_account_code,
      bank_account_name: acc?.bank_account_name || "—",

      txn_type_code: payload.txn_type_code,
      txn_type_name: typ?.txn_type_name || "—",

      statement_reference: payload.statement_reference || "",
      statement_amount: payload.statement_amount,

      cost_center_code: payload.cost_center_code || "",
      cost_center_name: cc?.cost_center_name || (payload.cost_center_code ? "—" : "—"),

      description: payload.description || "",

      ledger_match_id: payload.ledger_match_id,
      ledger_code: led?.ledger_code || "",
      ledger_glosa: led?.ledger_glosa || "",

      has_support: payload.has_support,
      is_auto_match: payload.is_auto_match,
      is_matched: payload.is_matched,

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

    item.statement_date = payload.statement_date;
    item.statement_code = payload.statement_code || item.statement_code;
    item.bank_account_code = payload.bank_account_code;
    item.bank_account_name = acc?.bank_account_name || item.bank_account_name;

    item.txn_type_code = payload.txn_type_code;
    item.txn_type_name = typ?.txn_type_name || item.txn_type_name;

    item.statement_reference = payload.statement_reference || "";
    item.statement_amount = payload.statement_amount;

    item.cost_center_code = payload.cost_center_code || "";
    item.cost_center_name = cc?.cost_center_name || (payload.cost_center_code ? item.cost_center_name : "—");

    item.ledger_match_id = payload.ledger_match_id;
    item.ledger_code = led?.ledger_code || "";
    item.ledger_glosa = led?.ledger_glosa || "";

    item.description = payload.description || "";

    item.has_support = payload.has_support;
    item.is_auto_match = payload.is_auto_match;
    item.is_matched = payload.is_matched;

    item.status_id = payload.status_id || item.status_id;
    item.status_label = st?.status_label || item.status_label;
  }

  closeModal("editModal");
  applyFilters();
}

/* =========================
   Workflow: aprobar/rechazar + confirmación + reversa
========================= */
function openConfirm(iid, action) {
  const item = findItem(iid);
  if (!item) return;

  // Si está finalizado o bloqueado, no corresponde aprobar/rechazar nuevamente
  if (item.action_locked || isFinalStatus(item)) return;

  state.confirm.open = true;
  state.confirm.statement_id = iid;
  state.confirm.action = action;

  const actionLabel = action === "approve" ? "APROBAR (CONCILIAR)" : "RECHAZAR (DISCREPANCIA)";
  el("confirmTitle").textContent = `Confirmar acción: ${actionLabel}`;
  el("confirmSubtitle").textContent =
    `${item.statement_code} · ${formatISODate(item.statement_date)} · ${item.txn_type_name} · ${formatCLP(Math.abs(item.statement_amount))}`;

  el("confirmMessage").textContent = action === "approve"
    ? "¿Confirma que desea CONCILIAR este movimiento?"
    : "¿Confirma que desea marcar DISCREPANCIA para este movimiento?";

  const led = item.ledger_code ? `Ledger: ${item.ledger_code} · ${item.ledger_glosa}` : "Ledger: (sin match)";
  el("confirmMeta").textContent =
    `Cuenta: ${item.bank_account_code} · ${item.bank_account_name}\n` +
    `Referencia: ${item.statement_reference || "—"}\n` +
    `${led}\n` +
    `Flags: ${item.is_matched ? "Matched" : "No match"} / ${item.has_support ? "Con respaldo" : "Sin respaldo"} / ${item.is_auto_match ? "Auto" : "Manual"}`;

  openModal("confirmModal");
}

function confirmYes() {
  const iid = state.confirm.statement_id;
  const action = state.confirm.action;
  const item = findItem(iid);
  if (!item) return;

  // hard guard
  if (item.action_locked || isFinalStatus(item)) {
    closeModal("confirmModal");
    return;
  }

  // regla demo: conciliar exige match contable
  if (action === "approve") {
    if (!item.is_matched || !item.ledger_match_id) {
      alert("Validación workflow:\n- Para CONCILIAR (Aprobar) debe existir match contable (Ledger) y estar marcado como matched.");
      closeModal("confirmModal");
      return;
    }
  }

  // persistencia del estado anterior para reversa
  item.action_prev_status_id = item.status_id ?? null;
  item.action_prev_status_label = item.status_label ?? "Pendiente";

  if (action === "approve") {
    const st = (state.raw.statuses || []).find(s => safeLower(s.status_label).includes("concil"));
    item.status_label = st?.status_label || "Conciliado";
    item.status_id = st?.status_id ?? item.status_id;
    item.action_last = "approve";
  } else {
    const st = (state.raw.statuses || []).find(s => safeLower(s.status_label).includes("discrep"));
    item.status_label = st?.status_label || "Discrepancia";
    item.status_id = st?.status_id ?? item.status_id;
    item.action_last = "reject";
  }

  item.action_locked = true;

  closeModal("confirmModal");
  applyFilters();
}

function reverseAction(iid) {
  const item = findItem(iid);
  if (!item) return;

  // Regla: reversa solo si finalizado/bloqueado
  if (!item.action_locked && !isFinalStatus(item)) return;

  const fallbackLabel = "Pendiente";
  const fallbackSt = (state.raw.statuses || []).find(s => safeLower(s.status_label) === "pendiente") || null;

  const prevLabel = item.action_prev_status_label || fallbackLabel;
  const prevId = item.action_prev_status_id ?? (fallbackSt ? fallbackSt.status_id : null);

  item.status_label = prevLabel;
  if (prevId != null) item.status_id = prevId;

  item.action_locked = false;
  item.action_last = null;

  // seguridad: si por datos previos queda final, forzar fallback
  if (isFinalStatus(item)) {
    item.status_label = fallbackLabel;
    if (fallbackSt) item.status_id = fallbackSt.status_id;
  }

  applyFilters();
}

/* =========================
   UI bindings
========================= */
function bindUI() {
  el("btnApplyFilters").addEventListener("click", () => { syncFiltersFromUI(); applyFilters(); });
  el("btnResetFilters").addEventListener("click", () => resetFilters());

  el("sortBy").addEventListener("change", (e) => {
    state.sortBy = String(e.target.value || "date_desc");
    applyFilters();
  });

  el("btnPrev").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); renderAll(); });
  el("btnNext").addEventListener("click", () => { state.page = state.page + 1; renderAll(); });

  el("btnRefresh").addEventListener("click", () => applyFilters());
  el("btnNewRecon").addEventListener("click", () => openNew());
  el("btnSave").addEventListener("click", () => saveEdit());
  el("btnConfirmYes").addEventListener("click", () => confirmYes());

  // delegación acciones tabla
  el("reconTbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "view") return openView(id);
    if (action === "edit") return openEdit(id);
    if (action === "approve") return openConfirm(id, "approve");
    if (action === "reject") return openConfirm(id, "reject");
    if (action === "reverse") return reverseAction(id);
  });

  // cierre por ESC
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["editModal", "viewModal", "confirmModal"].forEach(closeModal);
  });
}

/* =========================
   Init
========================= */
async function loadData() {
  const res = await fetch("./data.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function init() {
  try {
    state.raw = await loadData();
  } catch (err) {
    console.error("[bank-reconciliation] data.json no disponible:", err);
    alert("No se pudo cargar data.json. Verifique que los 4 archivos estén en el mismo directorio y se sirvan vía HTTP.");
    return;
  }

  normalize();
  populateSelects();
  bindUI();

  state.filtered = sortItems([...state.items], state.sortBy);
  renderAll();
}

init();
