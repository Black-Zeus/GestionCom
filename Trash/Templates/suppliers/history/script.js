// script.js
/* =========================================================
   GestionCom • suppliers/purchase-history (vanilla)
   ---------------------------------------------------------
   - Objeto normalizado principal: purchase
   - Columna de fecha principal: purchase_date
   - Columna de monto principal: total_amount
   - Identificador (PK): purchase_id
   - Catálogos asociados: suppliers, purchase_categories, purchase_statuses,
     cost_centers, payment_methods, currencies
   - Workflow (aplica): Pendiente/Aprobado/Rechazado
   - Condición estado final: status_label incluye “Aprob” o “Rech”
   - Estado inicial fallback reversa: Pendiente
   ========================================================= */

(function () {
  "use strict";

  // -------- DOM helpers --------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const debounce = (fn, ms = 200) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const fmtInt = (n) =>
    new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(n || 0));

  const fmtDateShort = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const fmtDateTime = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}-${mm}-${yy} ${hh}:${mi}`;
  };

  const toLocalDatetimeInputValue = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (x) => String(x).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };

  const fmtMoney = (amount, currencyCode) => {
    const n = Number(amount || 0);
    const code = String(currencyCode || "CLP");
    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: code,
        currencyDisplay: "symbol",
        maximumFractionDigits: code === "CLP" ? 0 : 2,
      }).format(n);
    } catch {
      return `${code} ${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n)}`;
    }
  };

  // -------- State --------
  const STATE = {
    db: null,

    byId: {
      suppliers: new Map(),
      categories: new Map(),
      statuses: new Map(),
      costCenters: new Map(),
      paymentMethods: new Map(),
      currencies: new Map(),
    },

    purchases: [],

    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      category_id: "",
      supplier_id: "",
      cost_center_id: "",
      currency_id: "",
      credit_only: false,
      with_document: false,
      recurring_only: false,
      with_notes: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    confirm: { action: null, purchase_id: null }, // approve | reject
    editing: { purchase_id: null, mode: "edit" }, // edit | new
  };

  // -------- Workflow rules --------
  const WORKFLOW = {
    initial_status_label: "Pendiente",
    finalLabelIncludes: ["aprob", "rech"],
  };

  const isFinalStatusLabel = (label) => {
    const v = String(label || "").toLowerCase();
    return WORKFLOW.finalLabelIncludes.some((k) => v.includes(k));
  };

  // -------- Load + init --------
  async function loadData() {
    // Nota: si se abre el HTML vía file://, fetch puede fallar por CORS.
    // Recomendado: servir con un http server (p.ej. python -m http.server).
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar data.json (HTTP ${res.status})`);
    return res.json();
  }

  function buildMaps(db) {
    const map = (arr, key = "id") => {
      const m = new Map();
      (arr || []).forEach((x) => m.set(Number(x[key]), x));
      return m;
    };

    STATE.byId.suppliers = map(db.suppliers);
    STATE.byId.categories = map(db.purchase_categories);
    STATE.byId.statuses = map(db.purchase_statuses);
    STATE.byId.costCenters = map(db.cost_centers);
    STATE.byId.paymentMethods = map(db.payment_methods);
    STATE.byId.currencies = map(db.currencies);
  }

  function getInitialStatusId() {
    const s = (STATE.db.purchase_statuses || []).find((x) => String(x.status_label) === WORKFLOW.initial_status_label);
    return s ? Number(s.id) : Number((STATE.db.purchase_statuses || [])[0]?.id || 1);
  }

  function normalizePurchases(db) {
    const list = (db.purchases || []).map((p) => {
      const supplier = STATE.byId.suppliers.get(Number(p.supplier_id)) || null;
      const category = STATE.byId.categories.get(Number(p.category_id)) || null;
      const status = STATE.byId.statuses.get(Number(p.status_id)) || null;
      const cc = STATE.byId.costCenters.get(Number(p.cost_center_id)) || null;
      const pm = STATE.byId.paymentMethods.get(Number(p.payment_method_id)) || null;
      const cur = STATE.byId.currencies.get(Number(p.currency_id)) || null;

      const statusLabel = status?.status_label || "—";
      const isFinal = isFinalStatusLabel(statusLabel);

      const total = Number(p.total_amount ?? (Number(p.subtotal_amount || 0) + Number(p.tax_amount || 0)));
      const subtotal = Number(p.subtotal_amount || 0);
      const tax = Number(p.tax_amount || 0);

      return {
        ...p,
        purchase_id: Number(p.id),
        purchase_date: p.purchase_date,
        total_amount: total,
        subtotal_amount: subtotal,
        tax_amount: tax,

        supplier,
        category,
        status,
        cost_center: cc,
        payment_method: pm,
        currency: cur,

        is_final: isFinal,

        _search: [
          p.purchase_code,
          p.document_number,
          supplier?.supplier_name,
          supplier?.supplier_code,
          category?.category_label,
          status?.status_label,
          cc?.cost_center_name,
          pm?.method_label,
          cur?.currency_code,
          p.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });

    list.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
    return list;
  }

  // -------- Select helpers --------
  function fillSelect(selectEl, items, { valueKey = "id", labelKey = "label", includeEmpty = false, emptyLabel = "Todos" } = {}) {
    if (!selectEl) return;
    const curr = selectEl.value;
    const opts = [];
    if (includeEmpty) opts.push(`<option value="">${escapeHtml(emptyLabel)}</option>`);
    (items || []).forEach((it) => {
      const v = String(it[valueKey]);
      const lbl = String(it[labelKey] ?? it[valueKey]);
      opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(lbl)}</option>`);
    });
    selectEl.innerHTML = opts.join("");
    if (curr) selectEl.value = curr;
  }

  function initFilterSelects() {
    const statuses = (STATE.db.purchase_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const categories = (STATE.db.purchase_categories || []).map((c) => ({ id: c.id, label: `${c.category_code} • ${c.category_label}` }));
    const suppliers = (STATE.db.suppliers || []).map((s) => ({ id: s.id, label: `${s.supplier_code} • ${s.supplier_name}` }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const curs = (STATE.db.currencies || []).map((c) => ({ id: c.id, label: `${c.currency_code} • ${c.currency_name}` }));

    fillSelect($("#filterStatus"), statuses, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCategory"), categories, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterSupplier"), suppliers, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCostCenter"), ccs, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCurrency"), curs, { includeEmpty: true, emptyLabel: "Todas" });
  }

  function initEditSelects() {
    const suppliers = (STATE.db.suppliers || []).map((s) => ({ id: s.id, label: `${s.supplier_code} • ${s.supplier_name}` }));
    const categories = (STATE.db.purchase_categories || []).map((c) => ({ id: c.id, label: `${c.category_code} • ${c.category_label}` }));
    const statuses = (STATE.db.purchase_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const pms = (STATE.db.payment_methods || []).map((m) => ({ id: m.id, label: m.method_label }));
    const curs = (STATE.db.currencies || []).map((c) => ({ id: c.id, label: `${c.currency_code} • ${c.currency_name}` }));

    fillSelect($("#editSupplier"), suppliers, { includeEmpty: false });
    fillSelect($("#editCategory"), categories, { includeEmpty: false });
    fillSelect($("#editStatus"), statuses, { includeEmpty: false });
    fillSelect($("#editCostCenter"), [{ id: "", label: "—" }, ...ccs], { includeEmpty: false });
    fillSelect($("#editPaymentMethod"), [{ id: "", label: "—" }, ...pms], { includeEmpty: false });
    fillSelect($("#editCurrency"), curs, { includeEmpty: false });
  }

  // -------- Filtering + sorting + paging --------
  function getFiltered() {
    const f = STATE.filters;
    const term = String(f.term || "").trim().toLowerCase();

    const from = f.date_from ? new Date(f.date_from + "T00:00:00") : null;
    const to = f.date_to ? new Date(f.date_to + "T23:59:59") : null;

    return STATE.purchases.filter((p) => {
      if (term && !p._search.includes(term)) return false;

      if (from) {
        const d = new Date(p.purchase_date);
        if (d < from) return false;
      }
      if (to) {
        const d = new Date(p.purchase_date);
        if (d > to) return false;
      }

      if (f.status_id && String(p.status_id) !== String(f.status_id)) return false;
      if (f.category_id && String(p.category_id) !== String(f.category_id)) return false;
      if (f.supplier_id && String(p.supplier_id) !== String(f.supplier_id)) return false;

      if (f.cost_center_id) {
        if (String(p.cost_center_id || "") !== String(f.cost_center_id)) return false;
      }
      if (f.currency_id && String(p.currency_id) !== String(f.currency_id)) return false;

      if (f.credit_only && !Boolean(p.is_credit)) return false;
      if (f.with_document && !Boolean(p.has_document)) return false;
      if (f.recurring_only && !Boolean(p.is_recurring)) return false;
      if (f.with_notes && !String(p.notes || "").trim()) return false;

      return true;
    });
  }

  function sortPurchases(list) {
    const k = STATE.sortBy;

    const byDateAsc = (a, b) => new Date(a.purchase_date) - new Date(b.purchase_date);
    const byDateDesc = (a, b) => new Date(b.purchase_date) - new Date(a.purchase_date);
    const byAmtAsc = (a, b) => Number(a.total_amount || 0) - Number(b.total_amount || 0);
    const byAmtDesc = (a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0);

    const copy = list.slice();
    switch (k) {
      case "date_asc":
        copy.sort(byDateAsc);
        break;
      case "date_desc":
        copy.sort(byDateDesc);
        break;
      case "amount_asc":
        copy.sort(byAmtAsc);
        break;
      case "amount_desc":
        copy.sort(byAmtDesc);
        break;
      default:
        copy.sort(byDateDesc);
        break;
    }
    return copy;
  }

  function getPaged(list) {
    const size = Number(STATE.pageSize || 10);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / size));

    let page = Number(STATE.page || 1);
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const start = (page - 1) * size;
    const end = start + size;

    return { page, size, total, totalPages, items: list.slice(start, end) };
  }

  // -------- KPIs --------
  function renderKpis(filtered) {
    const total = filtered.length;
    const pending = filtered.filter((p) => !p.is_final).length;
    const approved = filtered.filter((p) => String(p.status?.status_label || "").toLowerCase().includes("aprob")).length;
    const rejected = filtered.filter((p) => String(p.status?.status_label || "").toLowerCase().includes("rech")).length;

    // Neto: sumatoria por moneda (presentación simple: CLP si hay filtro moneda, o “Mixto”)
    const currencyId = STATE.filters.currency_id;
    const currency = currencyId ? STATE.byId.currencies.get(Number(currencyId)) : null;

    const net = filtered.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const avg = total ? net / total : 0;

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiPending").textContent = fmtInt(pending);
    $("#kpiApproved").textContent = fmtInt(approved);
    $("#kpiRejected").textContent = fmtInt(rejected);

    $("#kpiNetAmount").textContent = currency ? fmtMoney(net, currency.currency_code) : `${fmtInt(net)} (mixto)`;
    $("#kpiAvgTicket").textContent = total ? `Ticket promedio: ${currency ? fmtMoney(avg, currency.currency_code) : `${fmtInt(avg)} (mixto)`}` : "—";
  }

  // -------- Table rendering --------
  function statusBadge(statusLabel) {
    const v = String(statusLabel || "").toLowerCase();
    if (v.includes("aprob")) return { cls: "ok", label: statusLabel };
    if (v.includes("rech")) return { cls: "bad", label: statusLabel };
    return { cls: "warn", label: statusLabel || "Pendiente" };
  }

  function renderTable() {
    const filtered = sortPurchases(getFiltered());
    renderKpis(filtered);

    const page = getPaged(filtered);
    STATE.page = page.page;

    $("#lblCount").textContent = String(page.total);
    $("#lblPageInfo").textContent = `Página ${page.page} de ${page.totalPages} • ${page.total} registro(s)`;

    const body = $("#tableBody");
    const empty = $("#emptyState");

    if (!page.items.length) {
      body.innerHTML = "";
      empty.classList.remove("hidden");
      $("#pagination").innerHTML = "";
      return;
    }
    empty.classList.add("hidden");

    body.innerHTML = page.items
      .map((p) => {
        const st = statusBadge(p.status?.status_label);
        const cur = p.currency?.currency_code || "CLP";
        const amount = fmtMoney(p.total_amount, cur);

        const supplier = p.supplier ? `${p.supplier.supplier_code} • ${p.supplier.supplier_name}` : "—";
        const cat = p.category ? `${p.category.category_code} • ${p.category.category_label}` : "—";
        const cc = p.cost_center ? `${p.cost_center.cost_center_code} • ${p.cost_center.cost_center_name}` : "—";

        const flags = [
          p.is_credit ? `<span class="badge info"><span class="dot"></span>Crédito</span>` : "",
          p.is_recurring ? `<span class="badge warn"><span class="dot"></span>Recurrente</span>` : "",
          p.has_document ? `<span class="badge ok"><span class="dot"></span>Doc</span>` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const isFinal = Boolean(p.is_final);

        // Reglas UI:
        // - Editar solo si NO finalizado
        // - Reversar visible en finalizados
        // - Aprobar/Rechazar con confirmación (en finalizados se muestran deshabilitados + reversa)
        const editBtn = !isFinal
          ? `<button class="icon-btn edit" data-act="edit" data-id="${p.purchase_id}" title="Editar">✎</button>`
          : "";

        const approveBtn = isFinal
          ? `<button class="icon-btn approve" disabled title="Aprobar (bloqueado)">✓</button>`
          : `<button class="icon-btn approve" data-act="approve" data-id="${p.purchase_id}" title="Aprobar">✓</button>`;

        const rejectBtn = isFinal
          ? `<button class="icon-btn reject" disabled title="Rechazar (bloqueado)">✕</button>`
          : `<button class="icon-btn reject" data-act="reject" data-id="${p.purchase_id}" title="Rechazar">✕</button>`;

        const reverseBtn = isFinal
          ? `<button class="icon-btn reverse" data-act="reverse" data-id="${p.purchase_id}" title="Reversar">⟲</button>`
          : "";

        const doc = String(p.document_number || "").trim() ? `<span class="mono">${escapeHtml(p.document_number)}</span>` : "—";

        return `
          <tr>
            <td>
              <div class="small">${escapeHtml(fmtDateShort(p.purchase_date))}</div>
              <div class="row-sub">${escapeHtml(fmtDateTime(p.purchase_date))}</div>
            </td>

            <td>
              <div class="mono">${escapeHtml(p.purchase_code || "—")}</div>
              ${p.notes ? `<div class="row-sub">🛈 ${escapeHtml(String(p.notes).slice(0, 60))}${String(p.notes).length > 60 ? "…" : ""}</div>` : ""}
            </td>

            <td>${doc}</td>
            <td>${escapeHtml(supplier)}</td>
            <td>${escapeHtml(cat)}</td>

            <td>
              <span class="badge ${st.cls}">
                <span class="dot"></span>
                ${escapeHtml(st.label)}
              </span>
            </td>

            <td>${escapeHtml(cc)}</td>
            <td><span class="mono">${escapeHtml(cur)}</span></td>

            <td class="right"><strong>${escapeHtml(amount)}</strong></td>

            <td>${flags ? `<div class="flags">${flags}</div>` : "—"}</td>

            <td class="center">
              <div class="actions">
                <button class="icon-btn view" data-act="view" data-id="${p.purchase_id}" title="Ver">👁</button>
                ${editBtn}
                ${approveBtn}
                ${rejectBtn}
                ${reverseBtn}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    renderPagination(page.totalPages);
  }

  function renderPagination(totalPages) {
    const el = $("#pagination");
    const p = Number(STATE.page || 1);

    const mk = (label, page, disabled, active) => {
      const cls = ["page-btn", active ? "active" : ""].join(" ").trim();
      return `<button class="${cls}" data-page="${page}" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
    };

    const parts = [];
    parts.push(mk("‹", p - 1, p <= 1, false));

    const win = 2;
    const start = Math.max(1, p - win);
    const end = Math.min(totalPages, p + win);

    if (start > 1) parts.push(mk("1", 1, false, p === 1));
    if (start > 2) parts.push(`<span class="muted small">…</span>`);

    for (let i = start; i <= end; i++) parts.push(mk(String(i), i, false, i === p));

    if (end < totalPages - 1) parts.push(`<span class="muted small">…</span>`);
    if (end < totalPages) parts.push(mk(String(totalPages), totalPages, false, p === totalPages));

    parts.push(mk("›", p + 1, p >= totalPages, false));

    el.innerHTML = parts.join("");
  }

  // -------- Modal utilities --------
  function openModal(id) {
    const m = $("#" + id);
    if (!m) return;
    m.classList.remove("hidden");
    m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    const m = $("#" + id);
    if (!m) return;
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function closeAnyOnBackdropClick(e) {
    const target = e.target;
    const closeId = target?.getAttribute?.("data-close");
    if (closeId) closeModal(closeId);
  }

  // -------- CRUD helpers --------
  function findPurchase(id) {
    return STATE.purchases.find((p) => Number(p.purchase_id) === Number(id)) || null;
  }

  function regenerateDerivedFields(p) {
    p.supplier = STATE.byId.suppliers.get(Number(p.supplier_id)) || null;
    p.category = STATE.byId.categories.get(Number(p.category_id)) || null;
    p.status = STATE.byId.statuses.get(Number(p.status_id)) || null;
    p.cost_center = STATE.byId.costCenters.get(Number(p.cost_center_id)) || null;
    p.payment_method = STATE.byId.paymentMethods.get(Number(p.payment_method_id)) || null;
    p.currency = STATE.byId.currencies.get(Number(p.currency_id)) || null;

    p.subtotal_amount = Number(p.subtotal_amount || 0);
    p.tax_amount = Number(p.tax_amount || 0);
    p.total_amount = Number(p.total_amount ?? (p.subtotal_amount + p.tax_amount));

    const statusLabel = p.status?.status_label || "";
    p.is_final = isFinalStatusLabel(statusLabel);

    p._search = [
      p.purchase_code,
      p.document_number,
      p.supplier?.supplier_name,
      p.supplier?.supplier_code,
      p.category?.category_label,
      p.status?.status_label,
      p.cost_center?.cost_center_name,
      p.payment_method?.method_label,
      p.currency?.currency_code,
      p.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function nextPurchaseId() {
    const max = STATE.purchases.reduce((m, p) => Math.max(m, Number(p.purchase_id || 0)), 0);
    return max + 1;
  }

  function autoCodeFor(dateIso) {
    const d = new Date(dateIso);
    const pad = (x) => String(x).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(2);
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const rnd = Math.floor(100 + Math.random() * 900);
    return `PUR-${yy}${mm}${dd}-${rnd}`;
  }

  // -------- View modal --------
  function openView(purchase_id) {
    const p = findPurchase(purchase_id);
    if (!p) return;

    $("#modalViewSubtitle").textContent = `${p.purchase_code || "—"} • ${fmtDateTime(p.purchase_date)}`;

    $("#viewCode").value = p.purchase_code || "—";
    $("#viewDate").value = fmtDateTime(p.purchase_date);
    $("#viewSupplier").value = p.supplier ? `${p.supplier.supplier_code} • ${p.supplier.supplier_name}` : "—";
    $("#viewCategory").value = p.category ? `${p.category.category_code} • ${p.category.category_label}` : "—";
    $("#viewStatus").value = p.status?.status_label || "—";
    $("#viewCostCenter").value = p.cost_center ? `${p.cost_center.cost_center_code} • ${p.cost_center.cost_center_name}` : "—";
    $("#viewCurrency").value = p.currency ? `${p.currency.currency_code} • ${p.currency.currency_name}` : "—";
    $("#viewPaymentMethod").value = p.payment_method?.method_label || "—";
    $("#viewDocument").value = p.document_number || "—";

    const cur = p.currency?.currency_code || "CLP";
    $("#viewSubtotal").value = fmtMoney(p.subtotal_amount, cur);
    $("#viewTax").value = fmtMoney(p.tax_amount, cur);
    $("#viewTotal").value = fmtMoney(p.total_amount, cur);

    $("#viewNotes").value = p.notes || "";
    $("#viewIsCredit").checked = Boolean(p.is_credit);
    $("#viewRecurring").checked = Boolean(p.is_recurring);
    $("#viewHasDocument").checked = Boolean(p.has_document);

    $("#viewMeta").textContent = `PK: ${p.purchase_id} • Creado: ${fmtDateTime(p.created_at)} • Actualizado: ${fmtDateTime(p.updated_at)}`;

    openModal("modalView");
  }

  // -------- Edit modal --------
  function openEdit(purchase_id, mode = "edit") {
    const initialStatusId = getInitialStatusId();

    let p = null;
    if (mode === "edit") {
      p = findPurchase(purchase_id);
      if (!p) return;
      if (p.is_final) return; // regla: no editar finalizados
    }

    STATE.editing = { purchase_id: purchase_id || null, mode };

    const isNew = mode === "new";
    $("#modalEditTitle").textContent = isNew ? "Nueva compra" : "Editar compra";
    $("#modalEditSubtitle").textContent = isNew ? "Crear registro en memoria" : `${p.purchase_code || "—"} • ${fmtDateTime(p.purchase_date)}`;

    $("#editErrors").classList.add("hidden");
    $("#editErrors").innerHTML = "";

    if (isNew) {
      const nowIso = new Date().toISOString();
      $("#editCode").value = autoCodeFor(nowIso);
      $("#editDate").value = toLocalDatetimeInputValue(nowIso);
      $("#editDocument").value = "";

      $("#editSubtotal").value = "0";
      $("#editTax").value = "0";
      $("#editTotal").value = "0";

      $("#editNotes").value = "";
      $("#editIsCredit").checked = false;
      $("#editRecurring").checked = false;
      $("#editHasDocument").checked = true;

      $("#editStatus").value = String(initialStatusId);
      $("#editMeta").textContent = `Nuevo • Estado inicial: ${WORKFLOW.initial_status_label}`;
    } else {
      $("#editCode").value = p.purchase_code || "";
      $("#editDate").value = toLocalDatetimeInputValue(p.purchase_date);
      $("#editSupplier").value = String(p.supplier_id || "");
      $("#editCategory").value = String(p.category_id || "");
      $("#editStatus").value = String(p.status_id || "");
      $("#editCostCenter").value = String(p.cost_center_id || "");
      $("#editCurrency").value = String(p.currency_id || "");
      $("#editPaymentMethod").value = String(p.payment_method_id || "");
      $("#editDocument").value = p.document_number || "";

      $("#editSubtotal").value = String(Number(p.subtotal_amount || 0));
      $("#editTax").value = String(Number(p.tax_amount || 0));
      $("#editTotal").value = String(Number(p.total_amount || 0));

      $("#editNotes").value = p.notes || "";
      $("#editIsCredit").checked = Boolean(p.is_credit);
      $("#editRecurring").checked = Boolean(p.is_recurring);
      $("#editHasDocument").checked = Boolean(p.has_document);

      $("#editMeta").textContent = `PK: ${p.purchase_id} • Creado: ${fmtDateTime(p.created_at)} • Actualizado: ${fmtDateTime(p.updated_at)}`;
    }

    openModal("modalEdit");
  }

  function validateEdit() {
    const errs = [];

    const code = String($("#editCode").value || "").trim();
    const dt = String($("#editDate").value || "").trim();
    const supplierId = String($("#editSupplier").value || "").trim();
    const categoryId = String($("#editCategory").value || "").trim();
    const statusId = String($("#editStatus").value || "").trim();
    const currencyId = String($("#editCurrency").value || "").trim();

    if (!code) errs.push("Código: requerido.");
    if (!dt) errs.push("Fecha: requerida.");
    if (!supplierId) errs.push("Proveedor: requerido.");
    if (!categoryId) errs.push("Tipo: requerido.");
    if (!statusId) errs.push("Estado: requerido.");
    if (!currencyId) errs.push("Moneda: requerida.");

    const subtotal = Number($("#editSubtotal").value || 0);
    const tax = Number($("#editTax").value || 0);
    const total = Number($("#editTotal").value || 0);

    if (!Number.isFinite(subtotal) || subtotal < 0) errs.push("Subtotal: debe ser numérico y ≥ 0.");
    if (!Number.isFinite(tax) || tax < 0) errs.push("Impuesto: debe ser numérico y ≥ 0.");
    if (!Number.isFinite(total) || total < 0) errs.push("Total: debe ser numérico y ≥ 0.");

    return errs;
  }

  function recalcTotalFromParts() {
    const subtotal = Number($("#editSubtotal").value || 0);
    const tax = Number($("#editTax").value || 0);
    const total = (Number.isFinite(subtotal) ? subtotal : 0) + (Number.isFinite(tax) ? tax : 0);
    $("#editTotal").value = String(total);
  }

  function saveEdit() {
    const errs = validateEdit();
    const box = $("#editErrors");
    if (errs.length) {
      box.classList.remove("hidden");
      box.innerHTML = `<strong>Validación:</strong><br/>${errs.map((e) => `• ${escapeHtml(e)}`).join("<br/>")}`;
      return;
    }

    const mode = STATE.editing.mode;
    const nowIso = new Date().toISOString();

    const payload = {
      purchase_code: String($("#editCode").value || "").trim(),
      purchase_date: new Date(String($("#editDate").value)).toISOString(),
      supplier_id: Number($("#editSupplier").value),
      category_id: Number($("#editCategory").value),
      status_id: Number($("#editStatus").value),
      cost_center_id: $("#editCostCenter").value ? Number($("#editCostCenter").value) : null,
      currency_id: Number($("#editCurrency").value),
      payment_method_id: $("#editPaymentMethod").value ? Number($("#editPaymentMethod").value) : null,
      document_number: String($("#editDocument").value || "").trim(),
      subtotal_amount: Number($("#editSubtotal").value || 0),
      tax_amount: Number($("#editTax").value || 0),
      total_amount: Number($("#editTotal").value || 0),
      notes: String($("#editNotes").value || "").trim(),
      is_credit: Boolean($("#editIsCredit").checked),
      is_recurring: Boolean($("#editRecurring").checked),
      has_document: Boolean($("#editHasDocument").checked),
    };

    if (mode === "new") {
      const id = nextPurchaseId();
      const row = {
        id,
        ...payload,
        previous_status_id: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      row.purchase_id = id;
      regenerateDerivedFields(row);
      STATE.purchases.unshift(row);
    } else {
      const p = findPurchase(STATE.editing.purchase_id);
      if (!p) return;
      if (p.is_final) return; // protección

      Object.assign(p, payload);
      p.updated_at = nowIso;
      regenerateDerivedFields(p);
    }

    closeModal("modalEdit");
    renderTable();
  }

  // -------- Approve/Reject/Reverse --------
  function findStatusIdByLabelIncludes(keyword) {
    const k = String(keyword || "").toLowerCase();
    const s = (STATE.db.purchase_statuses || []).find((x) => String(x.status_label || "").toLowerCase().includes(k));
    return s ? Number(s.id) : null;
  }

  function openConfirm(action, purchase_id) {
    const p = findPurchase(purchase_id);
    if (!p) return;
    if (p.is_final) return; // no corresponde

    STATE.confirm = { action, purchase_id };

    const isApprove = action === "approve";
    $("#modalConfirmSubtitle").textContent = `${p.purchase_code || "—"} • ${p.supplier?.supplier_name || "—"}`;
    $("#confirmIcon").textContent = isApprove ? "✓" : "✕";
    $("#confirmTitle").textContent = isApprove ? "Aprobar compra" : "Rechazar compra";
    $("#confirmText").textContent = isApprove
      ? "El registro quedará en estado final Aprobado."
      : "El registro quedará en estado final Rechazado.";
    $("#btnConfirmDo").className = isApprove ? "btn btn-primary" : "btn btn-danger";
    $("#btnConfirmDo").textContent = "Confirmar";

    openModal("modalConfirm");
  }

  function doConfirm() {
    const { action, purchase_id } = STATE.confirm;
    const p = findPurchase(purchase_id);
    if (!p) return;

    if (p.is_final) {
      closeModal("modalConfirm");
      return;
    }

    const approvedId = findStatusIdByLabelIncludes("aprob");
    const rejectedId = findStatusIdByLabelIncludes("rech");

    // guarda estado previo para reversa
    p.previous_status_id = Number(p.status_id);

    if (action === "approve" && approvedId) p.status_id = approvedId;
    if (action === "reject" && rejectedId) p.status_id = rejectedId;

    p.updated_at = new Date().toISOString();
    regenerateDerivedFields(p);

    closeModal("modalConfirm");
    renderTable();
  }

  function doReverse(purchase_id) {
    const p = findPurchase(purchase_id);
    if (!p) return;
    if (!p.is_final) return; // solo finalizados

    const fallback = getInitialStatusId();
    const prev = p.previous_status_id ? Number(p.previous_status_id) : fallback;

    p.status_id = prev;
    p.previous_status_id = null; // restaurado (se “consume” la reversa)
    p.updated_at = new Date().toISOString();

    regenerateDerivedFields(p);
    renderTable();
  }

  // -------- Events --------
  function bindEvents() {
    // modals close
    document.addEventListener("click", (e) => closeAnyOnBackdropClick(e));

    // reload
    $("#btnReload").addEventListener("click", async () => init(true));

    // new
    $("#btnNew").addEventListener("click", () => openEdit(null, "new"));

    // filters
    const applyFilters = debounce(() => {
      STATE.page = 1;
      renderTable();
    }, 180);

    $("#filterTerm").addEventListener("input", (e) => {
      STATE.filters.term = e.target.value || "";
      applyFilters();
    });

    $("#filterDateFrom").addEventListener("change", (e) => {
      STATE.filters.date_from = e.target.value || "";
      applyFilters();
    });
    $("#filterDateTo").addEventListener("change", (e) => {
      STATE.filters.date_to = e.target.value || "";
      applyFilters();
    });

    $("#filterStatus").addEventListener("change", (e) => {
      STATE.filters.status_id = e.target.value || "";
      applyFilters();
    });
    $("#filterCategory").addEventListener("change", (e) => {
      STATE.filters.category_id = e.target.value || "";
      applyFilters();
    });
    $("#filterSupplier").addEventListener("change", (e) => {
      STATE.filters.supplier_id = e.target.value || "";
      applyFilters();
    });
    $("#filterCostCenter").addEventListener("change", (e) => {
      STATE.filters.cost_center_id = e.target.value || "";
      applyFilters();
    });
    $("#filterCurrency").addEventListener("change", (e) => {
      STATE.filters.currency_id = e.target.value || "";
      applyFilters();
    });

    $("#toggleCreditOnly").addEventListener("change", (e) => {
      STATE.filters.credit_only = Boolean(e.target.checked);
      applyFilters();
    });
    $("#toggleWithDocument").addEventListener("change", (e) => {
      STATE.filters.with_document = Boolean(e.target.checked);
      applyFilters();
    });
    $("#toggleRecurring").addEventListener("change", (e) => {
      STATE.filters.recurring_only = Boolean(e.target.checked);
      applyFilters();
    });
    $("#toggleWithNotes").addEventListener("change", (e) => {
      STATE.filters.with_notes = Boolean(e.target.checked);
      applyFilters();
    });

    $("#btnClearFilters").addEventListener("click", () => {
      STATE.filters = {
        term: "",
        date_from: "",
        date_to: "",
        status_id: "",
        category_id: "",
        supplier_id: "",
        cost_center_id: "",
        currency_id: "",
        credit_only: false,
        with_document: false,
        recurring_only: false,
        with_notes: false,
      };

      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterCategory").value = "";
      $("#filterSupplier").value = "";
      $("#filterCostCenter").value = "";
      $("#filterCurrency").value = "";
      $("#toggleCreditOnly").checked = false;
      $("#toggleWithDocument").checked = false;
      $("#toggleRecurring").checked = false;
      $("#toggleWithNotes").checked = false;

      STATE.page = 1;
      renderTable();
    });

    // sort + page size
    $("#sortBy").addEventListener("change", (e) => {
      STATE.sortBy = e.target.value || "date_desc";
      STATE.page = 1;
      renderTable();
    });

    $("#pageSize").addEventListener("change", (e) => {
      STATE.pageSize = Number(e.target.value || 10);
      STATE.page = 1;
      renderTable();
    });

    // pagination
    $("#pagination").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      const page = Number(btn.getAttribute("data-page"));
      if (!Number.isFinite(page)) return;
      STATE.page = page;
      renderTable();
    });

    // table actions (delegation)
    $("#tableBody").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      const id = Number(btn.getAttribute("data-id"));

      switch (act) {
        case "view":
          openView(id);
          break;
        case "edit":
          openEdit(id, "edit");
          break;
        case "approve":
          openConfirm("approve", id);
          break;
        case "reject":
          openConfirm("reject", id);
          break;
        case "reverse":
          doReverse(id);
          break;
        default:
          break;
      }
    });

    // edit calc
    $("#editSubtotal").addEventListener("input", debounce(recalcTotalFromParts, 120));
    $("#editTax").addEventListener("input", debounce(recalcTotalFromParts, 120));

    // save
    $("#btnSave").addEventListener("click", () => saveEdit());

    // confirm
    $("#btnConfirmDo").addEventListener("click", () => doConfirm());

    // esc
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      ["modalConfirm", "modalView", "modalEdit"].forEach((id) => {
        const m = $("#" + id);
        if (m && !m.classList.contains("hidden")) closeModal(id);
      });
    });
  }

  // -------- Init --------
  async function init(forceReload = false) {
    try {
      if (forceReload || !STATE.db) {
        STATE.db = await loadData();
        buildMaps(STATE.db);
        STATE.purchases = normalizePurchases(STATE.db);
      }

      initFilterSelects();
      initEditSelects();
      renderTable();
    } catch (err) {
      console.error(err);
      alert(`Error inicializando módulo: ${err?.message || err}`);
    }
  }

  // bootstrap
  bindEvents();
  init(false);
})();
