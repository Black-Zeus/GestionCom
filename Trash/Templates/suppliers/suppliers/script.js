/* =========================================================
   GestionCom • /suppliers (vanilla, sin dependencias)
   ---------------------------------------------------------
   Objeto normalizado principal: supplier
   Columna de fecha principal:   created_at
   Columna de monto principal:   credit_limit (opcional)
   PK:                           supplier_id

   Catálogos: supplier_statuses, supplier_types, countries,
              payment_terms, tax_regimes, risk_levels, users

   Workflow (si aplica):
   - PENDING -> APPROVED | REJECTED
   - Reversa: restaura el estado anterior (snapshot); fallback a PENDING

   Condición estado final:
   status_code ∈ { APPROVED, REJECTED }
   ========================================================= */

(function () {
  "use strict";

  // -----------------------------
  // Helpers DOM
  // -----------------------------
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
  const fmtMoney = (n) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(n || 0));

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

  // -----------------------------
  // Config workflow
  // -----------------------------
  const WORKFLOW = {
    initial_status_code: "PENDING",
    final_status_codes: ["APPROVED", "REJECTED"],
  };

  // Simulación usuario actual (en prod: sesión/auth)
  const CURRENT_USER_ID = 2;

  // -----------------------------
  // State
  // -----------------------------
  const STATE = {
    db: null,

    byId: {
      statuses: new Map(),
      types: new Map(),
      countries: new Map(),
      paymentTerms: new Map(),
      taxRegimes: new Map(),
      riskLevels: new Map(),
      users: new Map(),
    },

    suppliers: [],

    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      type_id: "",
      country_id: "",
      payment_term_id: "",
      risk_level_id: "",
      preferred_only: false,
      has_taxid_only: false,
      high_risk_only: false,
      approved_only: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    editing: { supplier_id: null, mode: "edit" }, // edit | new
    confirm: { action: null, supplier_id: null }, // APPROVE | REJECT
  };

  // -----------------------------
  // Lookup helpers
  // -----------------------------
  function mapById(arr, key = "id") {
    const m = new Map();
    (arr || []).forEach((x) => m.set(Number(x[key]), x));
    return m;
  }

  const getStatusById = (id) => STATE.byId.statuses.get(Number(id)) || null;
  const getType = (id) => STATE.byId.types.get(Number(id)) || null;
  const getCountry = (id) => STATE.byId.countries.get(Number(id)) || null;
  const getPaymentTerm = (id) => STATE.byId.paymentTerms.get(Number(id)) || null;
  const getTaxRegime = (id) => STATE.byId.taxRegimes.get(Number(id)) || null;
  const getRisk = (id) => STATE.byId.riskLevels.get(Number(id)) || null;
  const getUser = (id) => STATE.byId.users.get(Number(id)) || null;

  function statusCodeOf(s) {
    return getStatusById(s.status_id)?.status_code || "";
  }

  function isFinal(s) {
    return WORKFLOW.final_status_codes.includes(statusCodeOf(s));
  }

  function canEdit(s) {
    // Regla: editar solo si NO está finalizado (Pendiente).
    return statusCodeOf(s) === WORKFLOW.initial_status_code;
  }

  function canApproveReject(s) {
    return statusCodeOf(s) === WORKFLOW.initial_status_code;
  }

  function canReverse(s) {
    // Visible si no está en estado inicial
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
        return "info";
    }
  }

  function chipClassForRisk(code) {
    switch (code) {
      case "LOW":
        return "ok";
      case "MED":
        return "warn";
      case "HIGH":
        return "bad";
      default:
        return "info";
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -----------------------------
  // Normalización
  // -----------------------------
  function buildMaps(db) {
    STATE.byId.statuses = mapById(db.supplier_statuses);
    STATE.byId.types = mapById(db.supplier_types);
    STATE.byId.countries = mapById(db.countries);
    STATE.byId.paymentTerms = mapById(db.payment_terms);
    STATE.byId.taxRegimes = mapById(db.tax_regimes);
    STATE.byId.riskLevels = mapById(db.risk_levels);
    STATE.byId.users = mapById(db.users);
  }

  function reComputeDerived(s) {
    const st = getStatusById(s.status_id);
    const ty = getType(s.type_id);
    const co = getCountry(s.country_id);
    const pt = getPaymentTerm(s.payment_term_id);
    const tx = getTaxRegime(s.tax_regime_id);
    const rk = getRisk(s.risk_level_id);
    const createdBy = getUser(s.created_by_user_id);

    const credit = Number(s.credit_limit || 0);
    const search = [
      s.supplier_code,
      s.legal_name,
      s.trade_name,
      s.tax_id,
      s.contact_name,
      s.contact_email,
      s.contact_phone,
      s.address,
      s.bank_name,
      s.bank_account,
      st?.status_code,
      st?.status_label,
      ty?.type_code,
      ty?.type_label,
      co?.country_code,
      co?.country_name,
      pt?.term_code,
      pt?.term_label,
      tx?.regime_code,
      tx?.regime_label,
      rk?.risk_code,
      rk?.risk_label,
      createdBy?.display_name,
      s.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      ...s,
      supplier_id: Number(s.id ?? s.supplier_id),
      status: st || null,
      type: ty || null,
      country: co || null,
      payment_term: pt || null,
      tax_regime: tx || null,
      risk: rk || null,
      created_by: createdBy || null,

      credit_limit: credit,
      is_final: isFinal(s),
      _search: search,
      _history: Array.isArray(s._history) ? s._history : [],
    };
  }

  function normalizeSuppliers(db) {
    const list = (db.suppliers || []).map((s) => reComputeDerived(s));
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }

  // -----------------------------
  // Data loading
  // -----------------------------
  async function loadData() {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar data.json (HTTP ${res.status})`);
    return res.json();
  }

  // -----------------------------
  // Select fillers
  // -----------------------------
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
    const types = (STATE.db.supplier_types || []).map((t) => ({ id: t.id, label: t.type_label }));
    const countries = (STATE.db.countries || []).map((c) => ({ id: c.id, label: `${c.country_code} • ${c.country_name}` }));
    const terms = (STATE.db.payment_terms || []).map((t) => ({ id: t.id, label: `${t.term_code} • ${t.term_label}` }));
    const risks = (STATE.db.risk_levels || []).map((r) => ({ id: r.id, label: `${r.risk_code} • ${r.risk_label}` }));

    fillSelect($("#filterStatus"), statuses, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterType"), types, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCountry"), countries, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterPaymentTerm"), terms, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterRisk"), risks, { includeEmpty: true, emptyLabel: "Todos" });
  }

  function initModalSelects(prefix) {
    const statusSel = $(`#${prefix}Status`);
    const typeSel = $(`#${prefix}Type`);
    const countrySel = $(`#${prefix}Country`);
    const taxSel = $(`#${prefix}TaxRegime`);
    const paySel = $(`#${prefix}PaymentTerm`);
    const riskSel = $(`#${prefix}Risk`);

    const statuses = (STATE.db.supplier_statuses || []).map((s) => ({ id: s.id, label: `${s.status_code} • ${s.status_label}` }));
    const types = (STATE.db.supplier_types || []).map((t) => ({ id: t.id, label: `${t.type_code} • ${t.type_label}` }));
    const countries = (STATE.db.countries || []).map((c) => ({ id: c.id, label: `${c.country_code} • ${c.country_name}` }));
    const taxes = (STATE.db.tax_regimes || []).map((t) => ({ id: t.id, label: `${t.regime_code} • ${t.regime_label}` }));
    const terms = (STATE.db.payment_terms || []).map((t) => ({ id: t.id, label: `${t.term_code} • ${t.term_label}` }));
    const risks = (STATE.db.risk_levels || []).map((r) => ({ id: r.id, label: `${r.risk_code} • ${r.risk_label}` }));

    fillSelect(statusSel, statuses, { includeEmpty: false });
    fillSelect(typeSel, types, { includeEmpty: false });
    fillSelect(countrySel, countries, { includeEmpty: false });
    fillSelect(taxSel, taxes, { includeEmpty: false });
    fillSelect(paySel, terms, { includeEmpty: false });
    fillSelect(riskSel, risks, { includeEmpty: false });

    // Status no es editable por UI (derivado del workflow)
    if (prefix === "edit") statusSel?.setAttribute("disabled", "disabled");
    if (prefix === "view") statusSel?.removeAttribute("disabled"); // bloqueado por .readonly
  }

  // -----------------------------
  // Filtering + sorting + paging
  // -----------------------------
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
        if (f.type_id && String(s.type_id) !== String(f.type_id)) return false;
        if (f.country_id && String(s.country_id) !== String(f.country_id)) return false;
        if (f.payment_term_id && String(s.payment_term_id) !== String(f.payment_term_id)) return false;
        if (f.risk_level_id && String(s.risk_level_id) !== String(f.risk_level_id)) return false;

        if (f.preferred_only && !s.is_preferred) return false;
        if (f.has_taxid_only && !String(s.tax_id || "").trim()) return false;

        const riskCode = s.risk?.risk_code || "";
        if (f.high_risk_only && riskCode !== "HIGH") return false;

        const code = statusCodeOf(s);
        if (f.approved_only && code !== "APPROVED") return false;

        return true;
      });
  }

  function sortSuppliers(list) {
    const s = STATE.sortBy;
    const copy = list.slice();

    const getDate = (x) => new Date(x.created_at).getTime();
    const getCredit = (x) => Number(x.credit_limit || 0);
    const getRiskScore = (x) => Number(x.risk?.score || 0);

    switch (s) {
      case "date_asc":
        copy.sort((a, b) => getDate(a) - getDate(b));
        break;
      case "date_desc":
        copy.sort((a, b) => getDate(b) - getDate(a));
        break;
      case "credit_asc":
        copy.sort((a, b) => getCredit(a) - getCredit(b));
        break;
      case "credit_desc":
        copy.sort((a, b) => getCredit(b) - getCredit(a));
        break;
      case "risk_asc":
        copy.sort((a, b) => getRiskScore(a) - getRiskScore(b));
        break;
      case "risk_desc":
        copy.sort((a, b) => getRiskScore(b) - getRiskScore(a));
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

    return { page, pages, total, size, slice: list.slice(start, end) };
  }

  // -----------------------------
  // Render KPIs
  // -----------------------------
  function renderKPIs(list) {
    const total = list.length;

    const byCode = (code) => list.filter((s) => statusCodeOf(s) === code).length;
    const pending = byCode("PENDING");
    const approved = byCode("APPROVED");
    const rejected = byCode("REJECTED");

    const net = approved; // neto habilitados = aprobados (operables)
    const creditApproved = list
      .filter((s) => statusCodeOf(s) === "APPROVED")
      .reduce((sum, s) => sum + Number(s.credit_limit || 0), 0);

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiPending").textContent = fmtInt(pending);
    $("#kpiApproved").textContent = fmtInt(approved);
    $("#kpiRejected").textContent = fmtInt(rejected);
    $("#kpiNet").textContent = fmtInt(net);

    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiNetSub").textContent = `Crédito aprobado: ${fmtMoney(creditApproved)}`;
  }

  // -----------------------------
  // Render Table + pagination
  // -----------------------------
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
        const ty = getType(s.type_id);
        const co = getCountry(s.country_id);
        const pt = getPaymentTerm(s.payment_term_id);
        const rk = getRisk(s.risk_level_id);

        const chipCls = chipClassForStatus(code);
        const riskChip = rk ? `<span class="chip ${escapeHtml(chipClassForRisk(rk.risk_code))}">${escapeHtml(rk.risk_label)}</span>` : "—";
        const preferredChip = s.is_preferred ? `<span class="chip info" title="Proveedor preferido">★ Preferido</span>` : "";

        const nameMain = s.trade_name || s.legal_name || "—";
        const nameSub = s.legal_name && s.trade_name ? s.legal_name : (s.tax_id || "—");

        const contact = [s.contact_name, s.contact_email].filter(Boolean).join(" • ") || "—";

        return `
          <tr>
            <td>
              <div class="row-main">${escapeHtml(fmtDateShort(s.created_at))}</div>
              <div class="row-sub muted mono">${escapeHtml(s.supplier_code || "—")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(nameMain)}</div>
              <div class="row-sub muted">${escapeHtml(nameSub)} ${preferredChip ? "• " + preferredChip : ""}</div>
            </td>
            <td>
              <span class="chip ${escapeHtml(chipCls)}" title="${escapeHtml(st?.status_code || "")}">
                ${escapeHtml(st?.status_label || "—")}
              </span>
              <div class="row-sub muted">${escapeHtml(s.updated_at ? "Actualizado: " + fmtDateShort(s.updated_at) : "—")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(ty?.type_label || "—")}</div>
              <div class="row-sub muted">${escapeHtml(ty?.type_code || "")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(co ? `${co.country_code} • ${co.country_name}` : "—")}</div>
              <div class="row-sub muted">${escapeHtml(s.tax_id ? "Fiscal: " + s.tax_id : "Sin ID")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(contact)}</div>
              <div class="row-sub muted">${escapeHtml(s.contact_phone || "")}</div>
            </td>
            <td>
              <div class="row-main">${riskChip}</div>
              <div class="row-sub muted">${escapeHtml(rk ? `Score: ${rk.score}` : "")}</div>
            </td>
            <td class="right">
              <div class="row-main">${escapeHtml(fmtMoney(s.credit_limit || 0))}</div>
              <div class="row-sub muted">${escapeHtml(s.bank_name ? s.bank_name : "—")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(pt?.term_label || "—")}</div>
              <div class="row-sub muted">${escapeHtml(pt?.term_code || "")}</div>
            </td>
            <td class="center">
              <div class="actions">
                ${renderRowActions(s)}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    $("#lblPageInfo").textContent = `Página ${pg.page} de ${pg.pages} • ${fmtInt(pg.total)} proveedores`;
    renderPagination(pg.page, pg.pages);
  }

  function renderRowActions(s) {
    const id = s.supplier_id;

    const btnView = `<button class="icon-btn" data-action="view" data-id="${id}" title="Ver">👁</button>`;
    const btnEdit = canEdit(s) ? `<button class="icon-btn" data-action="edit" data-id="${id}" title="Editar">✎</button>` : ``;

    const btnApprove = canApproveReject(s)
      ? `<button class="icon-btn" data-action="approve" data-id="${id}" title="Aprobar">✓</button>`
      : ``;

    const btnReject = canApproveReject(s)
      ? `<button class="icon-btn" data-action="reject" data-id="${id}" title="Rechazar">✕</button>`
      : ``;

    const btnReverse = canReverse(s)
      ? `<button class="icon-btn" data-action="reverse" data-id="${id}" title="Reversar (⟲)">⟲</button>`
      : ``;

    // Regla: en final solo Ver + Reversar (y no Editar)
    if (isFinal(s)) return `${btnView}${btnReverse}`;

    // En pendiente: Ver + Editar + Aprobar + Rechazar
    return `${btnView}${btnEdit}${btnApprove}${btnReject}`;
  }

  function renderPagination(page, pages) {
    const host = $("#pagination");
    if (!host) return;

    const mk = (p, label, extra = "") =>
      `<button class="page-btn ${extra}" data-page="${p}" ${extra.includes("is-disabled") ? "disabled" : ""}>${escapeHtml(
        label
      )}</button>`;

    const btns = [];

    btns.push(mk(1, "«", page === 1 ? "is-disabled" : ""));
    btns.push(mk(page - 1, "‹", page === 1 ? "is-disabled" : ""));

    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(pages, start + windowSize - 1);
    const start2 = Math.max(1, end - windowSize + 1);

    for (let p = start2; p <= end; p++) {
      btns.push(mk(p, String(p), p === page ? "is-active" : ""));
    }

    btns.push(mk(page + 1, "›", page === pages ? "is-disabled" : ""));
    btns.push(mk(pages, "»", page === pages ? "is-disabled" : ""));

    host.innerHTML = btns.join("");
  }

  // -----------------------------
  // Modals
  // -----------------------------
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
    document.body.style.overflow = "";
  }

  function closeAllModals() {
    ["modalEdit", "modalView", "modalConfirm"].forEach(closeModal);
  }

  function getSupplierById(id) {
    return STATE.suppliers.find((s) => Number(s.supplier_id) === Number(id)) || null;
  }

  function nextSupplierId() {
    return Math.max(0, ...STATE.suppliers.map((s) => Number(s.supplier_id || 0))) + 1;
  }

  function nextSupplierCode() {
    const nums = STATE.suppliers
      .map((s) => String(s.supplier_code || "").match(/SUP-(\d+)/))
      .filter(Boolean)
      .map((m) => Number(m[1] || 0));
    const next = (Math.max(0, ...nums) + 1).toString().padStart(5, "0");
    return `SUP-${next}`;
  }

  function populateEditModal(s, mode) {
    const st = getStatusById(s.status_id);
    const ty = getType(s.type_id);

    $("#modalEditTitle").textContent = mode === "new" ? "Nuevo proveedor" : "Editar proveedor";
    $("#modalEditSub").textContent = `${s.supplier_code || "—"} • ${ty?.type_label || "—"} • ${st?.status_label || "—"}`;

    $("#editCode").value = s.supplier_code || "";
    $("#editDate").value = fmtDateInput(s.created_at);
    $("#editStatus").value = String(s.status_id || "");
    $("#editType").value = String(s.type_id || "");
    $("#editLegalName").value = s.legal_name || "";
    $("#editTradeName").value = s.trade_name || "";
    $("#editCountry").value = String(s.country_id || "");
    $("#editTaxId").value = s.tax_id || "";
    $("#editTaxRegime").value = String(s.tax_regime_id || "");
    $("#editPaymentTerm").value = String(s.payment_term_id || "");
    $("#editRisk").value = String(s.risk_level_id || "");
    $("#editCredit").value = String(Number(s.credit_limit || 0));
    $("#editContactName").value = s.contact_name || "";
    $("#editContactEmail").value = s.contact_email || "";
    $("#editContactPhone").value = s.contact_phone || "";
    $("#editAddress").value = s.address || "";
    $("#editBankName").value = s.bank_name || "";
    $("#editBankAccount").value = s.bank_account || "";
    $("#editPreferred").checked = Boolean(s.is_preferred);
    $("#editNotes").value = s.notes || "";

    const createdBy = getUser(s.created_by_user_id);
    $("#editCreatedBy").value = createdBy ? createdBy.display_name : "—";
    $("#editUpdatedAt").value = s.updated_at ? s.updated_at : "—";

    // Regla: editar solo si pendiente
    const editable = canEdit(s) || mode === "new";
    $("#btnSave").disabled = !editable;
    $("#editHint").textContent = editable ? "Edición habilitada (estado Pendiente)." : "Edición bloqueada (estado final).";
  }

  function collectEditModalIntoSupplier(base) {
    const out = { ...base };

    out.created_at = $("#editDate").value ? new Date($("#editDate").value + "T00:00:00Z").toISOString() : base.created_at;
    out.type_id = Number($("#editType").value || base.type_id);
    out.legal_name = String($("#editLegalName").value || "").trim();
    out.trade_name = String($("#editTradeName").value || "").trim();
    out.country_id = Number($("#editCountry").value || base.country_id);
    out.tax_id = String($("#editTaxId").value || "").trim();
    out.tax_regime_id = Number($("#editTaxRegime").value || base.tax_regime_id);
    out.payment_term_id = Number($("#editPaymentTerm").value || base.payment_term_id);
    out.risk_level_id = Number($("#editRisk").value || base.risk_level_id);
    out.credit_limit = Number($("#editCredit").value || 0);
    out.contact_name = String($("#editContactName").value || "").trim();
    out.contact_email = String($("#editContactEmail").value || "").trim();
    out.contact_phone = String($("#editContactPhone").value || "").trim();
    out.address = String($("#editAddress").value || "").trim();
    out.bank_name = String($("#editBankName").value || "").trim();
    out.bank_account = String($("#editBankAccount").value || "").trim();
    out.is_preferred = Boolean($("#editPreferred").checked);
    out.notes = String($("#editNotes").value || "").trim();

    out.updated_at = nowIso();

    return reComputeDerived(out);
  }

  function populateViewModal(s) {
    const st = getStatusById(s.status_id);
    const ty = getType(s.type_id);

    $("#modalViewTitle").textContent = "Ver proveedor";
    $("#modalViewSub").textContent = `${s.supplier_code || "—"} • ${ty?.type_label || "—"} • ${st?.status_label || "—"}`;

    // selects (se llenan en initModalSelects('view'))
    $("#viewStatus").value = String(s.status_id || "");
    $("#viewType").value = String(s.type_id || "");
    $("#viewCountry").value = String(s.country_id || "");
    $("#viewTaxRegime").value = String(s.tax_regime_id || "");
    $("#viewPaymentTerm").value = String(s.payment_term_id || "");
    $("#viewRisk").value = String(s.risk_level_id || "");

    $("#viewCode").value = s.supplier_code || "";
    $("#viewDate").value = fmtDateInput(s.created_at);
    $("#viewLegalName").value = s.legal_name || "";
    $("#viewTradeName").value = s.trade_name || "";
    $("#viewTaxId").value = s.tax_id || "";
    $("#viewCredit").value = String(Number(s.credit_limit || 0));
    $("#viewContactName").value = s.contact_name || "";
    $("#viewContactEmail").value = s.contact_email || "";
    $("#viewContactPhone").value = s.contact_phone || "";
    $("#viewAddress").value = s.address || "";
    $("#viewBankName").value = s.bank_name || "";
    $("#viewBankAccount").value = s.bank_account || "";
    $("#viewPreferred").checked = Boolean(s.is_preferred);
    $("#viewNotes").value = s.notes || "";

    const createdBy = getUser(s.created_by_user_id);
    $("#viewCreatedBy").value = createdBy ? createdBy.display_name : "—";
    $("#viewUpdatedAt").value = s.updated_at ? s.updated_at : "—";

    $("#viewHint").textContent = "Modo solo lectura (sin interacción).";
  }

  // -----------------------------
  // Workflow actions
  // -----------------------------
  function getStatusByCode(code) {
    const list = STATE.db?.supplier_statuses || [];
    return list.find((x) => String(x.status_code) === String(code)) || null;
  }

  function pushHistorySnapshot(s, reasonText, actionLabel) {
    const snap = {
      at: nowIso(),
      action: actionLabel,
      reason: String(reasonText || "").trim(),
      snapshot: deepClone({
        status_id: s.status_id,
        updated_at: s.updated_at,
      }),
    };
    s._history = Array.isArray(s._history) ? s._history : [];
    s._history.push(snap);
  }

  function applyStatus(supplier_id, newStatusCode, reasonText) {
    const s = getSupplierById(supplier_id);
    if (!s) return;

    const ns = getStatusByCode(newStatusCode);
    if (!ns) return;

    pushHistorySnapshot(s, reasonText, `SET_STATUS:${newStatusCode}`);

    s.status_id = Number(ns.id);
    s.updated_at = nowIso();

    // refrescar
    const idx = STATE.suppliers.findIndex((x) => Number(x.supplier_id) === Number(supplier_id));
    STATE.suppliers[idx] = reComputeDerived(s);

    renderTable();
  }

  function reverseSupplier(supplier_id) {
    const s = getSupplierById(supplier_id);
    if (!s) return;

    const hist = Array.isArray(s._history) ? s._history : [];
    const last = hist.length ? hist[hist.length - 1] : null;

    if (last && last.snapshot && typeof last.snapshot.status_id !== "undefined") {
      s.status_id = Number(last.snapshot.status_id);
      s.updated_at = nowIso();
      s._history.pop();
    } else {
      const init = getStatusByCode(WORKFLOW.initial_status_code);
      if (init) s.status_id = Number(init.id);
      s.updated_at = nowIso();
      s._history = [];
    }

    const idx = STATE.suppliers.findIndex((x) => Number(x.supplier_id) === Number(supplier_id));
    STATE.suppliers[idx] = reComputeDerived(s);

    renderTable();
  }

  // -----------------------------
  // Confirm modal
  // -----------------------------
  function openConfirm(action, supplier_id) {
    const s = getSupplierById(supplier_id);
    if (!s) return;

    STATE.confirm.action = action;
    STATE.confirm.supplier_id = supplier_id;

    const name = s.trade_name || s.legal_name || s.supplier_code || "Proveedor";

    $("#modalConfirmTitle").textContent = "Confirmación";
    $("#modalConfirmSub").textContent = `${s.supplier_code || "—"} • ${name}`;

    $("#confirmReason").value = "";

    if (action === "APPROVE") {
      $("#confirmIcon").textContent = "✓";
      $("#confirmTitle").textContent = "Aprobar proveedor";
      $("#confirmBody").textContent = "El proveedor quedará habilitado. Se bloqueará Editar y se habilitará Reversar (⟲).";
      $("#btnConfirm").className = "btn btn-primary";
      $("#btnConfirm").textContent = "Confirmar aprobación";
    } else {
      $("#confirmIcon").textContent = "✕";
      $("#confirmTitle").textContent = "Rechazar proveedor";
      $("#confirmBody").textContent = "El proveedor quedará no habilitado. Se bloqueará Editar y se habilitará Reversar (⟲).";
      $("#btnConfirm").className = "btn btn-danger";
      $("#btnConfirm").textContent = "Confirmar rechazo";
    }

    openModal("modalConfirm");
  }

  function confirmAction() {
    const action = STATE.confirm.action;
    const supplier_id = STATE.confirm.supplier_id;
    const reasonText = $("#confirmReason").value;

    if (!action || !supplier_id) return;

    if (action === "APPROVE") applyStatus(supplier_id, "APPROVED", reasonText);
    if (action === "REJECT") applyStatus(supplier_id, "REJECTED", reasonText);

    STATE.confirm.action = null;
    STATE.confirm.supplier_id = null;

    closeModal("modalConfirm");
  }

  // -----------------------------
  // Events
  // -----------------------------
  function bindEvents() {
    // Close modal (click backdrop / btn close)
    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;

      const closeId = t.getAttribute("data-close");
      if (closeId) closeModal(closeId);

      const action = t.getAttribute("data-action");
      const id = t.getAttribute("data-id");

      if (action && id) {
        const supplier = getSupplierById(id);
        if (!supplier) return;

        switch (action) {
          case "view":
            initModalSelects("view");
            populateViewModal(supplier);
            openModal("modalView");
            break;

          case "edit":
            if (!canEdit(supplier)) return;
            STATE.editing.supplier_id = supplier.supplier_id;
            STATE.editing.mode = "edit";
            initModalSelects("edit");
            populateEditModal(supplier, "edit");
            openModal("modalEdit");
            break;

          case "approve":
            if (!canApproveReject(supplier)) return;
            openConfirm("APPROVE", supplier.supplier_id);
            break;

          case "reject":
            if (!canApproveReject(supplier)) return;
            openConfirm("REJECT", supplier.supplier_id);
            break;

          case "reverse":
            if (!canReverse(supplier)) return;
            reverseSupplier(supplier.supplier_id);
            break;

          default:
            break;
        }
      }

      // Pagination
      if (t.classList.contains("page-btn") && t.hasAttribute("data-page")) {
        const p = Number(t.getAttribute("data-page") || "1");
        if (!Number.isFinite(p)) return;
        STATE.page = p;
        renderTable();
      }
    });

    // Escape close
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeAllModals();
    });

    // Filters
    $("#filterTerm").addEventListener(
      "input",
      debounce((ev) => {
        STATE.filters.term = ev.target.value || "";
        STATE.page = 1;
        renderTable();
      }, 200)
    );

    $("#filterDateFrom").addEventListener("change", (ev) => {
      STATE.filters.date_from = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterDateTo").addEventListener("change", (ev) => {
      STATE.filters.date_to = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterStatus").addEventListener("change", (ev) => {
      STATE.filters.status_id = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterType").addEventListener("change", (ev) => {
      STATE.filters.type_id = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterCountry").addEventListener("change", (ev) => {
      STATE.filters.country_id = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterPaymentTerm").addEventListener("change", (ev) => {
      STATE.filters.payment_term_id = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterRisk").addEventListener("change", (ev) => {
      STATE.filters.risk_level_id = ev.target.value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#togglePreferred").addEventListener("change", (ev) => {
      STATE.filters.preferred_only = Boolean(ev.target.checked);
      STATE.page = 1;
      renderTable();
    });

    $("#toggleHasTaxId").addEventListener("change", (ev) => {
      STATE.filters.has_taxid_only = Boolean(ev.target.checked);
      STATE.page = 1;
      renderTable();
    });

    $("#toggleHighRisk").addEventListener("change", (ev) => {
      STATE.filters.high_risk_only = Boolean(ev.target.checked);
      STATE.page = 1;
      renderTable();
    });

    $("#toggleApprovedOnly").addEventListener("change", (ev) => {
      STATE.filters.approved_only = Boolean(ev.target.checked);
      STATE.page = 1;
      renderTable();
    });

    // Sort + pageSize
    $("#sortBy").addEventListener("change", (ev) => {
      STATE.sortBy = ev.target.value || "date_desc";
      STATE.page = 1;
      renderTable();
    });

    $("#pageSize").addEventListener("change", (ev) => {
      STATE.pageSize = Number(ev.target.value || 10);
      STATE.page = 1;
      renderTable();
    });

    // Clear filters
    $("#btnClearFilters").addEventListener("click", () => {
      STATE.filters = {
        term: "",
        date_from: "",
        date_to: "",
        status_id: "",
        type_id: "",
        country_id: "",
        payment_term_id: "",
        risk_level_id: "",
        preferred_only: false,
        has_taxid_only: false,
        high_risk_only: false,
        approved_only: false,
      };

      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterType").value = "";
      $("#filterCountry").value = "";
      $("#filterPaymentTerm").value = "";
      $("#filterRisk").value = "";
      $("#togglePreferred").checked = false;
      $("#toggleHasTaxId").checked = false;
      $("#toggleHighRisk").checked = false;
      $("#toggleApprovedOnly").checked = false;

      STATE.page = 1;
      renderTable();
    });

    // New supplier
    $("#btnNew").addEventListener("click", () => {
      const pending = getStatusByCode(WORKFLOW.initial_status_code);
      const firstType = (STATE.db.supplier_types || [])[0];
      const firstCountry = (STATE.db.countries || [])[0];
      const firstPay = (STATE.db.payment_terms || [])[0];
      const firstTax = (STATE.db.tax_regimes || [])[0];
      const medRisk = (STATE.db.risk_levels || []).find((r) => r.risk_code === "MED") || (STATE.db.risk_levels || [])[0];

      const base = reComputeDerived({
        supplier_id: nextSupplierId(),
        id: nextSupplierId(),
        supplier_code: nextSupplierCode(),
        created_at: nowIso(),
        status_id: pending ? Number(pending.id) : 1,
        type_id: firstType ? Number(firstType.id) : 1,
        country_id: firstCountry ? Number(firstCountry.id) : 1,
        tax_id: "",
        tax_regime_id: firstTax ? Number(firstTax.id) : 1,
        payment_term_id: firstPay ? Number(firstPay.id) : 1,
        risk_level_id: medRisk ? Number(medRisk.id) : 1,
        legal_name: "",
        trade_name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        bank_name: "",
        bank_account: "",
        credit_limit: 0,
        is_preferred: false,
        notes: "",
        created_by_user_id: CURRENT_USER_ID,
        updated_at: null,
        _history: [],
      });

      STATE.editing.supplier_id = base.supplier_id;
      STATE.editing.mode = "new";

      initModalSelects("edit");
      populateEditModal(base, "new");
      openModal("modalEdit");
    });

    // Save
    $("#btnSave").addEventListener("click", () => {
      const mode = STATE.editing.mode;
      const id = STATE.editing.supplier_id;

      let current = getSupplierById(id);

      // En modo new el supplier todavía no existe en STATE.suppliers
      if (mode === "new" && !current) {
        // recrear base desde inputs (para consistencia)
        const pending = getStatusByCode(WORKFLOW.initial_status_code);
        current = reComputeDerived({
          supplier_id: id,
          id,
          supplier_code: $("#editCode").value || nextSupplierCode(),
          created_at: nowIso(),
          status_id: pending ? Number(pending.id) : 1,
          type_id: Number($("#editType").value || 1),
          country_id: Number($("#editCountry").value || 1),
          tax_id: "",
          tax_regime_id: Number($("#editTaxRegime").value || 1),
          payment_term_id: Number($("#editPaymentTerm").value || 1),
          risk_level_id: Number($("#editRisk").value || 1),
          legal_name: "",
          trade_name: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          address: "",
          bank_name: "",
          bank_account: "",
          credit_limit: 0,
          is_preferred: false,
          notes: "",
          created_by_user_id: CURRENT_USER_ID,
          updated_at: null,
          _history: [],
        });
      }

      if (!current) return;

      // Bloqueo: si final y no new => no guardar
      if (mode !== "new" && !canEdit(current)) return;

      const merged = collectEditModalIntoSupplier(current);

      if (!merged.legal_name && !merged.trade_name) {
        alert("Validación: debe ingresar al menos Razón social o Nombre fantasía.");
        return;
      }

      if (mode === "new") {
        STATE.suppliers.unshift(merged);
      } else {
        const idx = STATE.suppliers.findIndex((x) => Number(x.supplier_id) === Number(merged.supplier_id));
        if (idx >= 0) STATE.suppliers[idx] = merged;
      }

      closeModal("modalEdit");
      renderTable();
    });

    // Confirm modal
    $("#btnConfirm").addEventListener("click", confirmAction);

    // Reload
    $("#btnReload").addEventListener("click", async () => {
      await boot();
    });
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    closeAllModals();
    try {
      const db = await loadData();
      STATE.db = db;

      buildMaps(db);
      STATE.suppliers = normalizeSuppliers(db);

      initFilterSelects();
      initModalSelects("edit");
      initModalSelects("view");

      // Default UI
      $("#sortBy").value = STATE.sortBy;
      $("#pageSize").value = String(STATE.pageSize);

      STATE.page = 1;
      renderTable();
    } catch (err) {
      console.error(err);
      alert(`Error cargando módulo Proveedores: ${err.message || err}`);
    }
  }

  // Init
  bindEvents();
  boot();
})();
