/* finance/expenses - template estático
   - Carga data.json
   - Normaliza gastos + reposiciones a "movements"
   - KPIs, filtros, orden, paginación
   - CRUD demo (en memoria)
   - Aprobar/Rechazar con modal de confirmación + bloqueo + reversa por fila
   - Si estado es Aprobado/Rechazado (desde JSON o por acción UI): no se muestra Editar y se muestra Reversar
   - View modal: misma estructura que Edit (form-grid), solo lectura
*/

const state = {
  raw: null,
  movements: [],
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
    onlyWithReceipt: false
  },
  sortByConfirmation: "date_desc",
  confirm: {
    open: false,
    movement_id: null,
    action: null // "approve" | "reject"
  }
};

const el = (id) => document.getElementById(id);

function safeLower(s) { return String(s ?? "").toLowerCase(); }

function isFinalStatus(m) {
  const s = safeLower(m?.status_label);
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

function normalize() {
  const d = state.raw;

  const fundsByCode = new Map((d.funds || []).map(f => [f.fund_code, f]));
  const statusesById = new Map((d.statuses || []).map(s => [String(s.status_id), s]));
  const pendingStatus = (d.statuses || []).find(s => safeLower(s.status_label) === "pendiente") || null;

  const expenses = (d.pettyCashExpenses || []).map(x => {
    const statusObj = statusesById.get(String(x.status_id)) || { status_label: x.status_label || "Pendiente" };

    const m = {
      type: "expense",
      movement_id: `E-${x.expense_id}`,
      date: x.expense_date,
      code: x.expense_code,
      fund_code: x.fund_code,
      fund_name: (fundsByCode.get(x.fund_code) || {}).fund_name || x.fund_name || "—",
      category_name: x.category_name || "—",
      provider_name: x.provider_name || "—",
      amount: Number(x.expense_amount || 0),
      status_id: x.status_id,
      status_label: statusObj.status_label || x.status_label || "—",
      has_receipt: Boolean(x.has_receipt),
      document_no: x.document_no || "",
      description: x.expense_description || x.description || "",

      // control acciones
      action_locked: false,
      action_prev_status_id: null,
      action_prev_status_label: null,
      action_last: null
    };

    // Si viene finalizado desde JSON, se habilita "Reversar" y se bloquea Aprobar/Rechazar.
    if (isFinalStatus(m)) {
      m.action_locked = true;
      m.action_last = safeLower(m.status_label).includes("aprob") ? "approve" : "reject";
      // Reversa vuelve a Pendiente (fallback técnico)
      m.action_prev_status_label = "Pendiente";
      m.action_prev_status_id = pendingStatus?.status_id ?? null;
    }

    return m;
  });

  const replenishments = (d.pettyCashReplenishments || []).map(x => {
    return {
      type: "replenishment",
      movement_id: `R-${x.replenishment_id}`,
      date: x.replenishment_date,
      code: x.replenishment_code,
      fund_code: x.fund_code,
      fund_name: (fundsByCode.get(x.fund_code) || {}).fund_name || x.fund_name || "—",
      category_name: "Reposición",
      provider_name: x.source_name || "—",
      amount: Number(x.replenishment_amount || 0),
      status_id: x.status_id ?? null,
      status_label: x.status_label || "Confirmada",
      has_receipt: Boolean(x.has_receipt),
      document_no: x.document_no || "",
      description: x.replenishment_description || x.description || "",

      // no aplica aprobar/rechazar en este demo
      action_locked: true,
      action_prev_status_id: null,
      action_prev_status_label: null,
      action_last: null
    };
  });

  state.movements = [...expenses, ...replenishments];
}

function computeKPIs(movs) {
  const onlyExpenses = movs.filter(m => m.type === "expense");
  const onlyRepl = movs.filter(m => m.type === "replenishment");

  const totalExpenses = onlyExpenses.reduce((a, b) => a + b.amount, 0);
  const totalRepl = onlyRepl.reduce((a, b) => a + b.amount, 0);

  const approved = onlyExpenses
    .filter(m => safeLower(m.status_label).includes("aprob"))
    .reduce((a, b) => a + b.amount, 0);

  const pending = onlyExpenses
    .filter(m => safeLower(m.status_label).includes("pend"))
    .reduce((a, b) => a + b.amount, 0);

  const net = totalRepl - totalExpenses;
  return { totalExpenses, approved, pending, totalRepl, net, count: movs.length };
}

function renderKPIs() {
  const k = computeKPIs(state.filtered);

  el("kpiTotalExpenses").textContent = formatCLP(k.totalExpenses);
  el("kpiApproved").textContent = formatCLP(k.approved);
  el("kpiPending").textContent = formatCLP(k.pending);
  el("kpiReplenishments").textContent = formatCLP(k.totalRepl);

  const netEl = el("kpiNet");
  netEl.textContent = formatCLP(k.net);
  netEl.classList.remove("kpi__value--ok", "kpi__value--bad", "kpi__value--warn");
  if (k.net > 0) netEl.classList.add("kpi__value--ok");
  else if (k.net < 0) netEl.classList.add("kpi__value--bad");
  else netEl.classList.add("kpi__value--warn");

  el("kpiTotalExpensesHint").textContent = `${state.filtered.filter(m => m.type === "expense").length} gastos`;
  el("kpiApprovedHint").textContent = `Suma aprobados`;
  el("kpiPendingHint").textContent = `Suma pendientes`;
  el("kpiReplenishmentsHint").textContent = `${state.filtered.filter(m => m.type === "replenishment").length} reposiciones`;
}

function sortMovements(list, mode) {
  const arr = [...list];
  const byDate = (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime();
  const byAmount = (a, b) => (a.amount || 0) - (b.amount || 0);

  switch (mode) {
    case "date_asc": arr.sort(byDate); break;
    case "date_desc": arr.sort((a, b) => byDate(b, a)); break;
    case "amount_asc": arr.sort(byAmount); break;
    case "amount_desc": arr.sort((a, b) => byAmount(b, a)); break;
    default: arr.sort((a, b) => byDate(b, a));
  }
  return arr;
}

function applyFilters() {
  const f = state.filters;
  const q = safeLower(f.q).trim();
  const from = f.dateFrom ? new Date(f.dateFrom + "T00:00:00") : null;
  const to = f.dateTo ? new Date(f.dateTo + "T23:59:59") : null;

  let result = state.movements.filter(m => {
    if (q) {
      const hay =
        safeLower(m.code) + " " +
        safeLower(m.fund_code) + " " +
        safeLower(m.fund_name) + " " +
        safeLower(m.category_name) + " " +
        safeLower(m.provider_name) + " " +
        safeLower(m.document_no) + " " +
        safeLower(m.description);
      if (!hay.includes(q)) return false;
    }

    if (from || to) {
      const md = new Date(m.date);
      if (from && md < from) return false;
      if (to && md > to) return false;
    }

    if (f.status) {
      const s = safeLower(m.status_label);
      const target = safeLower(f.status);
      if (!s.includes(target)) return false;
    }

    if (f.category) {
      if (safeLower(m.category_name) !== safeLower(f.category)) return false;
    }

    if (f.fund) {
      if (m.fund_code !== f.fund) return false;
    }

    if (f.onlyWithReceipt) {
      if (!m.has_receipt) return false;
    }

    return true;
  });

  result = sortMovements(result, state.sortByConfirmation);
  state.filtered = result;
  state.page = 1;
  renderAll();
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

function findMovement(mid) {
  return state.movements.find(m => m.movement_id === mid) || null;
}

function renderTable() {
  const tbody = el("movementsTbody");
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
    tr.innerHTML = `<td colspan="10" class="muted">Sin resultados para los filtros aplicados.</td>`;
    tbody.appendChild(tr);
    el("tableSummary").textContent = "—";
    return;
  }

  const sums = slice.reduce((acc, m) => {
    if (m.type === "expense") acc.exp += m.amount;
    else acc.rep += m.amount;
    return acc;
  }, { exp: 0, rep: 0 });

  el("tableSummary").textContent =
    `Página: gastos ${formatCLP(sums.exp)} · reposiciones ${formatCLP(sums.rep)} · neto ${formatCLP(sums.rep - sums.exp)}`;

  for (const m of slice) {
    const tr = document.createElement("tr");

    const typePill = m.type === "expense"
      ? `<span class="pill pill--out">Egreso</span>`
      : `<span class="pill pill--in">Ingreso</span>`;

    const badge = `<span class="${badgeClass(m.status_label)}"><span class="dot"></span>${m.status_label}</span>`;
    const receipt = m.has_receipt ? "Sí" : "No";

    const isExpense = m.type === "expense";
    const final = isExpense && isFinalStatus(m);
    const locked = Boolean(m.action_locked) || final;

    const approveDisabled = (!isExpense) || locked;
    const rejectDisabled  = (!isExpense) || locked;

    // Si gasto está Aprobado/Rechazado => Editar NO visible
    const showEdit = !(isExpense && final);

    // Reversar visible si gasto está finalizado/bloqueado
    const showReverse = isExpense && locked;

    tr.innerHTML = `
      <td>${typePill}</td>
      <td>${formatISODate(m.date)}</td>
      <td><strong>${m.code || "—"}</strong></td>
      <td>${m.fund_code} · ${m.fund_name}</td>
      <td>${m.category_name}</td>
      <td>${m.provider_name}</td>
      <td class="td-right"><strong>${formatCLP(m.amount)}</strong></td>
      <td>${badge}</td>
      <td>${receipt}</td>
      <td class="td-right">
        <div class="row-actions">
          <button class="iconbtn" type="button" title="Ver detalle" data-action="detail" data-id="${m.movement_id}">👁</button>

          ${showEdit ? `<button class="iconbtn" type="button" title="Editar" data-action="edit" data-id="${m.movement_id}">✎</button>` : ""}

          <button class="iconbtn" type="button" title="Aprobar" data-action="approve" data-id="${m.movement_id}" ${approveDisabled ? "disabled" : ""}>✓</button>
          <button class="iconbtn" type="button" title="Rechazar" data-action="reject" data-id="${m.movement_id}" ${rejectDisabled ? "disabled" : ""}>✕</button>

          ${showReverse ? `<button class="iconbtn" type="button" title="Reversar" data-action="reverse" data-id="${m.movement_id}">⟲</button>` : ""}
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

/* ===== Selects (filtros + edit + view) ===== */
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

  (d.categories || []).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.category_name;
    opt.textContent = c.category_name;
    catSel.appendChild(opt);

    const opt2 = document.createElement("option");
    opt2.value = c.category_name;
    opt2.textContent = c.category_name;
    editCatSel.appendChild(opt2);

    const opt3 = document.createElement("option");
    opt3.value = c.category_name;
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
}

function syncFiltersFromUI() {
  const form = el("filtersForm");
  const fd = new FormData(form);
  state.filters.q = String(fd.get("q") || "");
  state.filters.dateFrom = String(fd.get("dateFrom") || "");
  state.filters.dateTo = String(fd.get("dateTo") || "");
  state.filters.status = String(fd.get("status") || "");
  state.filters.category = String(fd.get("category") || "");
  state.filters.fund = String(fd.get("fund") || "");
  state.filters.onlyWithReceipt = el("onlyWithReceipt").checked;
}

function resetFilters() {
  state.filters = { q: "", dateFrom: "", dateTo: "", status: "", category: "", fund: "", onlyWithReceipt: false };
  el("filtersForm").reset();
  applyFilters();
}

/* ===== VIEW (Detalle) - misma estructura que Edit ===== */
function setViewMode(type) {
  el("viewMode").value = type;
  el("viewType").value = type;

  const isExpense = type === "expense";
  el("viewCategoryField").style.display = isExpense ? "" : "none";
  el("viewProviderField").style.display = isExpense ? "" : "none";
  el("viewReceiptField").style.display = isExpense ? "" : "none";
  el("viewStatusField").style.display = isExpense ? "" : "none";
}

function renderDetail(m) {
  const isExpense = m.type === "expense";

  el("detailTitle").textContent = `Ver · ${m.code || m.movement_id}`;
  el("detailSubtitle").textContent =
    `${isExpense ? "Gasto (egreso)" : "Reposición (ingreso)"} · ${formatISODate(m.date)} · ${formatCLP(m.amount)}`;

  setViewMode(m.type);

  // Tipo / Fecha
  el("viewType").value = m.type;
  el("viewDate").value = (m.date || "").slice(0, 10);

  // Fondo
  el("viewFund").value = m.fund_code || "";

  // Monto / Documento / Descripción
  el("viewAmount").value = String(m.amount ?? 0);
  el("viewDoc").value = m.document_no || "";
  el("viewDesc").value = m.description || "";

  if (isExpense) {
    el("viewCategory").value = m.category_name || "";
    el("viewProvider").value = (m.provider_name && m.provider_name !== "—") ? m.provider_name : "";
    el("viewHasReceipt").checked = Boolean(m.has_receipt);

    if (m.status_id != null) {
      el("viewStatus").value = String(m.status_id);
    } else {
      const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(m.status_label));
      el("viewStatus").value = found ? String(found.status_id) : "";
    }
  }

  el("detailHint").textContent = `ID: ${m.movement_id}`;
}

/* ===== EDIT ===== */
function setEditMode(type) {
  el("editMode").value = type;
  el("editType").value = type;

  const isExpense = type === "expense";
  el("editCategoryField").style.display = isExpense ? "" : "none";
  el("editProviderField").style.display = isExpense ? "" : "none";
  el("editReceiptField").style.display = isExpense ? "" : "none";
  el("editStatusField").style.display = isExpense ? "" : "none";

  el("editModalTitle").textContent = isExpense ? "Nuevo gasto operativo" : "Nueva reposición";
  el("editModalSubtitle").textContent = isExpense
    ? "Registrar egreso con categoría, proveedor y estado."
    : "Registrar ingreso (reposicion) al fondo/caja chica.";
}

function openNewExpense() {
  el("editId").value = "";
  el("editForm").reset();
  setEditMode("expense");
  el("editDate").value = new Date().toISOString().slice(0, 10);
  openModal("editModal");
}

function openNewReplenishment() {
  el("editId").value = "";
  el("editForm").reset();
  setEditMode("replenishment");
  el("editDate").value = new Date().toISOString().slice(0, 10);
  openModal("editModal");
}

function openEdit(mid) {
  const m = findMovement(mid);
  if (!m) return;

  // Regla: si es gasto y está finalizado, no se permite editar
  if (m.type === "expense" && isFinalStatus(m)) return;

  el("editId").value = mid;
  setEditMode(m.type);

  el("editDate").value = (m.date || "").slice(0, 10);
  el("editFund").value = m.fund_code || "";
  el("editAmount").value = String(m.amount ?? 0);
  el("editDoc").value = m.document_no || "";
  el("editDesc").value = m.description || "";

  if (m.type === "expense") {
    el("editCategory").value = m.category_name || "";
    el("editProvider").value = m.provider_name === "—" ? "" : m.provider_name;
    el("editHasReceipt").checked = Boolean(m.has_receipt);

    const found = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(m.status_label));
    el("editStatus").value = found ? String(found.status_id) : String(state.raw.statuses?.[0]?.status_id ?? "");
  }

  el("editModalTitle").textContent = `Editar · ${m.code || mid}`;
  el("editModalSubtitle").textContent = "Modifique los campos y guarde.";
  openModal("editModal");
}

function saveEdit() {
  const mode = el("editMode").value;
  const id = el("editId").value;

  const date = el("editDate").value;
  const fund_code = el("editFund").value;
  const amount = Number(el("editAmount").value || 0);
  const document_no = el("editDoc").value.trim();
  const description = el("editDesc").value.trim();

  if (!date || !fund_code || amount <= 0) {
    alert("Validación: fecha, fondo y monto (>0) son obligatorios.");
    return;
  }

  const fund = (state.raw.funds || []).find(f => f.fund_code === fund_code);

  if (id) {
    const m = findMovement(id);
    if (!m) return;

    if (m.type === "expense" && isFinalStatus(m)) {
      alert("No es posible editar un gasto Aprobado/Rechazado.");
      return;
    }

    m.date = date;
    m.fund_code = fund_code;
    m.fund_name = fund?.fund_name || m.fund_name;
    m.amount = amount;
    m.document_no = document_no;
    m.description = description;

    if (mode === "expense") {
      m.category_name = el("editCategory").value || m.category_name;
      m.provider_name = el("editProvider").value.trim() || "—";
      m.has_receipt = el("editHasReceipt").checked;

      const status_id = el("editStatus").value;
      const st = (state.raw.statuses || []).find(s => String(s.status_id) === String(status_id));
      m.status_id = Number(status_id);
      m.status_label = st?.status_label || m.status_label;

      // Si queda finalizado por edición, se bloquea y se habilita reversa
      if (isFinalStatus(m)) {
        const pendingStatus = (state.raw.statuses || []).find(s => safeLower(s.status_label) === "pendiente");
        m.action_locked = true;
        m.action_last = safeLower(m.status_label).includes("aprob") ? "approve" : "reject";
        m.action_prev_status_label = "Pendiente";
        m.action_prev_status_id = pendingStatus?.status_id ?? null;
      }
    }
  } else {
    const nextSeq = state.movements.length + 1;

    if (mode === "expense") {
      const status_id = el("editStatus").value;
      const st = (state.raw.statuses || []).find(s => String(s.status_id) === String(status_id));

      const created = {
        type: "expense",
        movement_id: `E-${10000 + nextSeq}`,
        date,
        code: `EXP-${String(10000 + nextSeq)}`,
        fund_code,
        fund_name: fund?.fund_name || "—",
        category_name: el("editCategory").value || "—",
        provider_name: el("editProvider").value.trim() || "—",
        amount,
        status_id: Number(status_id),
        status_label: st?.status_label || "Pendiente",
        has_receipt: el("editHasReceipt").checked,
        document_no,
        description,

        action_locked: false,
        action_prev_status_id: null,
        action_prev_status_label: null,
        action_last: null
      };

      if (isFinalStatus(created)) {
        const pendingStatus = (state.raw.statuses || []).find(s => safeLower(s.status_label) === "pendiente");
        created.action_locked = true;
        created.action_last = safeLower(created.status_label).includes("aprob") ? "approve" : "reject";
        created.action_prev_status_label = "Pendiente";
        created.action_prev_status_id = pendingStatus?.status_id ?? null;
      }

      state.movements.unshift(created);
    } else {
      const created = {
        type: "replenishment",
        movement_id: `R-${20000 + nextSeq}`,
        date,
        code: `REP-${String(20000 + nextSeq)}`,
        fund_code,
        fund_name: fund?.fund_name || "—",
        category_name: "Reposición",
        provider_name: "Transferencia",
        amount,
        status_id: null,
        status_label: "Confirmada",
        has_receipt: false,
        document_no,
        description,

        action_locked: true,
        action_prev_status_id: null,
        action_prev_status_label: null,
        action_last: null
      };
      state.movements.unshift(created);
    }
  }

  closeModal("editModal");
  applyFilters();
}

/* ===== Confirmación + Lock + Reversa ===== */
function openConfirm(mid, action) {
  const m = findMovement(mid);
  if (!m) return;

  // Solo aplica a gastos
  if (m.type !== "expense") return;

  // Si está finalizado o bloqueado, no corresponde aprobar/rechazar nuevamente
  if (m.action_locked || isFinalStatus(m)) return;

  state.confirm.open = true;
  state.confirm.movement_id = mid;
  state.confirm.action = action;

  const actionLabel = action === "approve" ? "APROBAR" : "RECHAZAR";
  el("confirmTitle").textContent = `Confirmar acción: ${actionLabel}`;
  el("confirmSubtitle").textContent = `${m.code} · ${formatISODate(m.date)} · ${formatCLP(m.amount)}`;
  el("confirmMessage").textContent = action === "approve"
    ? "¿Confirma que desea APROBAR este gasto?"
    : "¿Confirma que desea RECHAZAR este gasto?";

  el("confirmMeta").textContent =
    `Fondo: ${m.fund_code} · ${m.fund_name}\n` +
    `Categoría: ${m.category_name}\n` +
    `Proveedor: ${m.provider_name}`;

  openModal("confirmModal");
}

function setStatusDirect(m, label, statusIdOverride = undefined) {
  m.status_label = label;

  if (typeof statusIdOverride !== "undefined" && statusIdOverride !== null) {
    m.status_id = statusIdOverride;
    return;
  }

  const st = (state.raw.statuses || []).find(s => safeLower(s.status_label) === safeLower(label));
  if (st) m.status_id = st.status_id;
}

function applyActionConfirmed() {
  const mid = state.confirm.movement_id;
  const action = state.confirm.action;

  const m = findMovement(mid);
  if (!m) return;

  // Guardado de estado previo para reversa
  m.action_prev_status_id = m.status_id ?? null;
  m.action_prev_status_label = m.status_label ?? null;

  if (action === "approve") setStatusDirect(m, "Aprobado");
  if (action === "reject")  setStatusDirect(m, "Rechazado");

  // Bloqueo definitivo para la fila
  m.action_locked = true;
  m.action_last = action;

  state.confirm.open = false;
  state.confirm.movement_id = null;
  state.confirm.action = null;

  closeModal("confirmModal");
  applyFilters();
}

function reverseAction(mid) {
  const m = findMovement(mid);
  if (!m) return;
  if (m.type !== "expense") return;

  // Solo reversible si está finalizado o fue bloqueado
  if (!isFinalStatus(m) && !m.action_locked) return;

  // Restaura estado previo si existe; fallback a Pendiente
  if (m.action_prev_status_label) {
    setStatusDirect(m, m.action_prev_status_label, m.action_prev_status_id);
  } else {
    setStatusDirect(m, "Pendiente");
  }

  // Desbloquea acciones
  m.action_locked = false;
  m.action_last = null;
  m.action_prev_status_id = null;
  m.action_prev_status_label = null;

  applyFilters();
}

/* ===== Eventos y init ===== */
function wireEvents() {
  // Cierre modales
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-close");
      closeModal(id);

      if (id === "confirmModal") {
        state.confirm.open = false;
        state.confirm.movement_id = null;
        state.confirm.action = null;
      }
    });
  });

  // Toolbar
  el("btnRefresh").addEventListener("click", async () => init());
  el("btnNewExpense").addEventListener("click", openNewExpense);
  el("btnNewReplenishment").addEventListener("click", openNewReplenishment);

  // Filtros
  el("btnApplyFilters").addEventListener("click", () => { syncFiltersFromUI(); applyFilters(); });
  el("btnResetFilters").addEventListener("click", resetFilters);
  el("filtersForm").addEventListener("submit", (e) => { e.preventDefault(); syncFiltersFromUI(); applyFilters(); });

  // Orden
  el("sortBy").addEventListener("change", () => {
    state.sortByConfirmation = el("sortBy").value;
    applyFilters();
  });

  // Paginación
  el("btnPrev").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); renderAll(); });
  el("btnNext").addEventListener("click", () => {
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(pages, state.page + 1);
    renderAll();
  });

  // Modal edición
  el("editType").addEventListener("change", () => setEditMode(el("editType").value));
  el("btnSave").addEventListener("click", saveEdit);

  // Modal confirmación
  el("btnConfirmYes").addEventListener("click", applyActionConfirmed);

  // Acciones tabla (delegación)
  el("movementsTable").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "detail") {
      const m = findMovement(id);
      if (!m) return;
      renderDetail(m);
      openModal("detailModal");
      return;
    }

    if (action === "edit") { openEdit(id); return; }
    if (action === "approve") { openConfirm(id, "approve"); return; }
    if (action === "reject") { openConfirm(id, "reject"); return; }
    if (action === "reverse") { reverseAction(id); return; }
  });

  // ESC para cerrar modales
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["editModal", "detailModal", "confirmModal"].forEach(id => closeModal(id));
    state.confirm.open = false;
    state.confirm.movement_id = null;
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

    state.filtered = sortMovements(state.movements, state.sortByConfirmation);
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
