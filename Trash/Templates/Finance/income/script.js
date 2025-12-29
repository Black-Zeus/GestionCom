/* finance/additional-income - template estático (vanilla)
   - Carga data.json
   - Normaliza additionalIncomes -> items (objeto principal: income)
   - KPIs, filtros, orden, paginación
   - CRUD demo (en memoria)
   - Workflow: Pendiente/Aprobado/Rechazado + confirmación + bloqueo + reversa por fila
   - Reglas: ocultar editar en finalizados; reversa visible en finalizados; aprobar/rechazar deshabilitados tras acción
   - Modal View: misma estructura que Edit (form-grid), solo lectura (sin look “apagado”)

   === Especificación funcional (variables resueltas) ===
   MODULO              = finance
   SUBMODULO           = additional-income
   RUTA                = finance/additional-income
   TABLAS (mock)        = FinanceAdditionalIncome, FinanceStatus, FinanceIncomeCategory, FinanceFund, FinanceCostCenter
   WORKFLOW            = Pendiente/Aprobado/Rechazado
   OBJETO_PRINCIPAL    = income
   CAMPO_FECHA         = income_date
   CAMPO_MONTO         = income_amount
   CAMPO_PK            = income_id
   CATALOGOS           = funds, costCenters, statuses, incomeCategories
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
    category: "",
    fund: "",
    costCenter: "",
    onlyWithReceipt: false,
    onlyRecurring: false,
    onlyTaxable: false
  },
  sortBy: "date_desc",
  confirm: {
    open: false,
    income_id: null,
    action: null // "approve" | "reject"
  }
};

const el = (id) => document.getElementById(id);

function safeLower(s) { return String(s ?? "").toLowerCase(); }

function isFinalStatus(item) {
  const s = safeLower(item?.status_label);
  return s.includes("aprob") || s.includes("rech");
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
  const categoriesById = new Map((d.incomeCategories || []).map(c => [String(c.category_id), c]));
  const statusesById = new Map((d.statuses || []).map(s => [String(s.status_id), s]));
  const pendingStatus = (d.statuses || []).find(s => safeLower(s.status_label) === "pendiente") || null;

  state.items = (d.additionalIncomes || []).map(x => {
    const st = statusesById.get(String(x.status_id)) || { status_label: x.status_label || "Pendiente" };
    const cat = categoriesById.get(String(x.category_id)) || { category_name: x.category_name || "—" };

    const item = {
      // PK normalizada
      income_id: `I-${x.income_id}`,

      // principales
      income_date: x.income_date,
      income_code: x.income_code || `INC-${x.income_id}`,
      income_amount: Number(x.income_amount || 0),

      // relaciones / catálogos
      fund_code: x.fund_code,
      fund_name: (fundsByCode.get(x.fund_code) || {}).fund_name || x.fund_name || "—",

      cost_center_code: x.cost_center_code,
      cost_center_name: (ccByCode.get(x.cost_center_code) || {}).cost_center_name || x.cost_center_name || "—",

      category_id: x.category_id ?? null,
      category_name: cat.category_name || x.category_name || "—",

      // campos
      source_name: x.source_name || "—",
      document_no: x.document_no || "",
      description: x.income_description || x.description || "",

      has_receipt: Boolean(x.has_receipt),
      is_recurring: Boolean(x.is_recurring),
      is_taxable: Boolean(x.is_taxable),

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
  const total = list.reduce((a, b) => a + (b.income_amount || 0), 0);

  const approved = list
    .filter(i => safeLower(i.status_label).includes("aprob"))
    .reduce((a, b) => a + b.income_amount, 0);

  const pending = list
    .filter(i => safeLower(i.status_label).includes("pend"))
    .reduce((a, b) => a + b.income_amount, 0);

  const rejected = list
    .filter(i => safeLower(i.status_label).includes("rech"))
    .reduce((a, b) => a + b.income_amount, 0);

  const net = approved - rejected;

  return { total, approved, pending, rejected, net, count: list.length };
}

function renderKPIs() {
  const k = computeKPIs(state.filtered);

  el("kpiTotalIncome").textContent = formatCLP(k.total);
  el("kpiApproved").textContent = formatCLP(k.approved);
  el("kpiPending").textContent = formatCLP(k.pending);
  el("kpiRejected").textContent = formatCLP(k.rejected);

  const netEl = el("kpiNet");
  netEl.textContent = formatCLP(k.net);
  netEl.classList.remove("kpi__value--ok", "kpi__value--bad", "kpi__value--warn");
  if (k.net > 0) netEl.classList.add("kpi__value--ok");
  else if (k.net < 0) netEl.classList.add("kpi__value--bad");
  else netEl.classList.add("kpi__value--warn");

  el("kpiTotalIncomeHint").textContent = `${k.count} registros (según filtros)`;
  el("kpiApprovedHint").textContent = `Suma aprobados`;
  el("kpiPendingHint").textContent = `Suma pendientes`;
  el("kpiRejectedHint").textContent = `Suma rechazados`;
}

/* =========================
   Orden / filtros / paginación
========================= */
function sortItems(list, mode) {
  const arr = [...list];
  const byDate = (a, b) => new Date(a.income_date).getTime() - new Date(b.income_date).getTime();
  const byAmount = (a, b) => (a.income_amount || 0) - (b.income_amount || 0);

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
  state.filters.category = String(fd.get("category") || "");
  state.filters.fund = String(fd.get("fund") || "");
  state.filters.costCenter = String(fd.get("costCenter") || "");
  state.filters.onlyWithReceipt = el("onlyWithReceipt").checked;
  state.filters.onlyRecurring = el("onlyRecurring").checked;
  state.filters.onlyTaxable = el("onlyTaxable").checked;
}

function applyFilters() {
  const f = state.filters;
  const q = safeLower(f.q).trim();
  const from = f.dateFrom ? new Date(f.dateFrom + "T00:00:00") : null;
  const to = f.dateTo ? new Date(f.dateTo + "T23:59:59") : null;

  let result = state.items.filter(i => {
    if (q) {
      const hay =
        safeLower(i.income_code) + " " +
        safeLower(i.fund_code) + " " +
        safeLower(i.fund_name) + " " +
        safeLower(i.cost_center_code) + " " +
        safeLower(i.cost_center_name) + " " +
        safeLower(i.category_name) + " " +
        safeLower(i.source_name) + " " +
        safeLower(i.document_no) + " " +
        safeLower(i.description);

      if (!hay.includes(q)) return false;
    }

    if (from || to) {
      const d = new Date(i.income_date);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }

    if (f.status) {
      const s = safeLower(i.status_label);
      const target = safeLower(f.status);
      if (!s.includes(target)) return false;
    }

    if (f.category) {
      if (safeLower(i.category_name) !== safeLower(f.category)) return false;
    }

    if (f.fund) {
      if (i.fund_code !== f.fund) return false;
    }

    if (f.costCenter) {
      if (i.cost_center_code !== f.costCenter) return false;
    }

    if (f.onlyWithReceipt && !i.has_receipt) return false;
    if (f.onlyRecurring && !i.is_recurring) return false;
    if (f.onlyTaxable && !i.is_taxable) return false;

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
    category: "",
    fund: "",
    costCenter: "",
    onlyWithReceipt: false,
    onlyRecurring: false,
    onlyTaxable: false
  };
  el("filtersForm").reset();
  applyFilters();
}

function renderTable() {
  const tbody = el("incomeTbody");
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

  const sumPage = slice.reduce((a, b) => a + (b.income_amount || 0), 0);
  el("tableSummary").textContent = `Página: total ${formatCLP(sumPage)} · ítems ${slice.length}`;

  for (const i of slice) {
    const tr = document.createElement("tr");

    const badge = `<span class="${badgeClass(i.status_label)}"><span class="dot"></span>${i.status_label}</span>`;
    const receipt = i.has_receipt ? "Sí" : "No";

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
      i.is_recurring ? `<span class="pill pill--flag">Rec</span>` : "",
      i.is_taxable ? `<span class="pill pill--flag">Imp</span>` : ""
    ].filter(Boolean).join(" ");

    tr.innerHTML = `
      <td>${formatISODate(i.income_date)}</td>
      <td><strong>${i.income_code || "—"}</strong></td>
      <td>${i.fund_code} · ${i.fund_name}</td>
      <td>${i.cost_center_code} · ${i.cost_center_name}</td>
      <td>${i.category_name}</td>
      <td>${i.source_name}</td>
      <td class="td-right"><strong>${formatCLP(i.income_amount)}</strong></td>
      <td>${badge}</td>
      <td>${receipt}</td>
      <td>${flags || "—"}</td>
      <td class="td-right">
        <div class="row-actions">
          <button class="iconbtn" type="button" title="Ver" data-action="view" data-id="${i.income_id}">👁</button>
          ${showEdit ? `<button class="iconbtn" type="button" title="Editar" data-action="edit" data-id="${i.income_id}">✎</button>` : ""}
          <button class="iconbtn" type="button" title="Aprobar" data-action="approve" data-id="${i.income_id}" ${approveDisabled ? "disabled" : ""}>✓</button>
          <button class="iconbtn" type="button" title="Rechazar" data-action="reject" data-id="${i.income_id}" ${rejectDisabled ? "disabled" : ""}>✕</button>
          ${showReverse ? `<button class="iconbtn" type="button" title="Reversar" data-action="reverse" data-id="${i.income_id}">⟲</button>` : ""}
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

  // CATEGORIES
  const catSel = el("category");
  const editCatSel = el("editCategory");
  const viewCatSel = el("viewCategory");

  catSel.innerHTML = `<option value="">Todas</option>`;
  editCatSel.innerHTML = "";
  viewCatSel.innerHTML = "";

  (d.incomeCategories || []).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.category_name;
    opt.textContent = c.category_name;
    catSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = c.category_id;
    opt2.textContent = c.category_name;
    editCatSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = c.category_id;
    opt3.textContent = c.category_name;
    viewCatSel.appendChild(opt3);
  });

  // FUNDS
  const fundSel = el("fund");
  const editFundSel = el("editFund");
  const viewFundSel = el("viewFund");

  fundSel.innerHTML = `<option value="">Todos</option>`;
  editFundSel.innerHTML = "";
  viewFundSel.innerHTML = "";

  (d.funds || []).forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.fund_code;
    opt.textContent = `${f.fund_code} · ${f.fund_name}`;
    fundSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = f.fund_code;
    opt2.textContent = `${f.fund_code} · ${f.fund_name}`;
    editFundSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = f.fund_code;
    opt3.textContent = `${f.fund_code} · ${f.fund_name}`;
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
    const opt = document.createElement("option");
    opt.value = c.cost_center_code;
    opt.textContent = `${c.cost_center_code} · ${c.cost_center_name}`;
    ccSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = c.cost_center_code;
    opt2.textContent = `${c.cost_center_code} · ${c.cost_center_name}`;
    editCcSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = c.cost_center_code;
    opt3.textContent = `${c.cost_center_code} · ${c.cost_center_name}`;
    viewCcSel.appendChild(opt3);
  });
}

/* =========================
   Helpers CRUD / find
========================= */
function findItem(iid) {
  return state.items.find(x => x.income_id === iid) || null;
}

function nextNumericId() {
  const nums = state.items
    .map(i => Number(String(i.income_id).replace("I-", "")))
    .filter(n => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 12000;
  return max + 1;
}

/* =========================
   Modal: View
========================= */
function openView(iid) {
  const item = findItem(iid);
  if (!item) return;

  el("viewId").value = item.income_id;
  el("viewModalTitle").textContent = `Ver · ${item.income_code || item.income_id}`;
  el("viewModalSubtitle").textContent = `${formatISODate(item.income_date)} · ${formatCLP(item.income_amount)} · ${item.status_label}`;

  // set values
  el("viewDate").value = (item.income_date || "").slice(0, 10);
  el("viewCode").value = item.income_code || "";
  el("viewFund").value = item.fund_code || "";
  el("viewCostCenter").value = item.cost_center_code || "";
  el("viewCategory").value = String(item.category_id ?? "");
  el("viewSource").value = (item.source_name && item.source_name !== "—") ? item.source_name : "";
  el("viewAmount").value = String(item.income_amount ?? 0);
  el("viewDoc").value = item.document_no || "";
  el("viewDesc").value = item.description || "";
  el("viewHasReceipt").checked = Boolean(item.has_receipt);
  el("viewIsRecurring").checked = Boolean(item.is_recurring);
  el("viewIsTaxable").checked = Boolean(item.is_taxable);

  // status select (por id si existe, fallback por label)
  if (item.status_id != null) el("viewStatus").value = String(item.status_id);
  else {
    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(item.status_label));
    el("viewStatus").value = found ? String(found.status_id) : "";
  }

  el("viewHint").textContent = `ID: ${item.income_id}`;
  openModal("viewModal");
}

/* =========================
   Modal: Edit
========================= */
function openNew() {
  el("editId").value = "";
  el("editForm").reset();

  el("editModalTitle").textContent = "Nuevo ingreso adicional";
  el("editModalSubtitle").textContent = "Registrar ingreso con categoría, origen, flags y estado.";

  // defaults
  el("editDate").value = new Date().toISOString().slice(0, 10);
  el("editCode").value = "";
  el("editHasReceipt").checked = true;
  el("editIsRecurring").checked = false;
  el("editIsTaxable").checked = false;

  // default estado = Pendiente
  const st = (state.raw.statuses || []).find(s => safeLower(s.status_label) === "pendiente");
  if (st) el("editStatus").value = String(st.status_id);

  openModal("editModal");
}

function openEdit(iid) {
  const item = findItem(iid);
  if (!item) return;

  // regla: no se edita si finalizado
  if (isFinalStatus(item)) return;

  el("editId").value = item.income_id;

  el("editModalTitle").textContent = `Editar · ${item.income_code || item.income_id}`;
  el("editModalSubtitle").textContent = "Actualice datos del ingreso (no finalizado).";

  el("editDate").value = (item.income_date || "").slice(0, 10);
  el("editCode").value = item.income_code || "";
  el("editFund").value = item.fund_code || "";
  el("editCostCenter").value = item.cost_center_code || "";
  el("editCategory").value = String(item.category_id ?? "");
  el("editSource").value = (item.source_name && item.source_name !== "—") ? item.source_name : "";
  el("editAmount").value = String(item.income_amount ?? 0);
  el("editDoc").value = item.document_no || "";
  el("editDesc").value = item.description || "";
  el("editHasReceipt").checked = Boolean(item.has_receipt);
  el("editIsRecurring").checked = Boolean(item.is_recurring);
  el("editIsTaxable").checked = Boolean(item.is_taxable);

  if (item.status_id != null) el("editStatus").value = String(item.status_id);
  else {
    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(item.status_label));
    el("editStatus").value = found ? String(found.status_id) : "";
  }

  openModal("editModal");
}

function validateEdit(payload) {
  const errs = [];

  if (!payload.income_date) errs.push("Fecha es requerida.");
  if (!payload.fund_code) errs.push("Fondo es requerido.");
  if (!payload.cost_center_code) errs.push("Centro de costo es requerido.");
  if (!payload.category_id) errs.push("Categoría/Tipo es requerido.");

  const amount = Number(payload.income_amount);
  if (!Number.isFinite(amount) || amount <= 0) errs.push("Monto debe ser mayor a 0.");

  // regla demo: si no hay comprobante, el documento debe existir
  if (!payload.has_receipt && !String(payload.document_no || "").trim()) {
    errs.push("Si no posee comprobante, debe indicar N° de documento/referencia.");
  }

  return errs;
}

function saveEdit() {
  const editId = String(el("editId").value || "").trim();

  const payload = {
    income_date: String(el("editDate").value || ""),
    income_code: String(el("editCode").value || "").trim(),
    fund_code: String(el("editFund").value || ""),
    cost_center_code: String(el("editCostCenter").value || ""),
    category_id: Number(el("editCategory").value || 0),
    source_name: String(el("editSource").value || "").trim(),
    income_amount: Number(el("editAmount").value || 0),
    document_no: String(el("editDoc").value || "").trim(),
    description: String(el("editDesc").value || "").trim(),
    has_receipt: Boolean(el("editHasReceipt").checked),
    is_recurring: Boolean(el("editIsRecurring").checked),
    is_taxable: Boolean(el("editIsTaxable").checked),
    status_id: Number(el("editStatus").value || 0)
  };

  const errs = validateEdit(payload);
  if (errs.length) {
    alert("Validación:\n- " + errs.join("\n- "));
    return;
  }

  // resolver catálogos -> nombres
  const fund = (state.raw.funds || []).find(f => f.fund_code === payload.fund_code);
  const cc = (state.raw.costCenters || []).find(c => c.cost_center_code === payload.cost_center_code);
  const cat = (state.raw.incomeCategories || []).find(c => Number(c.category_id) === Number(payload.category_id));
  const st = (state.raw.statuses || []).find(s => Number(s.status_id) === Number(payload.status_id));

  if (!editId) {
    // crear
    const nid = nextNumericId();
    const income_id = `I-${nid}`;

    const created = {
      income_id,
      income_date: payload.income_date,
      income_code: payload.income_code || `INC-${nid}`,
      income_amount: payload.income_amount,

      fund_code: payload.fund_code,
      fund_name: fund?.fund_name || "—",

      cost_center_code: payload.cost_center_code,
      cost_center_name: cc?.cost_center_name || "—",

      category_id: payload.category_id,
      category_name: cat?.category_name || "—",

      source_name: payload.source_name || "—",
      document_no: payload.document_no || "",
      description: payload.description || "",

      has_receipt: payload.has_receipt,
      is_recurring: payload.is_recurring,
      is_taxable: payload.is_taxable,

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

    item.income_date = payload.income_date;
    item.income_code = payload.income_code || item.income_code;
    item.income_amount = payload.income_amount;

    item.fund_code = payload.fund_code;
    item.fund_name = fund?.fund_name || item.fund_name;

    item.cost_center_code = payload.cost_center_code;
    item.cost_center_name = cc?.cost_center_name || item.cost_center_name;

    item.category_id = payload.category_id;
    item.category_name = cat?.category_name || item.category_name;

    item.source_name = payload.source_name || "—";
    item.document_no = payload.document_no || "";
    item.description = payload.description || "";

    item.has_receipt = payload.has_receipt;
    item.is_recurring = payload.is_recurring;
    item.is_taxable = payload.is_taxable;

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
  state.confirm.income_id = iid;
  state.confirm.action = action;

  const actionLabel = action === "approve" ? "APROBAR" : "RECHAZAR";
  el("confirmTitle").textContent = `Confirmar acción: ${actionLabel}`;
  el("confirmSubtitle").textContent = `${item.income_code} · ${formatISODate(item.income_date)} · ${formatCLP(item.income_amount)}`;

  el("confirmMessage").textContent = action === "approve"
    ? "¿Confirma que desea APROBAR este ingreso?"
    : "¿Confirma que desea RECHAZAR este ingreso?";

  el("confirmMeta").textContent =
    `Fondo: ${item.fund_code} · ${item.fund_name}\n` +
    `Centro de costo: ${item.cost_center_code} · ${item.cost_center_name}\n` +
    `Categoría: ${item.category_name}\n` +
    `Origen: ${item.source_name}`;

  openModal("confirmModal");
}

function applyActionConfirmed() {
  const iid = state.confirm.income_id;
  const action = state.confirm.action;

  const item = findItem(iid);
  if (!item) return;

  // Guardado de estado previo para reversa
  item.action_prev_status_id = item.status_id ?? null;
  item.action_prev_status_label = item.status_label ?? null;

  if (action === "approve") setStatusDirect(item, "Aprobado");
  if (action === "reject")  setStatusDirect(item, "Rechazado");

  // Bloqueo definitivo para la fila
  item.action_locked = true;
  item.action_last = action;

  state.confirm.open = false;
  state.confirm.income_id = null;
  state.confirm.action = null;

  closeModal("confirmModal");
  applyFilters();
}

function reverseAction(iid) {
  const item = findItem(iid);
  if (!item) return;

  // Solo reversible si está finalizado o fue bloqueado
  if (!isFinalStatus(item) && !item.action_locked) return;

  // Restaura estado previo si existe; fallback a Pendiente (ESTADO_INICIAL)
  if (item.action_prev_status_label) {
    setStatusDirect(item, item.action_prev_status_label, item.action_prev_status_id);
  } else {
    setStatusDirect(item, "Pendiente");
  }

  // Desbloquea acciones
  item.action_locked = false;
  item.action_last = null;
  item.action_prev_status_id = null;
  item.action_prev_status_label = null;

  applyFilters();
}

/* =========================
   Events / init
========================= */
function wireEvents() {
  // Cerrar modales por backdrop/close
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-close");
      closeModal(id);

      if (id === "confirmModal") {
        state.confirm.open = false;
        state.confirm.income_id = null;
        state.confirm.action = null;
      }
    });
  });

  // Toolbar
  el("btnRefresh").addEventListener("click", () => init());
  el("btnNewIncome").addEventListener("click", openNew);

  // Filtros
  el("btnApplyFilters").addEventListener("click", () => { syncFiltersFromUI(); applyFilters(); });
  el("btnResetFilters").addEventListener("click", resetFilters);
  el("filtersForm").addEventListener("submit", (e) => { e.preventDefault(); syncFiltersFromUI(); applyFilters(); });

  // Orden
  el("sortBy").addEventListener("change", () => {
    state.sortBy = el("sortBy").value;
    applyFilters();
  });

  // Paginación
  el("btnPrev").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); renderAll(); });
  el("btnNext").addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(pages, state.page + 1);
    renderAll();
  });

  // Guardar edición
  el("btnSave").addEventListener("click", saveEdit);

  // Confirmación workflow
  el("btnConfirmYes").addEventListener("click", applyActionConfirmed);

  // Acciones tabla (delegación)
  el("incomeTable").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "view") { openView(id); return; }
    if (action === "edit") { openEdit(id); return; }
    if (action === "approve") { openConfirm(id, "approve"); return; }
    if (action === "reject") { openConfirm(id, "reject"); return; }
    if (action === "reverse") { reverseAction(id); return; }
  });

  // ESC para cerrar modales
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["editModal", "viewModal", "confirmModal"].forEach(id => closeModal(id));
    state.confirm.open = false;
    state.confirm.income_id = null;
    state.confirm.action = null;
  });
}

async function init() {
  try {
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar data.json (HTTP ${res.status})`);
    state.raw = await res.json();

    normalize();
    populateSelects();

    state.filtered = sortItems(state.items, state.sortBy);
    state.page = 1;

    renderAll();
  } catch (err) {
    console.error(err);
    alert("Error cargando datos. Revise consola (F12).");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  init();
});
