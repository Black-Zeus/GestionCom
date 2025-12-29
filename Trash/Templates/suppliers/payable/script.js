// script.js
/* =========================================================
   GestionCom • suppliers/accounts-payable (vanilla)
   ---------------------------------------------------------
   Objeto normalizado principal: supplier_account
   Columna de fecha principal:  created_at
   Columna de monto principal:  open_balance_clp (derivado)
   PK:                          supplier_id

   Catálogos: supplier_statuses, supplier_categories,
              payment_terms, cost_centers, currencies, countries

   Workflow:
   - PENDING -> APPROVED | REJECTED
   - Reversa: restaura estado anterior (snapshot); fallback a PENDING
   Condición estado final:
   status_code ∈ { APPROVED, REJECTED }
   ========================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // Especificación funcional del submódulo (explicita)
  // ---------------------------------------------------------
  const SPEC = {
    module: "suppliers",
    submodule: "accounts-payable",
    route: "suppliers/accounts-payable",

    objeto_principal: "supplier_account",
    campo_fecha: "created_at",
    campo_monto: "open_balance_clp (derivado desde ap_invoices)",
    campo_pk: "supplier_id",

    catalogos: ["supplier_statuses", "supplier_categories", "payment_terms", "cost_centers", "currencies", "countries"],
    cond_final: "status_code ∈ {APPROVED, REJECTED}",
    estado_inicial: "PENDING",
  };

  // ---------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------
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

  const fmtInt = (n) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(n || 0));
  const fmtMoneyCLP = (n) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(n || 0));

  const fmtDateShort = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const fmtDateInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // ---------------------------------------------------------
  // Workflow
  // ---------------------------------------------------------
  const WORKFLOW = {
    initial_status_code: "PENDING",
    approved_status_code: "APPROVED",
    rejected_status_code: "REJECTED",
    final_status_codes: ["APPROVED", "REJECTED"],
  };

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const STATE = {
    db: null,

    byId: {
      statuses: new Map(),
      categories: new Map(),
      paymentTerms: new Map(),
      costCenters: new Map(),
      countries: new Map(),
    },

    suppliers: [],
    invoicesBySupplier: new Map(),

    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      category_id: "",
      cost_center_id: "",
      payment_term_id: "",
      country_code: "",
      critical_only: false,
      missing_kyc_only: false,
      open_balance_only: false,
      foreign_only: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    editing: { supplier_id: null, mode: "edit" }, // edit | new
    confirm: { action: null, supplier_id: null }, // APPROVE | REJECT
  };

  // ---------------------------------------------------------
  // Lookup + rules
  // ---------------------------------------------------------
  function mapById(arr, key = "id") {
    const m = new Map();
    (arr || []).forEach((x) => m.set(Number(x[key]), x));
    return m;
  }

  function getStatusById(id) {
    return STATE.byId.statuses.get(Number(id)) || null;
  }

  function getStatusByCode(code) {
    const list = STATE.db?.supplier_statuses || [];
    return list.find((s) => String(s.status_code) === String(code)) || null;
  }

  function statusCodeOf(s) {
    return getStatusById(s.status_id)?.status_code || "";
  }

  function isFinal(s) {
    return WORKFLOW.final_status_codes.includes(statusCodeOf(s));
  }

  function canEdit(s) {
    // Regla consistente con finanzas: editar solo mientras no se ha finalizado.
    // Adicionalmente, restringimos edición solo en estado inicial para evitar drift.
    return statusCodeOf(s) === WORKFLOW.initial_status_code;
  }

  function canApproveReject(s) {
    return statusCodeOf(s) === WORKFLOW.initial_status_code;
  }

  function canReverse(s) {
    return statusCodeOf(s) !== WORKFLOW.initial_status_code;
  }

  function chipClassForStatus(code) {
    switch (code) {
      case "PENDING":
        return "warn";
      case "APPROVED":
        return "ok";
      case "REJECTED":
        return "bad";
      default:
        return "";
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ---------------------------------------------------------
  // Normalización
  // ---------------------------------------------------------
  function buildMaps(db) {
    STATE.byId.statuses = mapById(db.supplier_statuses);
    STATE.byId.categories = mapById(db.supplier_categories);
    STATE.byId.paymentTerms = mapById(db.payment_terms);
    STATE.byId.costCenters = mapById(db.cost_centers);
    // countries es por code, no por id
    const cm = new Map();
    (db.countries || []).forEach((c) => cm.set(String(c.country_code), c));
    STATE.byId.countries = cm;
  }

  function buildInvoicesIndex(db) {
    const m = new Map();
    (db.ap_invoices || []).forEach((inv) => {
      const sid = Number(inv.supplier_id);
      if (!m.has(sid)) m.set(sid, []);
      m.get(sid).push(inv);
    });
    // orden para vista
    m.forEach((list) => list.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)));
    STATE.invoicesBySupplier = m;
  }

  function computeOpenAmountsForSupplier(supplier_id) {
    const list = STATE.invoicesBySupplier.get(Number(supplier_id)) || [];
    let openCount = 0;
    let openBalance = 0;

    const rows = list.map((inv) => {
      const total = Number(inv.amount_total_clp || 0);
      const paid = Number(inv.amount_paid_clp || 0);
      const pending = Math.max(0, total - paid);
      const st = String(inv.invoice_status || "OPEN");

      const isOpen = st === "OPEN" || st === "PARTIAL";
      if (isOpen && pending > 0) {
        openCount += 1;
        openBalance += pending;
      }

      return { ...inv, _total: total, _paid: paid, _pending: pending, _isOpen: isOpen };
    });

    return { open_invoices_count: openCount, open_balance_clp: openBalance, invoice_rows: rows };
  }

  function normalizeSuppliers(db) {
    const suppliers = (db.suppliers || []).map((s) => {
      const st = getStatusById(s.status_id);
      const cat = STATE.byId.categories.get(Number(s.category_id)) || null;
      const pt = STATE.byId.paymentTerms.get(Number(s.payment_term_id)) || null;
      const cc = STATE.byId.costCenters.get(Number(s.default_cost_center_id)) || null;
      const country = STATE.byId.countries.get(String(s.country_code || "")) || null;

      const calc = computeOpenAmountsForSupplier(s.id);

      const tags = Array.isArray(s.tags) ? s.tags : [];
      const search = [
        s.supplier_code,
        s.legal_name,
        s.trade_name,
        s.rut,
        s.email,
        s.phone,
        s.city,
        country?.country_name,
        st?.status_label,
        st?.status_code,
        cat?.category_name,
        pt?.term_label,
        cc?.cost_center_code,
        cc?.cost_center_name,
        s.notes,
        tags.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return {
        ...s,
        supplier_id: Number(s.id),
        status: st || null,
        category: cat,
        payment_term: pt,
        cost_center: cc,
        country,

        open_invoices_count: calc.open_invoices_count,
        open_balance_clp: calc.open_balance_clp,
        invoices: calc.invoice_rows,

        _history: Array.isArray(s._history) ? s._history : [],
        _search: search,
      };
    });

    suppliers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return suppliers;
  }

  function reComputeDerived(s) {
    const st = getStatusById(s.status_id);
    const cat = STATE.byId.categories.get(Number(s.category_id)) || null;
    const pt = STATE.byId.paymentTerms.get(Number(s.payment_term_id)) || null;
    const cc = STATE.byId.costCenters.get(Number(s.default_cost_center_id)) || null;
    const country = STATE.byId.countries.get(String(s.country_code || "")) || null;

    const calc = computeOpenAmountsForSupplier(s.id || s.supplier_id);

    const tags = Array.isArray(s.tags) ? s.tags : [];
    const search = [
      s.supplier_code,
      s.legal_name,
      s.trade_name,
      s.rut,
      s.email,
      s.phone,
      s.city,
      country?.country_name,
      st?.status_label,
      st?.status_code,
      cat?.category_name,
      pt?.term_label,
      cc?.cost_center_code,
      cc?.cost_center_name,
      s.notes,
      tags.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      ...s,
      supplier_id: Number(s.id ?? s.supplier_id),
      status: st || null,
      category: cat,
      payment_term: pt,
      cost_center: cc,
      country,
      open_invoices_count: calc.open_invoices_count,
      open_balance_clp: calc.open_balance_clp,
      invoices: calc.invoice_rows,
      _search: search,
    };
  }

  // ---------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------
  async function loadData() {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar data.json (HTTP ${res.status})`);
    return res.json();
  }

  // ---------------------------------------------------------
  // Select fillers
  // ---------------------------------------------------------
  function fillSelect(selectEl, items, { valueKey = "id", labelKey = "label", includeEmpty = false, emptyLabel = "Todos" } = {}) {
    if (!selectEl) return;
    const current = selectEl.value;
    const opts = [];
    if (includeEmpty) opts.push(`<option value="">${escapeHtml(emptyLabel)}</option>`);
    (items || []).forEach((it) => {
      const v = String(it[valueKey]);
      const lbl = String(it[labelKey] ?? it[valueKey]);
      opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(lbl)}</option>`);
    });
    selectEl.innerHTML = opts.join("");
    if (current !== undefined && current !== null && current !== "") selectEl.value = current;
  }

  function initFilterSelects() {
    const statuses = (STATE.db.supplier_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const cats = (STATE.db.supplier_categories || []).map((c) => ({ id: c.id, label: c.category_name }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const pts = (STATE.db.payment_terms || []).map((t) => ({ id: t.id, label: t.term_label }));
    const countries = (STATE.db.countries || []).map((c) => ({ id: c.country_code, label: `${c.country_code} • ${c.country_name}` }));

    fillSelect($("#filterStatus"), statuses, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCategory"), cats, { includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterCostCenter"), ccs, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterPaymentTerm"), pts, { includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterCountry"), countries, { includeEmpty: true, emptyLabel: "Todos" });
  }

  function initModalSelects(prefix) {
    const statusSel = $(`#${prefix}Status`);
    const catSel = $(`#${prefix}Category`);
    const ptSel = $(`#${prefix}PaymentTerm`);
    const ccSel = $(`#${prefix}CostCenter`);
    const curSel = $(`#${prefix}Currency`);
    const countrySel = $(`#${prefix}Country`);

    const statuses = (STATE.db.supplier_statuses || []).map((s) => ({ id: s.id, label: `${s.status_code} • ${s.status_label}` }));
    const cats = (STATE.db.supplier_categories || []).map((c) => ({ id: c.id, label: c.category_name }));
    const pts = (STATE.db.payment_terms || []).map((t) => ({ id: t.id, label: t.term_label }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const curs = (STATE.db.currencies || []).map((c) => ({ id: c.currency_code, label: `${c.currency_code} • ${c.currency_name}` }));
    const countries = (STATE.db.countries || []).map((c) => ({ id: c.country_code, label: `${c.country_code} • ${c.country_name}` }));

    fillSelect(statusSel, statuses, { includeEmpty: false });
    fillSelect(catSel, cats, { includeEmpty: false });
    fillSelect(ptSel, pts, { includeEmpty: false });
    fillSelect(ccSel, [{ id: "", label: "—" }, ...ccs], { includeEmpty: false });
    fillSelect(curSel, curs, { includeEmpty: false });
    fillSelect(countrySel, countries, { includeEmpty: false });

    // Estado bloqueado por UI (derivado del workflow)
    if (prefix === "edit") statusSel?.setAttribute("disabled", "disabled");
    if (prefix === "view") statusSel?.removeAttribute("disabled"); // readonly por CSS
  }

  // ---------------------------------------------------------
  // Filtering + sorting + paging
  // ---------------------------------------------------------
  function getFiltered() {
    const f = STATE.filters;
    const term = String(f.term || "").trim().toLowerCase();
    const from = f.date_from ? new Date(f.date_from + "T00:00:00") : null;
    const to = f.date_to ? new Date(f.date_to + "T23:59:59") : null;

    return STATE.suppliers
      .map((s) => reComputeDerived(s))
      .filter((s) => {
        if (term && !s._search.includes(term)) return false;

        if (from) {
          const d = new Date(s.created_at);
          if (d < from) return false;
        }
        if (to) {
          const d = new Date(s.created_at);
          if (d > to) return false;
        }

        if (f.status_id && String(s.status_id) !== String(f.status_id)) return false;
        if (f.category_id && String(s.category_id) !== String(f.category_id)) return false;
        if (f.cost_center_id && String(s.default_cost_center_id || "") !== String(f.cost_center_id)) return false;
        if (f.payment_term_id && String(s.payment_term_id) !== String(f.payment_term_id)) return false;
        if (f.country_code && String(s.country_code) !== String(f.country_code)) return false;

        if (f.critical_only && !s.is_critical) return false;
        if (f.missing_kyc_only && Boolean(s.kyc_complete) !== false) return false;

        if (f.open_balance_only && !(Number(s.open_balance_clp || 0) > 0)) return false;

        if (f.foreign_only) {
          const isForeign = String(s.country_code || "") !== "CL";
          if (!isForeign) return false;
        }

        return true;
      });
  }

  function sortSuppliers(list) {
    const s = STATE.sortBy;
    const copy = list.slice();

    const getDate = (x) => new Date(x.created_at).getTime();
    const getName = (x) => String(x.trade_name || x.legal_name || "").toLowerCase();
    const getOpen = (x) => Number(x.open_balance_clp || 0);
    const getLimit = (x) => Number(x.credit_limit_clp || 0);

    switch (s) {
      case "date_asc":
        copy.sort((a, b) => getDate(a) - getDate(b));
        break;
      case "date_desc":
        copy.sort((a, b) => getDate(b) - getDate(a));
        break;
      case "name_asc":
        copy.sort((a, b) => getName(a).localeCompare(getName(b)));
        break;
      case "name_desc":
        copy.sort((a, b) => getName(b).localeCompare(getName(a)));
        break;
      case "open_asc":
        copy.sort((a, b) => getOpen(a) - getOpen(b));
        break;
      case "open_desc":
        copy.sort((a, b) => getOpen(b) - getOpen(a));
        break;
      case "limit_asc":
        copy.sort((a, b) => getLimit(a) - getLimit(b));
        break;
      case "limit_desc":
        copy.sort((a, b) => getLimit(b) - getLimit(a));
        break;
      default:
        copy.sort((a, b) => getDate(b) - getDate(a));
        break;
    }

    return copy;
  }

  function paginate(list) {
    const total = list.length;
    const size = Number(STATE.pageSize || 10);
    const pages = Math.max(1, Math.ceil(total / size));
    const page = Math.min(Math.max(1, Number(STATE.page || 1)), pages);

    const start = (page - 1) * size;
    const end = start + size;

    return {
      page,
      pages,
      total,
      size,
      slice: list.slice(start, end),
    };
  }

  // ---------------------------------------------------------
  // Render KPIs
  // ---------------------------------------------------------
  function renderKPIs(list) {
    const total = list.length;

    const byCode = (code) => list.filter((s) => statusCodeOf(s) === code).length;
    const pending = byCode("PENDING");
    const approved = byCode("APPROVED");
    const rejected = byCode("REJECTED");

    const netOpen = list.reduce((sum, s) => sum + Number(s.open_balance_clp || 0), 0);
    const openSuppliers = list.filter((s) => Number(s.open_balance_clp || 0) > 0).length;

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiPending").textContent = fmtInt(pending);
    $("#kpiApproved").textContent = fmtInt(approved);
    $("#kpiRejected").textContent = fmtInt(rejected);
    $("#kpiNetOpen").textContent = fmtMoneyCLP(netOpen);

    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiNetOpenSub").textContent = `${fmtInt(openSuppliers)} proveedor(es) con saldo pendiente`;
  }

  // ---------------------------------------------------------
  // Render Table + pagination
  // ---------------------------------------------------------
  function renderTable() {
    const filtered = getFiltered();
    const sorted = sortSuppliers(filtered);
    const pg = paginate(sorted);

    STATE.page = pg.page;

    $("#lblCount").textContent = fmtInt(pg.total);

    const tbody = $("#tableBody");
    const empty = $("#emptyState");

    if (pg.total === 0) {
      tbody.innerHTML = "";
      empty.classList.remove("hidden");
      $("#lblPageInfo").textContent = "—";
      $("#pagination").innerHTML = "";
      renderKPIs(filtered);
      return;
    }

    empty.classList.add("hidden");
    renderKPIs(filtered);

    tbody.innerHTML = pg.slice
      .map((s) => {
        const code = statusCodeOf(s);
        const st = getStatusById(s.status_id);
        const chipCls = chipClassForStatus(code);

        const name = s.trade_name || s.legal_name || "—";
        const cat = STATE.byId.categories.get(Number(s.category_id));
        const pt = STATE.byId.paymentTerms.get(Number(s.payment_term_id));
        const cc = STATE.byId.costCenters.get(Number(s.default_cost_center_id || 0));
        const country = STATE.byId.countries.get(String(s.country_code || ""));

        const flags = [
          s.is_critical ? `<span class="chip bad" title="Proveedor crítico">CRIT</span>` : "",
          s.kyc_complete ? `<span class="chip ok" title="KYC completo">KYC</span>` : `<span class="chip warn" title="Documentación/KYC pendiente">DOC</span>`,
        ].filter(Boolean).join(" ");

        const open = Number(s.open_balance_clp || 0);
        const openChip = open > 0 ? `<span class="chip warn" title="Saldo abierto">${fmtMoneyCLP(open)}</span>` : `<span class="chip ok" title="Sin saldo abierto">OK</span>`;

        const actionsHtml = renderRowActions(s);

        return `
          <tr>
            <td>
              <div class="row-main">${escapeHtml(fmtDateShort(s.created_at))}</div>
              <div class="row-sub muted mono">${escapeHtml(s.supplier_code || "—")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(name)}</div>
              <div class="row-sub muted">${flags} ${openChip}</div>
            </td>
            <td>
              <span class="chip ${escapeHtml(chipCls)}" title="${escapeHtml(st?.status_code || "")}">
                ${escapeHtml(st?.status_label || "—")}
              </span>
              <div class="row-sub muted">${escapeHtml(country ? `${country.country_code} • ${country.country_name}` : "—")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(cat?.category_name || "—")}</div>
              <div class="row-sub muted">${escapeHtml(s.city || "—")}</div>
            </td>
            <td class="mono">
              <div class="row-main">${escapeHtml(s.rut || "—")}</div>
              <div class="row-sub muted">${escapeHtml(s.tax_id_alt || "")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(s.email || "—")}</div>
              <div class="row-sub muted">${escapeHtml(s.phone || "—")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(pt?.term_label || "—")}</div>
              <div class="row-sub muted">${escapeHtml(pt?.term_days != null ? `${pt.term_days} días` : "")}</div>
            </td>
            <td class="right">
              <div class="row-main">${escapeHtml(fmtMoneyCLP(open))}</div>
              <div class="row-sub muted">${escapeHtml(fmtInt(s.open_invoices_count || 0))} factura(s) abierta(s)</div>
            </td>
            <td class="right">
              <div class="row-main">${escapeHtml(fmtMoneyCLP(Number(s.credit_limit_clp || 0)))}</div>
              <div class="row-sub muted">${escapeHtml(s.currency_code || "CLP")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(cc ? `${cc.cost_center_code}` : "—")}</div>
              <div class="row-sub muted">${escapeHtml(cc?.cost_center_name || "—")}</div>
            </td>
            <td class="center">
              <div class="actions">
                ${actionsHtml}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    $("#lblPageInfo").textContent = `Página ${pg.page} de ${pg.pages} • ${fmtInt(pg.total)} proveedor(es)`;
    renderPagination(pg.page, pg.pages);
  }

  function renderRowActions(s) {
    const id = s.supplier_id;

    const btnView = `<button class="icon-btn" data-action="view" data-id="${id}" title="Ver">👁</button>`;

    const btnEdit = canEdit(s)
      ? `<button class="icon-btn" data-action="edit" data-id="${id}" title="Editar">✎</button>`
      : ``;

    // Aprobar / Rechazar (solo en estado inicial)
    const btnApprove = canApproveReject(s)
      ? `<button class="icon-btn" data-action="approve" data-id="${id}" title="Aprobar">✓</button>`
      : ``;

    const btnReject = canApproveReject(s)
      ? `<button class="icon-btn" data-action="reject" data-id="${id}" title="Rechazar">✕</button>`
      : ``;

    const btnReverse = canReverse(s)
      ? `<button class="icon-btn" data-action="reverse" data-id="${id}" title="Reversar (⟲)">⟲</button>`
      : ``;

    // Regla: en finalizados, ocultar editar y ocultar aprobar/rechazar; mostrar reversa + ver
    const code = statusCodeOf(s);
    if (WORKFLOW.final_status_codes.includes(code)) {
      return `${btnView}${btnReverse}`;
    }

    // Inicial: ver + editar + aprobar + rechazar
    return `${btnView}${btnEdit}${btnApprove}${btnReject}`;
  }

  function renderPagination(page, pages) {
    const host = $("#pagination");
    if (!host) return;

    const mk = (p, label, extra = "") =>
      `<button class="page-btn ${extra}" data-page="${p}" ${extra.includes("is-disabled") ? "disabled" : ""}>${escapeHtml(label)}</button>`;

    const btns = [];
    btns.push(mk(1, "«", page === 1 ? "is-disabled" : ""));
    btns.push(mk(page - 1, "‹", page === 1 ? "is-disabled" : ""));

    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(pages, start + windowSize - 1);

    for (let p = start; p <= end; p++) btns.push(mk(p, String(p), p === page ? "is-active" : ""));

    btns.push(mk(page + 1, "›", page === pages ? "is-disabled" : ""));
    btns.push(mk(pages, "»", page === pages ? "is-disabled" : ""));

    host.innerHTML = btns.join("");
  }

  // ---------------------------------------------------------
  // Modals
  // ---------------------------------------------------------
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");

    // Si no queda ningún modal abierto, restaurar scroll
    const openAny = $$(".modal").some((m) => !m.classList.contains("hidden"));
    if (!openAny) document.body.style.overflow = "";
  }

  function wireModalClose() {
    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;
      const closeId = t.getAttribute("data-close");
      if (closeId) closeModal(closeId);
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      // Cierra el último modal visible
      const modals = $$(".modal").filter((m) => !m.classList.contains("hidden"));
      if (modals.length) {
        const last = modals[modals.length - 1];
        closeModal(last.id);
      }
    });
  }

  // ---------------------------------------------------------
  // Edit/View forms
  // ---------------------------------------------------------
  function getSupplierById(id) {
    return STATE.suppliers.find((s) => Number(s.id ?? s.supplier_id) === Number(id)) || null;
  }

  function setEditFootHint(s) {
    const code = statusCodeOf(s);
    const hint = $("#editFootHint");
    if (!hint) return;

    if (code === WORKFLOW.initial_status_code) {
      hint.textContent = "Editable. Aprobación/Rechazo se ejecuta desde la tabla (acciones por fila).";
      return;
    }
    if (WORKFLOW.final_status_codes.includes(code)) {
      hint.textContent = "Proveedor finalizado. Edición bloqueada por regla. Use Reversar si corresponde.";
      return;
    }
    hint.textContent = "—";
  }

  function fillInvoiceTable(tbodyId, supplier) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rows = (supplier.invoices || []).slice();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Sin facturas demo asociadas.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((inv) => {
        const pending = Number(inv._pending ?? Math.max(0, Number(inv.amount_total_clp || 0) - Number(inv.amount_paid_clp || 0)));
        const st = String(inv.invoice_status || "OPEN");
        const chip =
          st === "PAID" ? `<span class="chip ok">Pagada</span>` :
          st === "OPEN" ? `<span class="chip warn">Abierta</span>` :
          st === "PARTIAL" ? `<span class="chip info">Parcial</span>` :
          `<span class="chip">—</span>`;

        return `
          <tr>
            <td class="mono">
              <div class="row-main">${escapeHtml(inv.invoice_number || "—")}</div>
              <div class="row-sub muted">${escapeHtml(inv.invoice_type || "Factura")}</div>
            </td>
            <td>${escapeHtml(fmtDateShort(inv.invoice_date))}</td>
            <td>${escapeHtml(fmtDateShort(inv.due_date))}</td>
            <td class="right">${escapeHtml(fmtMoneyCLP(Number(inv.amount_total_clp || 0)))}</td>
            <td class="right">${escapeHtml(fmtMoneyCLP(Number(inv.amount_paid_clp || 0)))}</td>
            <td class="right">${escapeHtml(fmtMoneyCLP(pending))}</td>
            <td>${chip}</td>
          </tr>
        `;
      })
      .join("");
  }

  function fillEditModal(supplier, mode) {
    const s = supplier;

    $("#modalEditTitle").textContent = mode === "new" ? "Nuevo proveedor" : "Editar proveedor";
    $("#modalEditSub").textContent = `${s.supplier_code || "—"} • ${s.trade_name || s.legal_name || "—"}`;

    $("#editSupplierCode").value = s.supplier_code || "";
    $("#editCreatedAt").value = fmtDateInput(s.created_at);

    $("#editStatus").value = String(s.status_id ?? "");
    $("#editCategory").value = String(s.category_id ?? "");
    $("#editLegalName").value = s.legal_name || "";
    $("#editTradeName").value = s.trade_name || "";
    $("#editRut").value = s.rut || "";
    $("#editCountry").value = s.country_code || "CL";
    $("#editCity").value = s.city || "";
    $("#editCurrency").value = s.currency_code || "CLP";
    $("#editPaymentTerm").value = String(s.payment_term_id ?? "");
    $("#editCostCenter").value = String(s.default_cost_center_id ?? "");
    $("#editEmail").value = s.email || "";
    $("#editPhone").value = s.phone || "";
    $("#editCreditLimit").value = String(Number(s.credit_limit_clp || 0));

    $("#editIsCritical").checked = Boolean(s.is_critical);
    $("#editKycComplete").checked = Boolean(s.kyc_complete);

    $("#editTags").value = Array.isArray(s.tags) ? s.tags.join(", ") : "";
    $("#editNotes").value = s.notes || "";

    const calc = computeOpenAmountsForSupplier(s.id ?? s.supplier_id);
    $("#editOpenInvoicesChip").textContent = `${fmtInt(calc.open_invoices_count)} factura(s) abierta(s)`;
    $("#editOpenBalanceChip").textContent = `Saldo abierto: ${fmtMoneyCLP(calc.open_balance_clp)}`;

    fillInvoiceTable("editInvoicesBody", { ...s, invoices: calc.invoice_rows });

    setEditFootHint(s);

    // Regla: si no se puede editar (no inicial), deshabilitar guardado (y campos)
    const allow = mode === "new" ? true : canEdit(s);
    $("#btnSave").disabled = !allow;

    // Para evitar “apagado” excesivo, solo bloqueamos interacción cuando no corresponde.
    const form = $("#modalEdit .form-grid");
    if (form) {
      form.style.opacity = "1";
      $$("#modalEdit .form-grid input, #modalEdit .form-grid select, #modalEdit .form-grid textarea").forEach((el) => {
        if (el.id === "editSupplierCode") return;
        // status ya está disabled
        el.disabled = !allow && el.id !== "editStatus";
      });
      // toggles
      $("#editIsCritical").disabled = !allow;
      $("#editKycComplete").disabled = !allow;
    }
  }

  function fillViewModal(supplier) {
    const s = supplier;

    $("#modalViewTitle").textContent = "Ver proveedor";
    $("#modalViewSub").textContent = `${s.supplier_code || "—"} • ${s.trade_name || s.legal_name || "—"}`;

    $("#viewSupplierCode").value = s.supplier_code || "";
    $("#viewCreatedAt").value = fmtDateInput(s.created_at);

    $("#viewStatus").value = String(s.status_id ?? "");
    $("#viewCategory").value = String(s.category_id ?? "");
    $("#viewLegalName").value = s.legal_name || "";
    $("#viewTradeName").value = s.trade_name || "";
    $("#viewRut").value = s.rut || "";
    $("#viewCountry").value = s.country_code || "CL";
    $("#viewCity").value = s.city || "";
    $("#viewCurrency").value = s.currency_code || "CLP";
    $("#viewPaymentTerm").value = String(s.payment_term_id ?? "");
    $("#viewCostCenter").value = String(s.default_cost_center_id ?? "");
    $("#viewEmail").value = s.email || "";
    $("#viewPhone").value = s.phone || "";
    $("#viewCreditLimit").value = String(Number(s.credit_limit_clp || 0));

    $("#viewIsCritical").checked = Boolean(s.is_critical);
    $("#viewKycComplete").checked = Boolean(s.kyc_complete);

    $("#viewTags").value = Array.isArray(s.tags) ? s.tags.join(", ") : "";
    $("#viewNotes").value = s.notes || "";

    const calc = computeOpenAmountsForSupplier(s.id ?? s.supplier_id);
    $("#viewOpenInvoicesChip").textContent = `${fmtInt(calc.open_invoices_count)} factura(s) abierta(s)`;
    $("#viewOpenBalanceChip").textContent = `Saldo abierto: ${fmtMoneyCLP(calc.open_balance_clp)}`;

    fillInvoiceTable("viewInvoicesBody", { ...s, invoices: calc.invoice_rows });

    // bloquea interacción sin “apagar” (CSS .readonly)
    $("#viewIsCritical").setAttribute("tabindex", "-1");
    $("#viewKycComplete").setAttribute("tabindex", "-1");
  }

  // ---------------------------------------------------------
  // Workflow actions
  // ---------------------------------------------------------
  function pushHistorySnapshot(s, meta = {}) {
    const prev = {
      at: nowIso(),
      prev_status_id: Number(s.status_id),
      prev_payload: {
        status_id: Number(s.status_id),
      },
      meta,
    };
    s._history = Array.isArray(s._history) ? s._history : [];
    s._history.push(prev);
  }

  function applyApproveReject(s, action, note) {
    if (!canApproveReject(s)) return;

    const targetCode = action === "APPROVE" ? WORKFLOW.approved_status_code : WORKFLOW.rejected_status_code;
    const target = getStatusByCode(targetCode);
    if (!target) return;

    pushHistorySnapshot(s, { action, note: String(note || "").trim() });

    s.status_id = Number(target.id);
    // trazabilidad simple (no persistente): append en notes si corresponde
    if (note && String(note).trim()) {
      const stamp = `[${action} ${fmtDateShort(nowIso())}] ${String(note).trim()}`;
      s.notes = (s.notes ? s.notes + "\n" : "") + stamp;
    }
  }

  function reverseToPrevious(s) {
    if (!canReverse(s)) return;

    const hist = Array.isArray(s._history) ? s._history : [];
    const last = hist.pop();

    if (last && last.prev_status_id != null) {
      s.status_id = Number(last.prev_status_id);
      return;
    }

    // fallback al estado inicial
    const initial = getStatusByCode(WORKFLOW.initial_status_code);
    if (initial) s.status_id = Number(initial.id);
  }

  // ---------------------------------------------------------
  // Confirm modal
  // ---------------------------------------------------------
  function openConfirm(action, supplier_id) {
    STATE.confirm.action = action;
    STATE.confirm.supplier_id = supplier_id;

    const s = getSupplierById(supplier_id);
    if (!s) return;

    const name = s.trade_name || s.legal_name || s.supplier_code || `#${supplier_id}`;
    const icon = $("#confirmIcon");
    const title = $("#confirmTitle");
    const desc = $("#confirmDesc");
    const foot = $("#confirmFootHint");
    const btn = $("#btnConfirm");

    $("#confirmReason").value = "";

    if (action === "APPROVE") {
      $("#modalConfirmTitle").textContent = "Confirmar aprobación";
      $("#modalConfirmSub").textContent = `Proveedor: ${name}`;
      icon.textContent = "✓";
      title.textContent = "Aprobar proveedor";
      desc.textContent = "La acción dejará bloqueados Aprobar/Rechazar y habilitará Reversar (⟲).";
      foot.textContent = "Aprobación final (demo). Reversable mediante ⟲.";
      btn.classList.remove("btn-danger");
      btn.classList.add("btn-primary");
      btn.textContent = "Aprobar";
    } else {
      $("#modalConfirmTitle").textContent = "Confirmar rechazo";
      $("#modalConfirmSub").textContent = `Proveedor: ${name}`;
      icon.textContent = "✕";
      title.textContent = "Rechazar proveedor";
      desc.textContent = "La acción dejará bloqueados Aprobar/Rechazar y habilitará Reversar (⟲).";
      foot.textContent = "Rechazo final (demo). Reversable mediante ⟲.";
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-danger");
      btn.textContent = "Rechazar";
    }

    openModal("modalConfirm");
  }

  function onConfirm() {
    const { action, supplier_id } = STATE.confirm;
    const s = getSupplierById(supplier_id);
    if (!s) return;

    const note = $("#confirmReason").value;
    applyApproveReject(s, action, note);

    closeModal("modalConfirm");
    renderTable();
  }

  // ---------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------
  function nextSupplierId() {
    const ids = STATE.suppliers.map((s) => Number(s.id ?? s.supplier_id));
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  function nextSupplierCode() {
    const n = nextSupplierId();
    return `SUP-${String(n).padStart(5, "0")}`;
  }

  function makeNewSupplierDraft() {
    const initial = getStatusByCode(WORKFLOW.initial_status_code);
    const defaultCat = STATE.db?.supplier_categories?.[0]?.id ?? 1;
    const defaultTerm = STATE.db?.payment_terms?.[0]?.id ?? 1;
    const defaultCC = STATE.db?.cost_centers?.[0]?.id ?? "";

    return {
      id: nextSupplierId(),
      supplier_code: nextSupplierCode(),
      created_at: nowIso(),
      status_id: Number(initial?.id ?? 1),
      category_id: Number(defaultCat),
      legal_name: "",
      trade_name: "",
      rut: "",
      tax_id_alt: "",
      country_code: "CL",
      city: "",
      email: "",
      phone: "",
      payment_term_id: Number(defaultTerm),
      default_cost_center_id: defaultCC ? Number(defaultCC) : null,
      currency_code: "CLP",
      credit_limit_clp: 0,
      is_critical: false,
      kyc_complete: false,
      tags: [],
      notes: "",
      _history: [],
    };
  }

  function validateSupplierPayload(p) {
    const errs = [];

    const legal = String(p.legal_name || "").trim();
    const trade = String(p.trade_name || "").trim();
    if (!legal && !trade) errs.push("Debe informar Razón social o Nombre de fantasía.");

    const rut = String(p.rut || "").trim();
    if (rut && rut.length < 8) errs.push("RUT inválido (demo: formato libre, pero longitud mínima recomendada).");

    const email = String(p.email || "").trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.push("Email inválido.");

    const credit = Number(p.credit_limit_clp || 0);
    if (Number.isNaN(credit) || credit < 0) errs.push("Límite de crédito debe ser >= 0.");

    return errs;
  }

  function readEditFormIntoSupplier(s) {
    s.created_at = ($("#editCreatedAt").value ? $("#editCreatedAt").value + "T00:00:00Z" : s.created_at);
    s.category_id = Number($("#editCategory").value || s.category_id);
    s.legal_name = $("#editLegalName").value.trim();
    s.trade_name = $("#editTradeName").value.trim();
    s.rut = $("#editRut").value.trim();
    s.country_code = $("#editCountry").value;
    s.city = $("#editCity").value.trim();
    s.currency_code = $("#editCurrency").value;
    s.payment_term_id = Number($("#editPaymentTerm").value || s.payment_term_id);
    s.default_cost_center_id = $("#editCostCenter").value ? Number($("#editCostCenter").value) : null;
    s.email = $("#editEmail").value.trim();
    s.phone = $("#editPhone").value.trim();
    s.credit_limit_clp = Number($("#editCreditLimit").value || 0);
    s.is_critical = Boolean($("#editIsCritical").checked);
    s.kyc_complete = Boolean($("#editKycComplete").checked);

    const tagsRaw = $("#editTags").value;
    s.tags = tagsRaw
      ? tagsRaw.split(",").map((x) => x.trim()).filter(Boolean)
      : [];

    s.notes = $("#editNotes").value;
  }

  function saveEdit() {
    const mode = STATE.editing.mode;

    if (mode === "new") {
      const draft = makeNewSupplierDraft();
      readEditFormIntoSupplier(draft);

      const errs = validateSupplierPayload(draft);
      if (errs.length) {
        alert("Validación:\n- " + errs.join("\n- "));
        return;
      }

      // Persistir in-memory
      STATE.db.suppliers.push(deepClone(draft));
      // Reindex (por consistencia)
      buildInvoicesIndex(STATE.db);
      STATE.suppliers = normalizeSuppliers(STATE.db);

      closeModal("modalEdit");
      renderTable();
      return;
    }

    const s = getSupplierById(STATE.editing.supplier_id);
    if (!s) return;

    if (!canEdit(s)) {
      alert("Edición no permitida: proveedor finalizado o fuera de estado inicial.");
      return;
    }

    readEditFormIntoSupplier(s);

    const errs = validateSupplierPayload(s);
    if (errs.length) {
      alert("Validación:\n- " + errs.join("\n- "));
      return;
    }

    // reflejar en db base (in-memory)
    const idx = STATE.db.suppliers.findIndex((x) => Number(x.id) === Number(s.id));
    if (idx >= 0) STATE.db.suppliers[idx] = deepClone(s);

    buildInvoicesIndex(STATE.db);
    STATE.suppliers = normalizeSuppliers(STATE.db);

    closeModal("modalEdit");
    renderTable();
  }

  // ---------------------------------------------------------
  // Events
  // ---------------------------------------------------------
  function wireFilters() {
    $("#filterTerm").addEventListener("input", debounce((ev) => {
      STATE.filters.term = ev.target.value;
      STATE.page = 1;
      renderTable();
    }, 180));

    $("#filterDateFrom").addEventListener("change", (ev) => {
      STATE.filters.date_from = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#filterDateTo").addEventListener("change", (ev) => {
      STATE.filters.date_to = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#filterStatus").addEventListener("change", (ev) => {
      STATE.filters.status_id = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#filterCategory").addEventListener("change", (ev) => {
      STATE.filters.category_id = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#filterCostCenter").addEventListener("change", (ev) => {
      STATE.filters.cost_center_id = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#filterPaymentTerm").addEventListener("change", (ev) => {
      STATE.filters.payment_term_id = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#filterCountry").addEventListener("change", (ev) => {
      STATE.filters.country_code = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#toggleCritical").addEventListener("change", (ev) => {
      STATE.filters.critical_only = ev.target.checked;
      STATE.page = 1;
      renderTable();
    });

    $("#toggleMissingKyc").addEventListener("change", (ev) => {
      STATE.filters.missing_kyc_only = ev.target.checked;
      STATE.page = 1;
      renderTable();
    });

    $("#toggleOpenBalance").addEventListener("change", (ev) => {
      STATE.filters.open_balance_only = ev.target.checked;
      STATE.page = 1;
      renderTable();
    });

    $("#toggleForeign").addEventListener("change", (ev) => {
      STATE.filters.foreign_only = ev.target.checked;
      STATE.page = 1;
      renderTable();
    });

    $("#btnClearFilters").addEventListener("click", () => {
      STATE.filters = {
        term: "",
        date_from: "",
        date_to: "",
        status_id: "",
        category_id: "",
        cost_center_id: "",
        payment_term_id: "",
        country_code: "",
        critical_only: false,
        missing_kyc_only: false,
        open_balance_only: false,
        foreign_only: false,
      };

      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterCategory").value = "";
      $("#filterCostCenter").value = "";
      $("#filterPaymentTerm").value = "";
      $("#filterCountry").value = "";

      $("#toggleCritical").checked = false;
      $("#toggleMissingKyc").checked = false;
      $("#toggleOpenBalance").checked = false;
      $("#toggleForeign").checked = false;

      STATE.page = 1;
      renderTable();
    });
  }

  function wireTableControls() {
    $("#sortBy").addEventListener("change", (ev) => {
      STATE.sortBy = ev.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#pageSize").addEventListener("change", (ev) => {
      STATE.pageSize = Number(ev.target.value || 10);
      STATE.page = 1;
      renderTable();
    });

    $("#pagination").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-page]");
      if (!btn) return;
      const p = Number(btn.getAttribute("data-page"));
      if (!Number.isFinite(p)) return;
      STATE.page = p;
      renderTable();
    });

    // Row actions
    $("#tableBody").addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-action]");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      const s = getSupplierById(id);
      if (!s) return;

      if (action === "view") {
        initModalSelects("view");
        fillViewModal(reComputeDerived(s));
        openModal("modalView");
        return;
      }

      if (action === "edit") {
        if (!canEdit(s)) return;
        STATE.editing = { supplier_id: id, mode: "edit" };
        initModalSelects("edit");
        fillEditModal(reComputeDerived(s), "edit");
        openModal("modalEdit");
        return;
      }

      if (action === "approve") {
        if (!canApproveReject(s)) return;
        openConfirm("APPROVE", id);
        return;
      }

      if (action === "reject") {
        if (!canApproveReject(s)) return;
        openConfirm("REJECT", id);
        return;
      }

      if (action === "reverse") {
        reverseToPrevious(s);

        // reflejar en db base (in-memory)
        const idx = STATE.db.suppliers.findIndex((x) => Number(x.id) === Number(s.id));
        if (idx >= 0) STATE.db.suppliers[idx] = deepClone(s);

        STATE.suppliers = normalizeSuppliers(STATE.db);
        renderTable();
        return;
      }
    });
  }

  function wireHeaderActions() {
    $("#btnReload").addEventListener("click", async () => {
      await boot();
    });

    $("#btnNew").addEventListener("click", () => {
      const draft = makeNewSupplierDraft();
      STATE.editing = { supplier_id: draft.id, mode: "new" };

      initModalSelects("edit");
      fillEditModal(reComputeDerived(draft), "new");
      openModal("modalEdit");
    });
  }

  function wireEditSave() {
    $("#btnSave").addEventListener("click", () => saveEdit());
  }

  function wireConfirm() {
    $("#btnConfirm").addEventListener("click", () => onConfirm());
  }

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------
  async function boot() {
    try {
      const db = await loadData();
      STATE.db = db;

      buildMaps(db);
      buildInvoicesIndex(db);

      STATE.suppliers = normalizeSuppliers(db);

      initFilterSelects();
      initModalSelects("edit");
      initModalSelects("view");

      renderTable();
    } catch (e) {
      console.error(e);
      alert("Error al inicializar: " + (e?.message || e));
    }
  }

  function wireGlobal() {
    wireModalClose();
    wireFilters();
    wireTableControls();
    wireHeaderActions();
    wireEditSave();
    wireConfirm();
  }

  wireGlobal();
  boot();
})();
