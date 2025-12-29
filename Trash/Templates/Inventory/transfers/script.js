/* =========================================================
   GestionCom • stock/transfers (vanilla, sin dependencias)
   ---------------------------------------------------------
   Objeto normalizado principal: transfer_ticket
   Columna de fecha principal:  transfer_date
   Métrica principal:           total_units_sent / total_units_received (derivado)
   PK:                          transfer_id

   Catálogos: products, product_variants, warehouses, transfer_statuses,
              transfer_reasons, cost_centers, users

   Workflow:
   - PENDING_SEND  (Pendiente envío)  -> SEND (Enviado)
   - SENT          (Enviado)          -> RECEIVE_FULL | RECEIVE_PARTIAL | REJECT
   - Reversa: restaura el estado anterior (snapshot); fallback a PENDING_SEND

   Condición estado final:
   status_code ∈ { RECEIVED_FULL, RECEIVED_PARTIAL, REJECTED }
   ========================================================= */

(function () {
  "use strict";

  // -----------------------------
  // DOM helpers
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
  const fmtUnits = (n) =>
    new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));

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

  const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // -----------------------------
  // Config workflow
  // -----------------------------
  const WORKFLOW = {
    initial_status_code: "PENDING_SEND",
    sent_status_code: "SENT",
    final_status_codes: ["RECEIVED_FULL", "RECEIVED_PARTIAL", "REJECTED"],
  };

  // Simulación de usuario actual (en prod: sesión/auth)
  const CURRENT_USER_ID = 4;

  // -----------------------------
  // State
  // -----------------------------
  const STATE = {
    db: null,

    byId: {
      products: new Map(),
      variants: new Map(),
      warehouses: new Map(),
      statuses: new Map(),
      reasons: new Map(),
      costCenters: new Map(),
      users: new Map(),
    },

    transfers: [],

    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      reason_id: "",
      source_wh_id: "",
      target_wh_id: "",
      cost_center_id: "",
      urgent_only: false,
      diff_only: false,
      rejected_only: false,
      partial_only: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    editing: { transfer_id: null, mode: "edit" }, // edit | new
    confirm: { action: null, transfer_id: null }, // SEND | REJECT | RECEIVE_FULL
    receiving: { transfer_id: null }, // RECEIVE_PARTIAL (modal)
  };

  // -----------------------------
  // Lookup helpers
  // -----------------------------
  function mapById(arr, key = "id") {
    const m = new Map();
    (arr || []).forEach((x) => m.set(Number(x[key]), x));
    return m;
  }

  function getUser(id) {
    return STATE.byId.users.get(Number(id)) || null;
  }

  function getWh(id) {
    return STATE.byId.warehouses.get(Number(id)) || null;
  }

  function getStatusById(id) {
    return STATE.byId.statuses.get(Number(id)) || null;
  }

  function getStatusByCode(code) {
    const list = STATE.db?.transfer_statuses || [];
    return list.find((s) => String(s.status_code) === String(code)) || null;
  }

  function getReason(id) {
    return STATE.byId.reasons.get(Number(id)) || null;
  }

  function getCostCenter(id) {
    return STATE.byId.costCenters.get(Number(id)) || null;
  }

  function statusCodeOf(t) {
    return getStatusById(t.status_id)?.status_code || "";
  }

  function isFinal(t) {
    return WORKFLOW.final_status_codes.includes(statusCodeOf(t));
  }

  function canEdit(t) {
    // Editar solo si NO está finalizado y además aún no se ha enviado.
    return statusCodeOf(t) === WORKFLOW.initial_status_code;
  }

  function canSend(t) {
    return statusCodeOf(t) === WORKFLOW.initial_status_code;
  }

  function canReceive(t) {
    return statusCodeOf(t) === WORKFLOW.sent_status_code;
  }

  function canReverse(t) {
    // Visible si no está en estado inicial
    return statusCodeOf(t) !== WORKFLOW.initial_status_code;
  }

  function chipClassForStatus(code) {
    switch (code) {
      case "PENDING_SEND":
        return "warn";
      case "SENT":
        return "info";
      case "RECEIVED_FULL":
        return "ok";
      case "RECEIVED_PARTIAL":
        return "warn";
      case "REJECTED":
        return "bad";
      default:
        return "";
    }
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -----------------------------
  // Normalización
  // -----------------------------
  function buildMaps(db) {
    STATE.byId.products = mapById(db.products);
    STATE.byId.variants = mapById(db.product_variants);
    STATE.byId.warehouses = mapById(db.warehouses);
    STATE.byId.statuses = mapById(db.transfer_statuses);
    STATE.byId.reasons = mapById(db.transfer_reasons);
    STATE.byId.costCenters = mapById(db.cost_centers);
    STATE.byId.users = mapById(db.users);
  }

  function normalizeTransfers(db) {
    const linesByTransfer = new Map();
    (db.stock_transfer_lines || []).forEach((ln) => {
      const id = Number(ln.transfer_id);
      if (!linesByTransfer.has(id)) linesByTransfer.set(id, []);
      linesByTransfer.get(id).push(ln);
    });

    const msgsByTransfer = new Map();
    (db.stock_transfer_messages || []).forEach((m) => {
      const id = Number(m.transfer_id);
      if (!msgsByTransfer.has(id)) msgsByTransfer.set(id, []);
      msgsByTransfer.get(id).push(m);
    });

    const transfers = (db.stock_transfers || []).map((t) => {
      const status = getStatusById(t.status_id);
      const reason = getReason(t.reason_id);
      const cc = getCostCenter(t.cost_center_id);
      const srcWh = getWh(t.source_warehouse_id);
      const dstWh = getWh(t.target_warehouse_id);
      const reqBy = getUser(t.requested_by_user_id);
      const sentBy = getUser(t.sent_by_user_id);
      const recBy = getUser(t.received_by_user_id);

      const rawLines = linesByTransfer.get(Number(t.id)) || [];
      const normLines = rawLines.map((ln) => {
        const v = STATE.byId.variants.get(Number(ln.product_variant_id)) || null;
        const p = v ? (STATE.byId.products.get(Number(v.product_id)) || null) : null;

        const qtyReq = Number(ln.qty_requested || 0);
        const qtySent = Number(ln.qty_sent || 0);
        const qtyRec = Number(ln.qty_received || 0);

        return {
          ...ln,
          line_id: Number(ln.id),
          variant: v,
          product: p,
          variant_label: v ? `${v.variant_sku} • ${v.variant_name}` : `Variante #${ln.product_variant_id}`,
          product_label: p ? p.product_name : "—",
          qty_requested: qtyReq,
          qty_sent: qtySent,
          qty_received: qtyRec,
        };
      });

      const msgs = (msgsByTransfer.get(Number(t.id)) || [])
        .slice()
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return reComputeDerived({
        ...t,
        transfer_id: Number(t.id),
        transfer_code: t.transfer_code,
        transfer_date: t.transfer_date,

        status,
        reason,
        cost_center: cc || null,
        sourceWh: srcWh || null,
        targetWh: dstWh || null,
        requested_by: reqBy || null,
        sent_by: sentBy || null,
        received_by: recBy || null,

        lines: normLines,
        messages: msgs,

        // historial (memoria) en runtime
        _history: Array.isArray(t._history) ? t._history : [],
        _search: "",
      });
    });

    transfers.sort((a, b) => new Date(b.transfer_date) - new Date(a.transfer_date));
    return transfers;
  }

  function reComputeDerived(t) {
    // Recalcula totales y string de búsqueda (derivados de catálogo + líneas)
    const srcWh = getWh(t.source_warehouse_id);
    const dstWh = getWh(t.target_warehouse_id);
    const st = getStatusById(t.status_id);
    const rs = getReason(t.reason_id);
    const cc = getCostCenter(t.cost_center_id);
    const reqBy = getUser(t.requested_by_user_id);
    const sentBy = getUser(t.sent_by_user_id);
    const recBy = getUser(t.received_by_user_id);

    const normLines = (t.lines || []).map((ln) => {
      const v = STATE.byId.variants.get(Number(ln.product_variant_id)) || ln.variant || null;
      const p = v ? (STATE.byId.products.get(Number(v.product_id)) || ln.product || null) : (ln.product || null);
      return {
        ...ln,
        variant: v,
        product: p,
        variant_label: v ? `${v.variant_sku} • ${v.variant_name}` : `Variante #${ln.product_variant_id}`,
        product_label: p ? p.product_name : "—",
        qty_requested: Number(ln.qty_requested || 0),
        qty_sent: Number(ln.qty_sent || 0),
        qty_received: Number(ln.qty_received || 0),
      };
    });

    const totalItems = normLines.length;
    const unitsReq = normLines.reduce((s, ln) => s + Number(ln.qty_requested || 0), 0);
    const unitsSent = normLines.reduce((s, ln) => s + Number(ln.qty_sent || 0), 0);
    const unitsRec = normLines.reduce((s, ln) => s + Number(ln.qty_received || 0), 0);
    const diff = unitsSent - unitsRec;

    const linesHay = normLines
      .map((ln) => `${ln.variant_label} ${ln.product_label} ${ln.lot_code || ""} ${ln.line_notes || ""}`)
      .join(" ")
      .toLowerCase();

    const search = [
      t.transfer_code,
      t.reference_code,
      t.reference_type,
      t.notes,
      st?.status_label,
      st?.status_code,
      rs?.reason_label,
      cc?.cost_center_name,
      srcWh?.warehouse_name,
      srcWh?.warehouse_code,
      dstWh?.warehouse_name,
      dstWh?.warehouse_code,
      reqBy?.display_name,
      sentBy?.display_name,
      recBy?.display_name,
      linesHay,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      ...t,
      status: st || null,
      reason: rs || null,
      cost_center: cc || null,
      sourceWh: srcWh || null,
      targetWh: dstWh || null,
      requested_by: reqBy || null,
      sent_by: sentBy || null,
      received_by: recBy || null,
      lines: normLines,
      total_items: totalItems,
      total_units_requested: unitsReq,
      total_units_sent: unitsSent,
      total_units_received: unitsRec,
      units_diff: diff,
      is_final: isFinal(t),
      _search: search,
    };
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
    const statuses = (STATE.db.transfer_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const reasons = (STATE.db.transfer_reasons || []).map((r) => ({ id: r.id, label: r.reason_label }));
    const whs = (STATE.db.warehouses || []).map((w) => ({ id: w.id, label: `${w.warehouse_code} • ${w.warehouse_name}` }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));

    fillSelect($("#filterStatus"), statuses, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterReason"), reasons, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterSourceWh"), whs, { includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterTargetWh"), whs, { includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterCostCenter"), ccs, { includeEmpty: true, emptyLabel: "Todos" });
  }

  function initModalSelects(prefix) {
    const statusSel = $(`#${prefix}Status`);
    const reasonSel = $(`#${prefix}Reason`);
    const ccSel = $(`#${prefix}CostCenter`);
    const srcSel = $(`#${prefix}SourceWh`);
    const dstSel = $(`#${prefix}TargetWh`);
    const reqSel = $(`#${prefix}RequestedBy`);

    const statuses = (STATE.db.transfer_statuses || []).map((s) => ({ id: s.id, label: `${s.status_code} • ${s.status_label}` }));
    const reasons = (STATE.db.transfer_reasons || []).map((r) => ({ id: r.id, label: r.reason_label }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const whs = (STATE.db.warehouses || []).map((w) => ({ id: w.id, label: `${w.warehouse_code} • ${w.warehouse_name}` }));
    const users = (STATE.db.users || []).map((u) => ({ id: u.id, label: u.display_name }));

    fillSelect(statusSel, statuses, { includeEmpty: false });
    fillSelect(reasonSel, reasons, { includeEmpty: false });
    fillSelect(ccSel, [{ id: "", label: "—" }, ...ccs], { includeEmpty: false });
    fillSelect(srcSel, whs, { includeEmpty: false });
    fillSelect(dstSel, whs, { includeEmpty: false });
    fillSelect(reqSel, users, { includeEmpty: false });

    // Status no es editable por UI (derivado del workflow)
    if (prefix === "edit") statusSel?.setAttribute("disabled", "disabled");
    if (prefix === "view") statusSel?.removeAttribute("disabled"); // bloqueado por .readonly
  }

  function variantOptionsHtml(selectedId) {
    const list = (STATE.db.product_variants || []).slice().filter((v) => v.is_active !== false);
    list.sort((a, b) => String(a.variant_sku).localeCompare(String(b.variant_sku)));
    return list
      .map((v) => {
        const p = STATE.byId.products.get(Number(v.product_id));
        const label = `${v.variant_sku} • ${v.variant_name} — ${p ? p.product_name : "Producto"}`;
        const sel = String(selectedId) === String(v.id) ? " selected" : "";
        return `<option value="${escapeHtml(v.id)}"${sel}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  // -----------------------------
  // Filtering + sorting + paging
  // -----------------------------
  function getFiltered() {
    const f = STATE.filters;
    const term = String(f.term || "").trim().toLowerCase();
    const from = f.date_from ? new Date(f.date_from + "T00:00:00") : null;
    const to = f.date_to ? new Date(f.date_to + "T23:59:59") : null;

    return STATE.transfers
      .map((t) => reComputeDerived(t))
      .filter((t) => {
        if (term && !t._search.includes(term)) return false;

        if (from) {
          const d = new Date(t.transfer_date);
          if (d < from) return false;
        }
        if (to) {
          const d = new Date(t.transfer_date);
          if (d > to) return false;
        }

        if (f.status_id && String(t.status_id) !== String(f.status_id)) return false;
        if (f.reason_id && String(t.reason_id) !== String(f.reason_id)) return false;
        if (f.source_wh_id && String(t.source_warehouse_id) !== String(f.source_wh_id)) return false;
        if (f.target_wh_id && String(t.target_warehouse_id) !== String(f.target_wh_id)) return false;
        if (f.cost_center_id && String(t.cost_center_id || "") !== String(f.cost_center_id)) return false;

        if (f.urgent_only && !t.is_urgent) return false;
        if (f.diff_only && !(Number(t.units_diff || 0) !== 0)) return false;

        const code = statusCodeOf(t);
        if (f.rejected_only && code !== "REJECTED") return false;
        if (f.partial_only && code !== "RECEIVED_PARTIAL") return false;

        return true;
      });
  }

  function sortTransfers(list) {
    const s = STATE.sortBy;
    const copy = list.slice();

    const getSent = (t) => (t.sent_at ? new Date(t.sent_at).getTime() : 0);
    const getDate = (t) => new Date(t.transfer_date).getTime();
    const getDiffAbs = (t) => Math.abs(Number(t.units_diff || 0));

    switch (s) {
      case "date_asc":
        copy.sort((a, b) => getDate(a) - getDate(b));
        break;
      case "date_desc":
        copy.sort((a, b) => getDate(b) - getDate(a));
        break;
      case "sent_asc":
        copy.sort((a, b) => getSent(a) - getSent(b));
        break;
      case "sent_desc":
        copy.sort((a, b) => getSent(b) - getSent(a));
        break;
      case "diff_asc":
        copy.sort((a, b) => getDiffAbs(a) - getDiffAbs(b));
        break;
      case "diff_desc":
        copy.sort((a, b) => getDiffAbs(b) - getDiffAbs(a));
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

  // -----------------------------
  // Render KPIs
  // -----------------------------
  function renderKPIs(list) {
    const total = list.length;

    const byCode = (code) => list.filter((t) => statusCodeOf(t) === code).length;
    const pendingSend = byCode("PENDING_SEND");
    const pendingReceive = byCode("SENT");
    const finals = list.filter((t) => isFinal(t)).length;

    const netUnits = list.reduce((s, t) => s + Number(t.total_units_received || 0), 0);
    const sentUnits = list.reduce((s, t) => s + Number(t.total_units_sent || 0), 0);

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiPendingSend").textContent = fmtInt(pendingSend);
    $("#kpiPendingReceive").textContent = fmtInt(pendingReceive);
    $("#kpiFinal").textContent = fmtInt(finals);
    $("#kpiNetUnits").textContent = fmtUnits(netUnits);

    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiUnitsSub").textContent = `Enviado: ${fmtUnits(sentUnits)} • Recibido: ${fmtUnits(netUnits)}`;
  }

  // -----------------------------
  // Render Table + pagination
  // -----------------------------
  function renderTable() {
    const filtered = getFiltered();
    const sorted = sortTransfers(filtered);
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
      .map((t) => {
        const code = statusCodeOf(t);
        const st = getStatusById(t.status_id);
        const chipCls = chipClassForStatus(code);
        const src = getWh(t.source_warehouse_id);
        const dst = getWh(t.target_warehouse_id);
        const rs = getReason(t.reason_id);

        const reqBy = getUser(t.requested_by_user_id);
        const urgent = t.is_urgent ? `<span class="chip bad" title="Urgente">URG</span>` : "";
        const diff = Number(t.units_diff || 0);
        const diffChip =
          code === "SENT" || isFinal(t)
            ? diff === 0
              ? `<span class="chip ok" title="Sin diferencias">OK</span>`
              : `<span class="chip warn" title="Diferencia Enviado vs Recibido">${fmtUnits(diff)}</span>`
            : "";

        const actionsHtml = renderRowActions(t);

        return `
          <tr>
            <td>
              <div class="row-main">${escapeHtml(fmtDateShort(t.transfer_date))}</div>
              <div class="row-sub muted">${escapeHtml(t.reference_type || "—")} ${t.reference_code ? "• " + escapeHtml(t.reference_code) : ""}</div>
            </td>
            <td>
              <div class="row-main mono">${escapeHtml(t.transfer_code)}</div>
              <div class="row-sub muted">${urgent} ${diffChip}</div>
            </td>
            <td>
              <span class="chip ${escapeHtml(chipCls)}" title="${escapeHtml(st?.status_code || "")}">
                ${escapeHtml(st?.status_label || "—")}
              </span>
              <div class="row-sub muted">
                ${t.sent_at ? `Enviado: ${escapeHtml(fmtDateTime(t.sent_at))}` : "Sin envío"}
              </div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(src ? `${src.warehouse_code} • ${src.warehouse_name}` : "—")}</div>
              <div class="row-sub muted">${escapeHtml(getCostCenter(t.cost_center_id)?.cost_center_code || "")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(dst ? `${dst.warehouse_code} • ${dst.warehouse_name}` : "—")}</div>
              <div class="row-sub muted">${escapeHtml(getCostCenter(t.cost_center_id)?.cost_center_name || "—")}</div>
            </td>
            <td class="right">${escapeHtml(fmtInt(t.total_items || 0))}</td>
            <td class="right">${escapeHtml(fmtUnits(t.total_units_requested || 0))}</td>
            <td class="right">${escapeHtml(fmtUnits(t.total_units_sent || 0))}</td>
            <td class="right">${escapeHtml(fmtUnits(t.total_units_received || 0))}</td>
            <td>
              <div class="row-main">${escapeHtml(rs?.reason_label || "—")}</div>
              <div class="row-sub muted">${escapeHtml(t.is_urgent ? "Prioridad alta" : "Normal")}</div>
            </td>
            <td>
              <div class="row-main">${escapeHtml(reqBy?.display_name || "—")}</div>
              <div class="row-sub muted">${escapeHtml(reqBy?.role || "")}</div>
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

    $("#lblPageInfo").textContent = `Página ${pg.page} de ${pg.pages} • ${fmtInt(pg.total)} tickets`;
    renderPagination(pg.page, pg.pages);
  }

  function renderRowActions(t) {
    const id = t.transfer_id;

    const btnView = `<button class="icon-btn" data-action="view" data-id="${id}" title="Ver">👁</button>`;

    const btnEdit = canEdit(t)
      ? `<button class="icon-btn" data-action="edit" data-id="${id}" title="Editar">✎</button>`
      : ``;

    // SEND (desde origen)
    const btnSend = canSend(t)
      ? `<button class="icon-btn" data-action="send" data-id="${id}" title="Enviar (despacho)">⤴</button>`
      : ``;

    // Recepción (desde destino) cuando SENT
    const btnAccept = canReceive(t)
      ? `<button class="icon-btn" data-action="receive_full" data-id="${id}" title="Aceptar total">✓</button>`
      : ``;

    const btnPartial = canReceive(t)
      ? `<button class="icon-btn" data-action="receive_partial" data-id="${id}" title="Aceptar parcial / recepcionar">≋</button>`
      : ``;

    const btnReject = canReceive(t)
      ? `<button class="icon-btn" data-action="reject" data-id="${id}" title="Rechazar (total)">✕</button>`
      : ``;

    // Reversar (visible si no está en inicial)
    const btnReverse = canReverse(t)
      ? `<button class="icon-btn" data-action="reverse" data-id="${id}" title="Reversar (⟲)">⟲</button>`
      : ``;

    // Regla: tras acción final (aceptado/parcial/rechazado) NO mostrar edit, y los botones de aceptar/rechazar ya no aplican.
    // En SENT: se muestran aceptar/parcial/rechazar + reversa
    // En final: solo reversa + ver
    const code = statusCodeOf(t);
    if (WORKFLOW.final_status_codes.includes(code)) {
      return `${btnView}${btnReverse}`;
    }

    if (code === WORKFLOW.sent_status_code) {
      // aceptar / parcial / rechazar + reversa + ver
      return `${btnView}${btnAccept}${btnPartial}${btnReject}${btnReverse}`;
    }

    // inicial (pendiente envío): ver + editar + enviar
    return `${btnView}${btnEdit}${btnSend}`;
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
  // Modal helpers
  // -----------------------------
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

  function wireModalClose() {
    $$("[data-close]").forEach((el) => {
      el.addEventListener("click", () => {
        const target = el.getAttribute("data-close");
        closeModal(target);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // cierra el primer modal visible
      const open = $$(".modal").find((m) => !m.classList.contains("hidden"));
      if (open) closeModal(open.id);
    });
  }

  // -----------------------------
  // CRUD + Workflow (en memoria)
  // -----------------------------
  function nextTransferId() {
    const max = STATE.transfers.reduce((m, t) => Math.max(m, Number(t.transfer_id || 0)), 0);
    return max + 1;
  }

  function nextLineId() {
    const all = STATE.transfers.flatMap((t) => t.lines || []);
    const max = all.reduce((m, ln) => Math.max(m, Number(ln.line_id || 0)), 0);
    return max + 1;
  }

  function nextMsgId() {
    const all = STATE.transfers.flatMap((t) => t.messages || []);
    const max = all.reduce((m, x) => Math.max(m, Number(x.id || 0)), 0);
    return max + 1;
  }

  function generateTransferCode(n) {
    const pad = String(n).padStart(5, "0");
    return `TRF-${pad}`;
  }

  function findTransfer(id) {
    return STATE.transfers.find((t) => Number(t.transfer_id) === Number(id)) || null;
  }

  function pushHistorySnapshot(t, action, note) {
    const snap = {
      action,
      note: note || "",
      at: nowIso(),
      by_user_id: CURRENT_USER_ID,
      snapshot: {
        status_id: t.status_id,
        sent_by_user_id: t.sent_by_user_id || null,
        sent_at: t.sent_at || null,
        received_by_user_id: t.received_by_user_id || null,
        received_at: t.received_at || null,
        lines: (t.lines || []).map((ln) => ({
          line_id: ln.line_id,
          qty_requested: Number(ln.qty_requested || 0),
          qty_sent: Number(ln.qty_sent || 0),
          qty_received: Number(ln.qty_received || 0),
          product_variant_id: Number(ln.product_variant_id),
          lot_code: ln.lot_code || "",
          line_notes: ln.line_notes || "",
        })),
      },
    };

    if (!Array.isArray(t._history)) t._history = [];
    t._history.push(snap);
  }

  function addMessage(t, messageText, scope = "HEADER", line_id = null, type = "NOTE") {
    const msg = {
      id: nextMsgId(),
      transfer_id: t.transfer_id,
      scope,
      line_id,
      message_type: type,
      message_text: String(messageText || "").trim(),
      created_at: nowIso(),
      created_by_user_id: CURRENT_USER_ID,
    };
    if (!t.messages) t.messages = [];
    t.messages.push(msg);
    // sync db arrays (para coherencia si recargas solo runtime no aplica, pero queda homogéneo)
  }

  function workflowSend(t, note) {
    if (!canSend(t)) return;

    // Validación: al menos una línea con qty_sent > 0 y qty_sent <= qty_requested
    const anySent = (t.lines || []).some((ln) => Number(ln.qty_sent || 0) > 0);
    if (!anySent) {
      alert("No se puede enviar: debe existir al menos una línea con cantidad Enviada > 0.");
      return;
    }
    for (const ln of t.lines || []) {
      const req = Number(ln.qty_requested || 0);
      const sent = Number(ln.qty_sent || 0);
      if (sent < 0 || sent > req) {
        alert(`Cantidad enviada inválida en línea #${ln.line_id}: Enviado debe estar entre 0 y Req (${req}).`);
        return;
      }
    }

    pushHistorySnapshot(t, "SEND", note);

    const stSent = getStatusByCode(WORKFLOW.sent_status_code);
    t.status_id = stSent ? stSent.id : t.status_id;

    t.sent_by_user_id = CURRENT_USER_ID;
    t.sent_at = nowIso();

    // si estaba contaminado por recepción (no debería), limpiar
    t.received_by_user_id = null;
    t.received_at = null;
    (t.lines || []).forEach((ln) => (ln.qty_received = 0));

    addMessage(t, note ? `Despacho confirmado. ${note}` : "Despacho confirmado.", "HEADER", null, "WORKFLOW");
  }

  function workflowReject(t, note) {
    if (!canReceive(t)) return;

    pushHistorySnapshot(t, "REJECT", note);

    const st = getStatusByCode("REJECTED");
    if (st) t.status_id = st.id;

    t.received_by_user_id = CURRENT_USER_ID;
    t.received_at = nowIso();

    (t.lines || []).forEach((ln) => {
      ln.qty_received = 0;
    });

    addMessage(t, note ? `Recepción rechazada. ${note}` : "Recepción rechazada.", "HEADER", null, "WORKFLOW");
  }

  function workflowReceiveFull(t, note) {
    if (!canReceive(t)) return;

    // Validación: debe haber enviado algo
    const anySent = (t.lines || []).some((ln) => Number(ln.qty_sent || 0) > 0);
    if (!anySent) {
      alert("No se puede recepcionar: no existen cantidades enviadas.");
      return;
    }

    pushHistorySnapshot(t, "RECEIVE_FULL", note);

    (t.lines || []).forEach((ln) => {
      ln.qty_received = Number(ln.qty_sent || 0);
    });

    const st = getStatusByCode("RECEIVED_FULL");
    if (st) t.status_id = st.id;

    t.received_by_user_id = CURRENT_USER_ID;
    t.received_at = nowIso();

    addMessage(t, note ? `Recepción total confirmada. ${note}` : "Recepción total confirmada.", "HEADER", null, "WORKFLOW");
  }

  function workflowReceivePartial(t, receivedMap, note) {
    if (!canReceive(t)) return;

    pushHistorySnapshot(t, "RECEIVE_PARTIAL", note);

    (t.lines || []).forEach((ln) => {
      const sent = Number(ln.qty_sent || 0);
      const v = receivedMap.get(Number(ln.line_id));
      const rec = Number(v ?? 0);

      if (rec < 0 || rec > sent) {
        throw new Error(`Recepción inválida en línea #${ln.line_id}: Recibido debe estar entre 0 y Enviado (${sent}).`);
      }
      ln.qty_received = rec;
    });

    const totalSent = (t.lines || []).reduce((s, ln) => s + Number(ln.qty_sent || 0), 0);
    const totalRec = (t.lines || []).reduce((s, ln) => s + Number(ln.qty_received || 0), 0);

    let targetCode = "RECEIVED_PARTIAL";
    if (totalRec === 0) targetCode = "REJECTED";
    else if (totalRec === totalSent) targetCode = "RECEIVED_FULL";

    const st = getStatusByCode(targetCode);
    if (st) t.status_id = st.id;

    t.received_by_user_id = CURRENT_USER_ID;
    t.received_at = nowIso();

    const label =
      targetCode === "RECEIVED_FULL"
        ? "Recepción total confirmada."
        : targetCode === "REJECTED"
        ? "Recepción rechazada."
        : "Recepción parcial confirmada.";

    addMessage(t, note ? `${label} ${note}` : label, "HEADER", null, "WORKFLOW");
  }

  function workflowReverse(t, note) {
    if (!canReverse(t)) return;

    // restaura el snapshot anterior si existe, si no fallback a inicial
    const hist = Array.isArray(t._history) ? t._history : [];
    if (hist.length > 0) {
      const last = hist.pop(); // pop = revert último cambio
      const snap = last.snapshot;

      t.status_id = snap.status_id;
      t.sent_by_user_id = snap.sent_by_user_id;
      t.sent_at = snap.sent_at;
      t.received_by_user_id = snap.received_by_user_id;
      t.received_at = snap.received_at;

      // restaurar cantidades por line_id
      const byLine = new Map((snap.lines || []).map((x) => [Number(x.line_id), x]));
      (t.lines || []).forEach((ln) => {
        const s = byLine.get(Number(ln.line_id));
        if (!s) return;
        ln.qty_requested = Number(s.qty_requested || 0);
        ln.qty_sent = Number(s.qty_sent || 0);
        ln.qty_received = Number(s.qty_received || 0);
      });

      addMessage(
        t,
        note
          ? `Reversa aplicada (restaurado estado anterior: ${getStatusById(t.status_id)?.status_label || "—"}). ${note}`
          : `Reversa aplicada (restaurado estado anterior: ${getStatusById(t.status_id)?.status_label || "—"}).`,
        "HEADER",
        null,
        "WORKFLOW"
      );

      return;
    }

    // fallback: inicial
    const stInit = getStatusByCode(WORKFLOW.initial_status_code);
    pushHistorySnapshot(t, "REVERSE_FALLBACK", note);

    if (stInit) t.status_id = stInit.id;

    t.sent_by_user_id = null;
    t.sent_at = null;
    t.received_by_user_id = null;
    t.received_at = null;
    (t.lines || []).forEach((ln) => {
      ln.qty_received = 0;
    });

    addMessage(t, note ? `Reversa aplicada (fallback a estado inicial). ${note}` : "Reversa aplicada (fallback a estado inicial).", "HEADER", null, "WORKFLOW");
  }

  // -----------------------------
  // Modal: Edit / New
  // -----------------------------
  function openEditModal(id, mode = "edit") {
    STATE.editing.transfer_id = id;
    STATE.editing.mode = mode;

    const t = findTransfer(id);
    if (!t) return;

    initModalSelects("edit");

    $("#modalEditTitle").textContent = mode === "new" ? "Nuevo ticket" : "Editar ticket";
    $("#modalEditSub").textContent = `${t.transfer_code} • ${getStatusById(t.status_id)?.status_label || "—"}`;

    $("#editCode").value = t.transfer_code || "—";
    $("#editDate").value = fmtDateInput(t.transfer_date);
    $("#editStatus").value = String(t.status_id);
    $("#editReason").value = String(t.reason_id);
    $("#editCostCenter").value = t.cost_center_id ? String(t.cost_center_id) : "";
    $("#editRequestedBy").value = String(t.requested_by_user_id);
    $("#editSourceWh").value = String(t.source_warehouse_id);
    $("#editTargetWh").value = String(t.target_warehouse_id);
    $("#editReference").value = t.reference_code || "";
    $("#editUrgent").checked = !!t.is_urgent;
    $("#editNotes").value = t.notes || "";

    const sentBy = getUser(t.sent_by_user_id);
    const recBy = getUser(t.received_by_user_id);

    $("#editSentBy").value = sentBy ? sentBy.display_name : "—";
    $("#editSentAt").value = t.sent_at ? fmtDateTime(t.sent_at) : "—";
    $("#editReceivedBy").value = recBy ? recBy.display_name : "—";
    $("#editReceivedAt").value = t.received_at ? fmtDateTime(t.received_at) : "—";

    renderEditLines(t);
    renderMessages("edit", t);

    const hint = canEdit(t)
      ? "Editable: puedes ajustar cabecera y líneas antes de enviar."
      : "Este ticket no es editable (enviado o finalizado).";

    $("#editHint").textContent = hint;

    // bloquear inputs si no editable
    setEditInputsEnabled(canEdit(t));

    openModal("modalEdit");
  }

  function setEditInputsEnabled(enabled) {
    const ids = [
      "#editDate",
      "#editReason",
      "#editCostCenter",
      "#editRequestedBy",
      "#editSourceWh",
      "#editTargetWh",
      "#editReference",
      "#editUrgent",
      "#editNotes",
      "#btnAddLine",
      "#btnSave",
      "#btnAddMsg",
      "#editNewMsg",
    ];

    ids.forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      if (el.tagName === "BUTTON") el.disabled = !enabled && sel !== "#btnAddMsg"; // mensajes: permitir aunque no editable? criterio: solo en edit y no final -> aquí no
      else el.disabled = !enabled;
    });

    // nota: el status ya está disabled por diseño en edit
  }

  function renderEditLines(t) {
    const tbody = $("#editLinesBody");
    if (!tbody) return;

    const editable = canEdit(t);

    tbody.innerHTML = (t.lines || [])
      .map((ln) => {
        const removeBtn = editable
          ? `<button class="icon-btn" data-ln-action="remove" data-line="${ln.line_id}" title="Eliminar línea">🗑</button>`
          : `<button class="icon-btn" disabled title="No editable">—</button>`;

        return `
          <tr data-line-row="${ln.line_id}">
            <td>
              <select data-ln="variant" data-line="${ln.line_id}" ${editable ? "" : "disabled"}>
                ${variantOptionsHtml(ln.product_variant_id)}
              </select>
              <div class="row-sub muted">${escapeHtml(ln.product_label || "—")}</div>
            </td>
            <td class="right">
              <input type="number" min="0" step="1"
                     data-ln="qty_requested" data-line="${ln.line_id}"
                     value="${escapeHtml(ln.qty_requested)}" ${editable ? "" : "disabled"} />
            </td>
            <td class="right">
              <input type="number" min="0" step="1"
                     data-ln="qty_sent" data-line="${ln.line_id}"
                     value="${escapeHtml(ln.qty_sent)}" ${editable ? "" : "disabled"} />
            </td>
            <td>
              <input type="text" data-ln="lot_code" data-line="${ln.line_id}"
                     value="${escapeHtml(ln.lot_code || "")}" placeholder="(opcional)"
                     ${editable ? "" : "disabled"} />
            </td>
            <td>
              <input type="text" data-ln="line_notes" data-line="${ln.line_id}"
                     value="${escapeHtml(ln.line_notes || "")}" placeholder="Notas de línea…"
                     ${editable ? "" : "disabled"} />
            </td>
            <td class="center">${removeBtn}</td>
          </tr>
        `;
      })
      .join("");

    // eventos de inputs
    $$("[data-ln]", tbody).forEach((el) => {
      el.addEventListener("input", () => {
        if (!canEdit(t)) return;
        const lineId = Number(el.getAttribute("data-line"));
        const key = el.getAttribute("data-ln");
        const ln = (t.lines || []).find((x) => Number(x.line_id) === lineId);
        if (!ln) return;

        if (key === "variant") {
          ln.product_variant_id = Number(el.value);
        } else if (key === "qty_requested") {
          ln.qty_requested = Math.max(0, Number(el.value || 0));
          // clamp qty_sent
          ln.qty_sent = Math.min(Number(ln.qty_sent || 0), Number(ln.qty_requested || 0));
        } else if (key === "qty_sent") {
          const req = Number(ln.qty_requested || 0);
          ln.qty_sent = Math.max(0, Math.min(req, Number(el.value || 0)));
          el.value = String(ln.qty_sent);
        } else if (key === "lot_code") {
          ln.lot_code = String(el.value || "");
        } else if (key === "line_notes") {
          ln.line_notes = String(el.value || "");
        }

        // recalcular derivados
        Object.assign(t, reComputeDerived(t));
      });
    });

    // eliminar línea
    $$("[data-ln-action='remove']", tbody).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!canEdit(t)) return;
        const lineId = Number(btn.getAttribute("data-line"));
        t.lines = (t.lines || []).filter((x) => Number(x.line_id) !== lineId);
        Object.assign(t, reComputeDerived(t));
        renderEditLines(t);
      });
    });
  }

  function addLineToEdit() {
    const id = STATE.editing.transfer_id;
    const t = findTransfer(id);
    if (!t || !canEdit(t)) return;

    const firstVariant = (STATE.db.product_variants || []).find((v) => v.is_active !== false);
    if (!firstVariant) {
      alert("No existen variantes disponibles en catálogo.");
      return;
    }

    const newLn = {
      id: nextLineId(),
      line_id: nextLineId(),
      transfer_id: t.transfer_id,
      product_variant_id: Number(firstVariant.id),
      qty_requested: 1,
      qty_sent: 1,
      qty_received: 0,
      lot_code: "",
      line_notes: "",
    };

    t.lines = [...(t.lines || []), newLn];
    Object.assign(t, reComputeDerived(t));
    renderEditLines(t);
  }

  function saveEditModal() {
    const id = STATE.editing.transfer_id;
    const t = findTransfer(id);
    if (!t) return;

    if (!canEdit(t)) {
      closeModal("modalEdit");
      return;
    }

    // aplicar cabecera
    const date = $("#editDate").value;
    const reasonId = Number($("#editReason").value);
    const ccId = $("#editCostCenter").value ? Number($("#editCostCenter").value) : null;
    const reqById = Number($("#editRequestedBy").value);
    const srcId = Number($("#editSourceWh").value);
    const dstId = Number($("#editTargetWh").value);

    if (!date) {
      alert("Fecha obligatoria.");
      return;
    }
    if (srcId === dstId) {
      alert("Origen y destino no pueden ser la misma bodega.");
      return;
    }
    if (!reasonId) {
      alert("Motivo obligatorio.");
      return;
    }
    if (!reqById) {
      alert("Solicitado por obligatorio.");
      return;
    }
    if (!t.lines || t.lines.length === 0) {
      alert("Debe existir al menos una línea.");
      return;
    }

    // validación de líneas
    for (const ln of t.lines) {
      const req = Number(ln.qty_requested || 0);
      const sent = Number(ln.qty_sent || 0);
      if (req <= 0) {
        alert("Cantidad requerida debe ser > 0 en todas las líneas.");
        return;
      }
      if (sent < 0 || sent > req) {
        alert("Cantidad enviada debe estar entre 0 y requerida.");
        return;
      }
    }

    t.transfer_date = date + "T00:00:00Z";
    t.reason_id = reasonId;
    t.cost_center_id = ccId;
    t.requested_by_user_id = reqById;
    t.source_warehouse_id = srcId;
    t.target_warehouse_id = dstId;
    t.reference_code = ($("#editReference").value || "").trim();
    t.is_urgent = !!$("#editUrgent").checked;
    t.notes = ($("#editNotes").value || "").trim();

    // sync lookups
    Object.assign(t, reComputeDerived(t));

    // mensaje opcional (si el usuario dejó texto)
    const msg = ($("#editNewMsg").value || "").trim();
    if (msg) {
      addMessage(t, msg, "HEADER", null, "NOTE");
      $("#editNewMsg").value = "";
      renderMessages("edit", t);
    }

    closeModal("modalEdit");
    renderTable();
  }

  // -----------------------------
  // Modal: View
  // -----------------------------
  function openViewModal(id) {
    const t = findTransfer(id);
    if (!t) return;

    initModalSelects("view");

    $("#modalViewSub").textContent = `${t.transfer_code} • ${getStatusById(t.status_id)?.status_label || "—"}`;

    $("#viewCode").value = t.transfer_code || "—";
    $("#viewDate").value = fmtDateInput(t.transfer_date);
    $("#viewStatus").value = String(t.status_id);
    $("#viewReason").value = String(t.reason_id);
    $("#viewCostCenter").value = t.cost_center_id ? String(t.cost_center_id) : "";
    $("#viewRequestedBy").value = String(t.requested_by_user_id);
    $("#viewSourceWh").value = String(t.source_warehouse_id);
    $("#viewTargetWh").value = String(t.target_warehouse_id);
    $("#viewReference").value = t.reference_code || "";
    $("#viewUrgent").checked = !!t.is_urgent;
    $("#viewNotes").value = t.notes || "";

    const sentBy = getUser(t.sent_by_user_id);
    const recBy = getUser(t.received_by_user_id);

    $("#viewSentBy").value = sentBy ? sentBy.display_name : "—";
    $("#viewSentAt").value = t.sent_at ? fmtDateTime(t.sent_at) : "—";
    $("#viewReceivedBy").value = recBy ? recBy.display_name : "—";
    $("#viewReceivedAt").value = t.received_at ? fmtDateTime(t.received_at) : "—";

    renderViewLines(t);
    renderMessages("view", t);

    const hint = isFinal(t)
      ? "Ticket finalizado: reversa disponible desde la tabla."
      : statusCodeOf(t) === "SENT"
      ? "Pendiente de recepción: aceptar total/parcial o rechazar desde la tabla."
      : "Pendiente de envío: debe ser despachado por bodega origen.";

    $("#viewHint").textContent = hint;

    // Bloquear interacción en view (también toggles/textareas)
    $("#viewNewMsg").disabled = true;

    openModal("modalView");
  }

  function renderViewLines(t) {
    const tbody = $("#viewLinesBody");
    if (!tbody) return;

    tbody.innerHTML = (t.lines || [])
      .map((ln) => {
        return `
          <tr>
            <td>
              <div class="row-main">${escapeHtml(ln.variant_label)}</div>
              <div class="row-sub muted">${escapeHtml(ln.product_label)}</div>
            </td>
            <td class="right">${escapeHtml(fmtUnits(ln.qty_requested || 0))}</td>
            <td class="right">${escapeHtml(fmtUnits(ln.qty_sent || 0))}</td>
            <td class="right">${escapeHtml(fmtUnits(ln.qty_received || 0))}</td>
            <td>${escapeHtml(ln.lot_code || "—")}</td>
            <td>${escapeHtml(ln.line_notes || "—")}</td>
          </tr>
        `;
      })
      .join("");
  }

  // -----------------------------
  // Mensajes (panel común)
  // -----------------------------
  function renderMessages(prefix, t) {
    const listEl = $(`#${prefix}MsgList`);
    const countEl = $(`#${prefix}MsgCount`);
    if (!listEl || !countEl) return;

    const msgs = (t.messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    countEl.textContent = `${fmtInt(msgs.length)} mensajes`;

    if (msgs.length === 0) {
      listEl.innerHTML = `<div class="muted small">Sin mensajes.</div>`;
      return;
    }

    listEl.innerHTML = msgs
      .map((m) => {
        const u = getUser(m.created_by_user_id);
        const who = u ? u.display_name : `User#${m.created_by_user_id}`;
        const meta = [
          fmtDateTime(m.created_at),
          who,
          m.message_type ? `[${m.message_type}]` : "",
          m.scope ? m.scope : "",
          m.line_id ? `L#${m.line_id}` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        return `
          <div class="msg-item">
            <div class="meta">${escapeHtml(meta)}</div>
            <div class="text">${escapeHtml(m.message_text || "")}</div>
          </div>
        `;
      })
      .join("");
  }

  function addMsgFromEdit() {
    const id = STATE.editing.transfer_id;
    const t = findTransfer(id);
    if (!t) return;
    if (!canEdit(t)) return;

    const text = ($("#editNewMsg").value || "").trim();
    if (!text) return;

    addMessage(t, text, "HEADER", null, "NOTE");
    $("#editNewMsg").value = "";
    renderMessages("edit", t);
    renderTable();
  }

  // -----------------------------
  // Confirm modal (SEND / REJECT / RECEIVE_FULL)
  // -----------------------------
  function openConfirm(action, transfer_id) {
    STATE.confirm.action = action;
    STATE.confirm.transfer_id = transfer_id;

    const t = findTransfer(transfer_id);
    if (!t) return;

    const st = getStatusById(t.status_id);
    const titleEl = $("#confirmTitle");
    const bodyEl = $("#confirmBody");
    const hintEl = $("#confirmHint");
    const subEl = $("#modalConfirmSub");
    const icEl = $("#confirmIcon");
    const btn = $("#btnConfirm");

    subEl.textContent = `${t.transfer_code} • Estado actual: ${st?.status_label || "—"}`;

    $("#confirmReason").value = "";

    if (action === "SEND") {
      $("#modalConfirmTitle").textContent = "Confirmar envío";
      titleEl.textContent = "¿Confirmar despacho del ticket?";
      bodyEl.textContent = "Esto bloqueará edición y habilitará recepción (total/parcial) o rechazo en bodega destino.";
      hintEl.textContent = "Acción irreversible sin usar Reversar (⟲).";
      icEl.textContent = "⤴";
      btn.textContent = "Confirmar envío";
      btn.classList.remove("btn-danger");
      btn.classList.add("btn-primary");
    } else if (action === "REJECT") {
      $("#modalConfirmTitle").textContent = "Confirmar rechazo";
      titleEl.textContent = "¿Rechazar recepción del ticket?";
      bodyEl.textContent = "Todas las cantidades recibidas quedarán en 0 y el ticket se marcará como Rechazado.";
      hintEl.textContent = "Se podrá Reversar (⟲) para restaurar el estado anterior.";
      icEl.textContent = "✕";
      btn.textContent = "Confirmar rechazo";
      btn.classList.add("btn-danger");
      btn.classList.remove("btn-primary");
    } else if (action === "RECEIVE_FULL") {
      $("#modalConfirmTitle").textContent = "Confirmar aceptación total";
      titleEl.textContent = "¿Aceptar recepción total del ticket?";
      bodyEl.textContent = "Las cantidades recibidas se copiarán desde Enviado por línea y el ticket quedará Aceptado.";
      hintEl.textContent = "Se podrá Reversar (⟲) para restaurar el estado anterior.";
      icEl.textContent = "✓";
      btn.textContent = "Confirmar aceptación";
      btn.classList.remove("btn-danger");
      btn.classList.add("btn-primary");
    } else {
      return;
    }

    openModal("modalConfirm");
  }

  function confirmApply() {
    const action = STATE.confirm.action;
    const id = STATE.confirm.transfer_id;
    const t = findTransfer(id);
    if (!t) return;

    const note = ($("#confirmReason").value || "").trim();

    try {
      if (action === "SEND") workflowSend(t, note);
      else if (action === "REJECT") workflowReject(t, note);
      else if (action === "RECEIVE_FULL") workflowReceiveFull(t, note);
    } catch (e) {
      alert(String(e?.message || e));
      return;
    }

    closeModal("modalConfirm");
    renderTable();
  }

  // -----------------------------
  // Receive modal (partial)
  // -----------------------------
  function openReceiveModal(transfer_id) {
    const t = findTransfer(transfer_id);
    if (!t) return;
    if (!canReceive(t)) return;

    STATE.receiving.transfer_id = transfer_id;

    $("#modalReceiveSub").textContent = `${t.transfer_code} • Enviado: ${t.sent_at ? fmtDateTime(t.sent_at) : "—"}`;
    $("#receiveNote").value = "";

    const tbody = $("#receiveLinesBody");
    tbody.innerHTML = (t.lines || [])
      .map((ln) => {
        const sent = Number(ln.qty_sent || 0);
        const current = Number(ln.qty_received || 0);

        return `
          <tr data-rcv-row="${ln.line_id}">
            <td>
              <div class="row-main">${escapeHtml(ln.variant_label)}</div>
              <div class="row-sub muted">${escapeHtml(ln.product_label)}</div>
            </td>
            <td class="right">${escapeHtml(fmtUnits(sent))}</td>
            <td class="right">
              <input type="number" min="0" step="1" max="${escapeHtml(sent)}"
                     data-rcv="qty_received" data-line="${ln.line_id}" value="${escapeHtml(current)}" />
            </td>
          </tr>
        `;
      })
      .join("");

    // clamp inputs
    $$("[data-rcv='qty_received']", tbody).forEach((inp) => {
      inp.addEventListener("input", () => {
        const lineId = Number(inp.getAttribute("data-line"));
        const ln = (t.lines || []).find((x) => Number(x.line_id) === lineId);
        if (!ln) return;
        const sent = Number(ln.qty_sent || 0);
        let v = Number(inp.value || 0);
        if (v < 0) v = 0;
        if (v > sent) v = sent;
        inp.value = String(v);
      });
    });

    $("#receiveHint").textContent = "Define cantidad recibida por línea. Confirmar calculará estado: Aceptado / Parcial / Rechazado.";

    openModal("modalReceive");
  }

  function receiveFillAll() {
    const id = STATE.receiving.transfer_id;
    const t = findTransfer(id);
    if (!t) return;

    const tbody = $("#receiveLinesBody");
    $$("[data-rcv='qty_received']", tbody).forEach((inp) => {
      const lineId = Number(inp.getAttribute("data-line"));
      const ln = (t.lines || []).find((x) => Number(x.line_id) === lineId);
      if (!ln) return;
      const sent = Number(ln.qty_sent || 0);
      inp.value = String(sent);
    });
  }

  function receiveConfirm() {
    const id = STATE.receiving.transfer_id;
    const t = findTransfer(id);
    if (!t) return;

    const tbody = $("#receiveLinesBody");
    const map = new Map();

    $$("[data-rcv='qty_received']", tbody).forEach((inp) => {
      const lineId = Number(inp.getAttribute("data-line"));
      const v = Number(inp.value || 0);
      map.set(lineId, v);
    });

    const note = ($("#receiveNote").value || "").trim();

    try {
      workflowReceivePartial(t, map, note);
    } catch (e) {
      alert(String(e?.message || e));
      return;
    }

    closeModal("modalReceive");
    renderTable();
  }

  // -----------------------------
  // New ticket
  // -----------------------------
  function createNewTicket() {
    const id = nextTransferId();
    const code = generateTransferCode(id);

    const stInit = getStatusByCode(WORKFLOW.initial_status_code);
    const reason = (STATE.db.transfer_reasons || [])[0];
    const whs = STATE.db.warehouses || [];
    const users = STATE.db.users || [];
    const cc = (STATE.db.cost_centers || [])[0];

    const src = whs[0];
    const dst = whs[1] || whs[0];
    const reqBy = users.find((u) => Number(u.id) === CURRENT_USER_ID) || users[0];

    const firstVariant = (STATE.db.product_variants || []).find((v) => v.is_active !== false);

    const t = reComputeDerived({
      id,
      transfer_id: id,
      transfer_code: code,
      transfer_date: fmtDateInput(nowIso()) + "T00:00:00Z",
      status_id: stInit ? stInit.id : (STATE.db.transfer_statuses || [])[0]?.id,
      reason_id: reason ? reason.id : (STATE.db.transfer_reasons || [])[0]?.id,
      cost_center_id: cc ? cc.id : null,
      source_warehouse_id: src ? src.id : null,
      target_warehouse_id: dst ? dst.id : null,
      requested_by_user_id: reqBy ? reqBy.id : null,
      sent_by_user_id: null,
      sent_at: null,
      received_by_user_id: null,
      received_at: null,
      reference_type: "MANUAL",
      reference_code: "",
      notes: "",
      is_urgent: false,
      lines: firstVariant
        ? [
            {
              id: nextLineId(),
              line_id: nextLineId(),
              transfer_id: id,
              product_variant_id: firstVariant.id,
              qty_requested: 1,
              qty_sent: 1,
              qty_received: 0,
              lot_code: "",
              line_notes: "",
            },
          ]
        : [],
      messages: [],
      _history: [],
      _search: "",
    });

    addMessage(t, "Ticket creado (borrador).", "HEADER", null, "AUDIT");

    STATE.transfers.unshift(t);
    renderTable();
    openEditModal(id, "new");
  }

  // -----------------------------
  // Table actions router
  // -----------------------------
  function bindTableActions() {
    const tableBody = $("#tableBody");
    const pagination = $("#pagination");

    if (tableBody) {
      tableBody.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const action = btn.getAttribute("data-action");
        const id = Number(btn.getAttribute("data-id"));
        const t = findTransfer(id);
        if (!t) return;

        if (action === "view") openViewModal(id);
        else if (action === "edit") openEditModal(id, "edit");
        else if (action === "send") openConfirm("SEND", id);
        else if (action === "reject") openConfirm("REJECT", id);
        else if (action === "receive_full") openConfirm("RECEIVE_FULL", id);
        else if (action === "receive_partial") openReceiveModal(id);
        else if (action === "reverse") {
          const note = ""; // opcional: podría pedirse en confirm
          workflowReverse(t, note);
          renderTable();
        }
      });
    }

    if (pagination) {
      pagination.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-page]");
        if (!btn) return;
        const p = Number(btn.getAttribute("data-page"));
        if (!Number.isFinite(p)) return;
        STATE.page = p;
        renderTable();
      });
    }
  }

  // -----------------------------
  // Filters bindings
  // -----------------------------
  function bindFilters() {
    const apply = debounce(() => {
      STATE.page = 1;
      renderTable();
    }, 120);

    const filterTerm = $("#filterTerm");
    const filterDateFrom = $("#filterDateFrom");
    const filterDateTo = $("#filterDateTo");
    const filterStatus = $("#filterStatus");
    const filterReason = $("#filterReason");
    const filterSourceWh = $("#filterSourceWh");
    const filterTargetWh = $("#filterTargetWh");
    const filterCostCenter = $("#filterCostCenter");
    const toggleUrgent = $("#toggleUrgent");
    const toggleDiff = $("#toggleDiff");
    const toggleRejected = $("#toggleRejected");
    const togglePartial = $("#togglePartial");
    const btnClearFilters = $("#btnClearFilters");
    const sortBy = $("#sortBy");
    const pageSize = $("#pageSize");

    if (filterTerm) {
      filterTerm.addEventListener("input", () => {
        STATE.filters.term = filterTerm.value || "";
        apply();
      });
    }

    if (filterDateFrom) {
      filterDateFrom.addEventListener("change", () => {
        STATE.filters.date_from = filterDateFrom.value || "";
        apply();
      });
    }

    if (filterDateTo) {
      filterDateTo.addEventListener("change", () => {
        STATE.filters.date_to = filterDateTo.value || "";
        apply();
      });
    }

    if (filterStatus) {
      filterStatus.addEventListener("change", () => {
        STATE.filters.status_id = filterStatus.value || "";
        apply();
      });
    }

    if (filterReason) {
      filterReason.addEventListener("change", () => {
        STATE.filters.reason_id = filterReason.value || "";
        apply();
      });
    }

    if (filterSourceWh) {
      filterSourceWh.addEventListener("change", () => {
        STATE.filters.source_wh_id = filterSourceWh.value || "";
        apply();
      });
    }

    if (filterTargetWh) {
      filterTargetWh.addEventListener("change", () => {
        STATE.filters.target_wh_id = filterTargetWh.value || "";
        apply();
      });
    }

    if (filterCostCenter) {
      filterCostCenter.addEventListener("change", () => {
        STATE.filters.cost_center_id = filterCostCenter.value || "";
        apply();
      });
    }

    if (toggleUrgent) {
      toggleUrgent.addEventListener("change", () => {
        STATE.filters.urgent_only = !!toggleUrgent.checked;
        apply();
      });
    }

    if (toggleDiff) {
      toggleDiff.addEventListener("change", () => {
        STATE.filters.diff_only = !!toggleDiff.checked;
        apply();
      });
    }

    if (toggleRejected) {
      toggleRejected.addEventListener("change", () => {
        STATE.filters.rejected_only = !!toggleRejected.checked;
        apply();
      });
    }

    if (togglePartial) {
      togglePartial.addEventListener("change", () => {
        STATE.filters.partial_only = !!togglePartial.checked;
        apply();
      });
    }

    if (btnClearFilters) {
      btnClearFilters.addEventListener("click", () => {
        STATE.filters = {
          term: "",
          date_from: "",
          date_to: "",
          status_id: "",
          reason_id: "",
          source_wh_id: "",
          target_wh_id: "",
          cost_center_id: "",
          urgent_only: false,
          diff_only: false,
          rejected_only: false,
          partial_only: false,
        };

        if (filterTerm) filterTerm.value = "";
        if (filterDateFrom) filterDateFrom.value = "";
        if (filterDateTo) filterDateTo.value = "";
        if (filterStatus) filterStatus.value = "";
        if (filterReason) filterReason.value = "";
        if (filterSourceWh) filterSourceWh.value = "";
        if (filterTargetWh) filterTargetWh.value = "";
        if (filterCostCenter) filterCostCenter.value = "";
        if (toggleUrgent) toggleUrgent.checked = false;
        if (toggleDiff) toggleDiff.checked = false;
        if (toggleRejected) toggleRejected.checked = false;
        if (togglePartial) togglePartial.checked = false;

        STATE.page = 1;
        renderTable();
      });
    }

    if (sortBy) {
      sortBy.addEventListener("change", () => {
        STATE.sortBy = sortBy.value;
        STATE.page = 1;
        renderTable();
      });
    }

    if (pageSize) {
      pageSize.addEventListener("change", () => {
        STATE.pageSize = Number(pageSize.value || 10);
        STATE.page = 1;
        renderTable();
      });
    }
  }

  // -----------------------------
  // Modal bindings
  // -----------------------------
  function bindModals() {
    const btnAddLine = $("#btnAddLine");
    const btnSave = $("#btnSave");
    const btnAddMsg = $("#btnAddMsg");
    const btnConfirm = $("#btnConfirm");
    const btnReceiveFillAll = $("#btnReceiveFillAll");
    const btnReceiveConfirm = $("#btnReceiveConfirm");

    if (btnAddLine) btnAddLine.addEventListener("click", addLineToEdit);
    if (btnSave) btnSave.addEventListener("click", saveEditModal);
    if (btnAddMsg) btnAddMsg.addEventListener("click", addMsgFromEdit);
    if (btnConfirm) btnConfirm.addEventListener("click", confirmApply);
    if (btnReceiveFillAll) btnReceiveFillAll.addEventListener("click", receiveFillAll);
    if (btnReceiveConfirm) btnReceiveConfirm.addEventListener("click", receiveConfirm);
  }

  // -----------------------------
  // Header actions
  // -----------------------------
  function bindHeaderActions() {
    const btnNew = $("#btnNew");
    const btnReload = $("#btnReload");

    if (btnNew) {
      btnNew.addEventListener("click", createNewTicket);
    }

    if (btnReload) {
      btnReload.addEventListener("click", async () => {
        try {
          await boot(true);
        } catch (e) {
          alert(String(e?.message || e));
        }
      });
    }
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot(isReload = false) {
    const db = await loadData();

    STATE.db = db;
    buildMaps(db);
    STATE.transfers = normalizeTransfers(db);

    initFilterSelects();

    // render inicial
    if (isReload) {
      STATE.page = 1;
      STATE.sortBy = "date_desc";
      STATE.pageSize = 10;
    }

    renderTable();
  }

  // -----------------------------
  // Wire all + start
  // -----------------------------
  function init() {
    wireModalClose();
    bindTableActions();
    bindFilters();
    bindModals();
    bindHeaderActions();

    boot().catch((e) => {
      console.error(e);
      const tableBody = $('#tableBody');
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="12" style="text-align: center; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3 style="margin: 0 0 12px 0; color: rgba(239,68,68,0.9);">Error al cargar datos</h3>
                <p style="margin: 0 0 16px 0; color: rgba(235,245,255,0.65);">
                  ${escapeHtml(e.message || 'No se pudo cargar el archivo data.json')}
                </p>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 16px; text-align: left; margin-bottom: 16px;">
                  <p style="margin: 0 0 8px 0; font-weight: 750;">Soluciones posibles:</p>
                  <ol style="margin: 0; padding-left: 20px; color: rgba(235,245,255,0.78); line-height: 1.6;">
                    <li>Ejecutar desde un servidor HTTP local:
                      <ul style="margin-top: 6px;">
                        <li><code>python3 -m http.server 8000</code></li>
                        <li><code>php -S localhost:8000</code></li>
                      </ul>
                    </li>
                    <li style="margin-top: 8px;">Verificar que <code>data.json</code> esté en el mismo directorio</li>
                  </ol>
                </div>
                <button onclick="location.reload()" class="btn btn-primary">
                  <span class="btn-ic">⟳</span>
                  Reintentar
                </button>
              </div>
            </td>
          </tr>
        `;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();