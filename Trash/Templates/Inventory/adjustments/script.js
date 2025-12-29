/* script.js */
/* =========================================================
   GestionCom • stock/adjustments (vanilla)
   ---------------------------------------------------------
   Especificación funcional (explícita):
   - Objeto normalizado principal: adjustment
   - Columna de fecha principal: adjustment_date (movement_date)
   - Columna de monto principal (equivalente): net_units (derivado de líneas)
   - Identificador (PK): adjustment_id (movement_id)
   - Catálogos asociados (selects): products, product_variants, warehouses,
     movement_statuses, movement_reasons, cost_centers
   - Workflow: Pendiente/Aprobado/Rechazado
   - Condición estado final: status_label incluye “Aprob” o “Rech”
   - Estado inicial fallback reversa: Pendiente
   ========================================================= */

(function () {
  "use strict";

  // ---------- DOM helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtInt = (n) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(n || 0));
  const fmtUnits = (n) => new Intl.NumberFormat("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n || 0));

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

  const toDateTimeLocal = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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

  // ---------- State ----------
  const STATE = {
    db: null,

    byId: {
      products: new Map(),
      variants: new Map(),
      warehouses: new Map(),
      types: new Map(),
      statuses: new Map(),
      reasons: new Map(),
      costCenters: new Map(),
    },

    // normalized adjustments (movements ADJUST)
    adjustments: [],

    // ui state
    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      direction: "",
      warehouse_id: "",
      cost_center_id: "",
      reason_id: "",
      with_reference: false,
      nonzero_only: true,
      urgent_only: false,
      audit_only: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    confirm: { action: null, movement_id: null },
    editing: { movement_id: null, mode: "edit" }, // edit | new
  };

  // ---------- Business rules ----------
  const WORKFLOW = {
    initial_status_label: "Pendiente",
    finalLabelIncludes: ["aprob", "rech"],
  };

  const ADJUST_TYPE_CODE = "ADJUST";

  const isFinalStatusLabel = (label) => {
    const v = String(label || "").toLowerCase();
    return WORKFLOW.finalLabelIncludes.some((k) => v.includes(k));
  };

  const computeLineSignedUnits = (line) => {
    // Para ajustes: se privilegia quantity_signed; fallback a quantity (positivo)
    const qty = Number(line.quantity ?? 0);
    const signed = Number(line.quantity_signed ?? NaN);
    return Number.isFinite(signed) ? signed : qty;
  };

  const computeLineAbsUnits = (line) => Math.abs(computeLineSignedUnits(line));

  // ---------- Load + init ----------
  async function loadData() {
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

    STATE.byId.products = map(db.products);
    STATE.byId.variants = map(db.product_variants);
    STATE.byId.warehouses = map(db.warehouses);
    STATE.byId.types = map(db.movement_types);
    STATE.byId.statuses = map(db.movement_statuses);
    STATE.byId.reasons = map(db.movement_reasons);
    STATE.byId.costCenters = map(db.cost_centers);
  }

  function getAdjustTypeId() {
    const t = (STATE.db.movement_types || []).find((x) => String(x.type_code) === ADJUST_TYPE_CODE);
    return t ? Number(t.id) : 4;
  }

  function normalizeAdjustments(db) {
    const linesByMovement = new Map();
    (db.stock_movement_lines || []).forEach((ln) => {
      const mid = Number(ln.movement_id);
      if (!linesByMovement.has(mid)) linesByMovement.set(mid, []);
      linesByMovement.get(mid).push(ln);
    });

    const adjustTypeId = getAdjustTypeId();

    const list = (db.stock_movements || [])
      .filter((m) => Number(m.movement_type_id) === adjustTypeId)
      .map((m) => {
        const status = STATE.byId.statuses.get(Number(m.status_id));
        const reason = STATE.byId.reasons.get(Number(m.reason_id));
        const wh = STATE.byId.warehouses.get(Number(m.source_warehouse_id));
        const cc = STATE.byId.costCenters.get(Number(m.cost_center_id));

        const rawLines = linesByMovement.get(Number(m.id)) || [];
        const normLines = rawLines.map((ln) => {
          const v = STATE.byId.variants.get(Number(ln.product_variant_id));
          const p = v ? STATE.byId.products.get(Number(v.product_id)) : null;

          const unitsSigned = computeLineSignedUnits(ln);
          const unitsAbs = computeLineAbsUnits(ln);

          return {
            ...ln,
            variant: v || null,
            product: p || null,
            variant_label: v ? `${v.variant_sku} • ${v.variant_name}` : `Variante #${ln.product_variant_id}`,
            product_label: p ? p.product_name : "—",
            units_signed: unitsSigned,
            units_abs: unitsAbs,
          };
        });

        const totalItems = normLines.length;
        const totalAbs = normLines.reduce((s, ln) => s + Number(ln.units_abs || 0), 0);
        const totalNet = normLines.reduce((s, ln) => s + Number(ln.units_signed || 0), 0);

        const statusLabel = status?.status_label || "—";
        const isFinal = isFinalStatusLabel(statusLabel);

        const lineHaystack = normLines.map((ln) => `${ln.variant_label} ${ln.product_label}`).join(" ").toLowerCase();

        return {
          ...m,
          movement_id: Number(m.id),
          adjustment_id: Number(m.id),
          adjustment_date: m.movement_date,

          status,
          reason,
          warehouse: wh,
          cost_center: cc,
          lines: normLines,

          total_items: totalItems,
          total_units_abs: totalAbs,
          total_units_net: totalNet,

          is_final: isFinal,

          _search: [
            m.movement_code,
            m.reference_code,
            m.reference_type,
            m.notes,
            statusLabel,
            reason?.reason_label,
            cc?.cost_center_name,
            wh?.warehouse_name,
            wh?.warehouse_code,
            lineHaystack,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        };
      });

    list.sort((a, b) => new Date(b.movement_date) - new Date(a.movement_date));
    return list;
  }

  // ---------- UI: selects ----------
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
    const statuses = (STATE.db.movement_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const whs = (STATE.db.warehouses || []).map((w) => ({ id: w.id, label: `${w.warehouse_code} • ${w.warehouse_name}` }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const reasons = (STATE.db.movement_reasons || []).map((r) => ({ id: r.id, label: r.reason_label }));

    fillSelect($("#filterStatus"), statuses, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterWarehouse"), whs, { includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterCostCenter"), ccs, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterReason"), reasons, { includeEmpty: true, emptyLabel: "Todos" });
  }

  function initEditSelects() {
    const statusSel = $("#editStatus");
    const reasonSel = $("#editReason");
    const ccSel = $("#editCostCenter");
    const whSel = $("#editWarehouse");

    const statuses = (STATE.db.movement_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const reasons = (STATE.db.movement_reasons || []).map((r) => ({ id: r.id, label: r.reason_label }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const whs = (STATE.db.warehouses || []).map((w) => ({ id: w.id, label: `${w.warehouse_code} • ${w.warehouse_name}` }));

    fillSelect(statusSel, statuses, { includeEmpty: false });
    fillSelect(reasonSel, reasons, { includeEmpty: false });
    fillSelect(ccSel, [{ id: "", label: "—" }, ...ccs], { includeEmpty: false });
    fillSelect(whSel, whs, { includeEmpty: false });
  }

  // ---------- Filtering + sorting + paging ----------
  function getFiltered() {
    const f = STATE.filters;
    const term = String(f.term || "").trim().toLowerCase();
    const from = f.date_from ? new Date(f.date_from + "T00:00:00") : null;
    const to = f.date_to ? new Date(f.date_to + "T23:59:59") : null;

    return STATE.adjustments.filter((a) => {
      if (term && !a._search.includes(term)) return false;

      if (from) {
        const d = new Date(a.movement_date);
        if (d < from) return false;
      }
      if (to) {
        const d = new Date(a.movement_date);
        if (d > to) return false;
      }

      if (f.status_id && String(a.status_id) !== String(f.status_id)) return false;
      if (f.reason_id && String(a.reason_id) !== String(f.reason_id)) return false;

      if (f.cost_center_id) {
        if (String(a.cost_center_id || "") !== String(f.cost_center_id)) return false;
      }

      if (f.warehouse_id) {
        if (String(a.source_warehouse_id || "") !== String(f.warehouse_id)) return false;
      }

      if (f.with_reference) {
        if (!String(a.reference_code || "").trim()) return false;
      }

      if (f.nonzero_only) {
        if (Number(a.total_units_net || 0) === 0) return false;
      }

      if (f.direction) {
        const net = Number(a.total_units_net || 0);
        if (f.direction === "inc" && !(net > 0)) return false;
        if (f.direction === "dec" && !(net < 0)) return false;
        if (f.direction === "mix" && !(net === 0)) return false;
      }

      if (f.urgent_only && !Boolean(a.is_urgent)) return false;
      if (f.audit_only && !Boolean(a.requires_audit)) return false;

      return true;
    });
  }

  function sortAdjustments(list) {
    const k = STATE.sortBy;

    const byDateAsc = (a, b) => new Date(a.movement_date) - new Date(b.movement_date);
    const byDateDesc = (a, b) => new Date(b.movement_date) - new Date(a.movement_date);

    const byNetAsc = (a, b) => Number(a.total_units_net || 0) - Number(b.total_units_net || 0);
    const byNetDesc = (a, b) => Number(b.total_units_net || 0) - Number(a.total_units_net || 0);

    const byAbsAsc = (a, b) => Number(a.total_units_abs || 0) - Number(b.total_units_abs || 0);
    const byAbsDesc = (a, b) => Number(b.total_units_abs || 0) - Number(a.total_units_abs || 0);

    const copy = list.slice();
    switch (k) {
      case "date_asc": copy.sort(byDateAsc); break;
      case "date_desc": copy.sort(byDateDesc); break;
      case "net_asc": copy.sort(byNetAsc); break;
      case "net_desc": copy.sort(byNetDesc); break;
      case "abs_asc": copy.sort(byAbsAsc); break;
      case "abs_desc": copy.sort(byAbsDesc); break;
      default: copy.sort(byDateDesc); break;
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

  // ---------- KPIs ----------
  function renderKpis(filtered) {
    const total = filtered.length;
    const pending = filtered.filter((m) => !m.is_final).length;
    const approved = filtered.filter((m) => String(m.status?.status_label || "").toLowerCase().includes("aprob")).length;
    const rejected = filtered.filter((m) => String(m.status?.status_label || "").toLowerCase().includes("rech")).length;

    const net = filtered.reduce((s, m) => s + Number(m.total_units_net || 0), 0);
    const abs = filtered.reduce((s, m) => s + Number(m.total_units_abs || 0), 0);

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiPending").textContent = fmtInt(pending);
    $("#kpiApproved").textContent = fmtInt(approved);
    $("#kpiRejected").textContent = fmtInt(rejected);
    $("#kpiNetUnits").textContent = fmtUnits(net);
    $("#kpiAbsUnits").textContent = `Unidades ajustadas (abs): ${fmtUnits(abs)}`;
  }

  // ---------- Table rendering ----------
  function statusBadge(statusLabel) {
    const v = String(statusLabel || "").toLowerCase();
    if (v.includes("aprob")) return { cls: "ok", label: statusLabel };
    if (v.includes("rech")) return { cls: "bad", label: statusLabel };
    return { cls: "warn", label: statusLabel || "Pendiente" };
  }

  function directionChip(net) {
    const n = Number(net || 0);
    if (n > 0) return `<span class="chip positive">＋ Incremento</span>`;
    if (n < 0) return `<span class="chip negative">－ Decremento</span>`;
    return `<span class="chip neutral">≡ Mixto</span>`;
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

  function renderTable() {
    const filtered = sortAdjustments(getFiltered());
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
      .map((m) => {
        const st = statusBadge(m.status?.status_label);
        const wh = m.warehouse ? `${m.warehouse.warehouse_code} • ${m.warehouse.warehouse_name}` : "—";
        const reason = m.reason?.reason_label || "—";
        const cc = m.cost_center ? `${m.cost_center.cost_center_code} • ${m.cost_center.cost_center_name}` : "—";

        const isFinal = Boolean(m.is_final);

        // Reglas UI:
        // - Editar solo si NO finalizado
        // - Reversar visible en finalizados
        const editBtn = !isFinal
          ? `<button class="icon-btn edit" data-act="edit" data-id="${m.movement_id}" title="Editar">✎</button>`
          : "";

        const approveBtn = isFinal
          ? `<button class="icon-btn approve" disabled title="Aprobar (bloqueado)">✓</button>`
          : `<button class="icon-btn approve" data-act="approve" data-id="${m.movement_id}" title="Aprobar">✓</button>`;

        const rejectBtn = isFinal
          ? `<button class="icon-btn reject" disabled title="Rechazar (bloqueado)">✕</button>`
          : `<button class="icon-btn reject" data-act="reject" data-id="${m.movement_id}" title="Rechazar">✕</button>`;

        const reverseBtn = isFinal
          ? `<button class="icon-btn reverse" data-act="reverse" data-id="${m.movement_id}" title="Reversar">⟲</button>`
          : "";

        const ref = String(m.reference_code || "").trim()
          ? `<div class="row-sub"><span class="mono">${escapeHtml(m.reference_code)}</span></div>`
          : "";

        const flags = [
          m.is_urgent ? `<span class="badge warn"><span class="dot"></span>Urgente</span>` : "",
          m.requires_audit ? `<span class="badge info"><span class="dot"></span>Auditoría</span>` : "",
        ].filter(Boolean).join(" ");

        return `
          <tr>
            <td>
              <div class="small">${escapeHtml(fmtDateShort(m.movement_date))}</div>
              <div class="row-sub">${escapeHtml(fmtDateTime(m.movement_date))}</div>
            </td>

            <td>
              <div class="mono">${escapeHtml(m.movement_code || "—")}</div>
              ${ref}
            </td>

            <td>
              <span class="badge ${st.cls}"><span class="dot"></span>${escapeHtml(st.label)}</span>
              ${flags ? `<div class="row-sub">${flags}</div>` : ""}
            </td>

            <td>${escapeHtml(wh)}<div class="row-sub">${directionChip(m.total_units_net)}</div></td>
            <td>${escapeHtml(cc)}</td>
            <td>${escapeHtml(reason)}</td>

            <td class="right">${escapeHtml(fmtInt(m.total_items || 0))}</td>
            <td class="right"><strong>${escapeHtml(fmtUnits(m.total_units_net || 0))}</strong></td>
            <td class="right">${escapeHtml(fmtUnits(m.total_units_abs || 0))}</td>

            <td class="center">
              <div class="actions">
                <button class="icon-btn view" data-act="view" data-id="${m.movement_id}" title="Ver">👁</button>
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

  // ---------- Modal utilities ----------
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

  // ---------- Get / update ----------
  function findAdjustment(id) {
    return STATE.adjustments.find((m) => Number(m.movement_id) === Number(id)) || null;
  }

  function getInitialStatusId() {
    const s = (STATE.db.movement_statuses || []).find((x) => String(x.status_label) === WORKFLOW.initial_status_label);
    return s ? Number(s.id) : Number((STATE.db.movement_statuses || [])[0]?.id || 1);
  }

  function regenerateDerivedFields(m) {
    const status = STATE.byId.statuses.get(Number(m.status_id));
    const reason = STATE.byId.reasons.get(Number(m.reason_id));
    const wh = STATE.byId.warehouses.get(Number(m.source_warehouse_id));
    const cc = STATE.byId.costCenters.get(Number(m.cost_center_id));

    const normLines = (m.lines || []).map((ln) => {
      const v = STATE.byId.variants.get(Number(ln.product_variant_id));
      const p = v ? STATE.byId.products.get(Number(v.product_id)) : null;

      const unitsSigned = computeLineSignedUnits(ln);
      const unitsAbs = computeLineAbsUnits(ln);

      return {
        ...ln,
        variant: v || null,
        product: p || null,
        variant_label: v ? `${v.variant_sku} • ${v.variant_name}` : `Variante #${ln.product_variant_id}`,
        product_label: p ? p.product_name : "—",
        units_signed: unitsSigned,
        units_abs: unitsAbs,
      };
    });

    m.status = status || null;
    m.reason = reason || null;
    m.warehouse = wh || null;
    m.cost_center = cc || null;

    m.total_items = normLines.length;
    m.total_units_abs = normLines.reduce((s, ln) => s + Number(ln.units_abs || 0), 0);
    m.total_units_net = normLines.reduce((s, ln) => s + Number(ln.units_signed || 0), 0);

    m.is_final = isFinalStatusLabel(status?.status_label || "");

    m._search = [
      m.movement_code,
      m.reference_code,
      m.reference_type,
      m.notes,
      status?.status_label,
      reason?.reason_label,
      cc?.cost_center_name,
      wh?.warehouse_name,
      wh?.warehouse_code,
      normLines.map((ln) => `${ln.variant_label} ${ln.product_label}`).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    m.lines = normLines;
  }

  // ---------- View ----------
  function openView(movement_id) {
    const m = findAdjustment(movement_id);
    if (!m) return;

    $("#modalViewSubtitle").textContent = `${m.movement_code || "—"} • ${fmtDateTime(m.movement_date)}`;

    $("#viewCode").value = m.movement_code || "—";
    $("#viewDate").value = fmtDateTime(m.movement_date);
    $("#viewStatus").value = m.status?.status_label || "—";
    $("#viewReason").value = m.reason?.reason_label || "—";
    $("#viewCostCenter").value = m.cost_center ? `${m.cost_center.cost_center_code} • ${m.cost_center.cost_center_name}` : "—";
    $("#viewWarehouse").value = m.warehouse ? `${m.warehouse.warehouse_code} • ${m.warehouse.warehouse_name}` : "—";
    $("#viewRefType").value = m.reference_type || "—";
    $("#viewRefCode").value = m.reference_code || "—";
    $("#viewNotes").value = m.notes || "";

    $("#viewUrgent").textContent = `Urgente: ${m.is_urgent ? "Sí" : "No"}`;
    $("#viewAudit").textContent = `Auditoría: ${m.requires_audit ? "Sí" : "No"}`;

    $("#viewLinesBody").innerHTML = (m.lines || [])
      .map((ln) => {
        const exp = ln.expiry_date ? String(ln.expiry_date) : "—";
        const lot = ln.lot_code ? String(ln.lot_code) : "—";
        return `
          <tr>
            <td>${escapeHtml(ln.variant_label || "—")}</td>
            <td class="right"><strong>${escapeHtml(fmtUnits(ln.units_signed || 0))}</strong></td>
            <td>${escapeHtml(lot)}</td>
            <td>${escapeHtml(exp)}</td>
          </tr>
        `;
      })
      .join("");

    $("#viewMeta").textContent = `Ítems: ${fmtInt(m.total_items)} • Neto: ${fmtUnits(m.total_units_net)} • Abs: ${fmtUnits(m.total_units_abs)}`;
    openModal("modalView");
  }

  // ---------- Edit (CRUD en memoria) ----------
  function lineRowTemplate(line, idx) {
    const variants = (STATE.db.product_variants || []).map((v) => {
      const p = STATE.byId.products.get(Number(v.product_id));
      return {
        id: v.id,
        label: `${v.variant_sku} • ${v.variant_name}${p ? ` — ${p.product_name}` : ""}`,
      };
    });

    const options = variants
      .map((v) => {
        const sel = String(v.id) === String(line.product_variant_id) ? "selected" : "";
        return `<option value="${escapeHtml(v.id)}" ${sel}>${escapeHtml(v.label)}</option>`;
      })
      .join("");

    const signedVal = Number.isFinite(Number(line.quantity_signed)) ? Number(line.quantity_signed) : 0;

    return `
      <tr data-line-index="${idx}">
        <td>
          <select class="ln-variant">
            <option value="">Seleccionar…</option>
            ${options}
          </select>
        </td>

        <td class="right">
          <input class="ln-qty right" type="number" step="0.01" value="${escapeHtml(signedVal)}" />
          <div class="row-sub muted">Permite negativo (ADJUST)</div>
        </td>

        <td><input class="ln-lot" type="text" placeholder="Ej: LOTE-01" value="${escapeHtml(line.lot_code || "")}" /></td>
        <td><input class="ln-exp" type="date" value="${escapeHtml(line.expiry_date || "")}" /></td>

        <td class="center">
          <button type="button" class="icon-btn reject" data-act="removeLine" title="Quitar">🗑</button>
        </td>
      </tr>
    `;
  }

  function renderEditLines(lines) {
    $("#linesBody").innerHTML = (lines || []).map((ln, idx) => lineRowTemplate(ln, idx)).join("");
  }

  function readEditLines() {
    const rows = $$("#linesBody tr");
    return rows.map((tr, i) => {
      const variantId = $(".ln-variant", tr).value;
      const qtyRaw = $(".ln-qty", tr).value;
      const lot = $(".ln-lot", tr).value;
      const exp = $(".ln-exp", tr).value;

      const signed = Number(qtyRaw);
      return {
        id: 100000 + i,
        movement_id: STATE.editing.movement_id,
        product_variant_id: variantId ? Number(variantId) : null,
        quantity: Number.isFinite(signed) ? Math.abs(signed) : 0,
        quantity_signed: Number.isFinite(signed) ? signed : 0,
        lot_code: String(lot || "").trim() || null,
        expiry_date: exp ? String(exp) : null,
      };
    });
  }

  function validateDraft(draft) {
    const errors = [];

    if (!String(draft.movement_date || "").trim()) errors.push("La fecha del ajuste es obligatoria.");
    if (!draft.status_id) errors.push("El estado es obligatorio.");
    if (!draft.reason_id) errors.push("El motivo es obligatorio.");
    if (!draft.source_warehouse_id) errors.push("La bodega es obligatoria.");

    const lines = draft.lines || [];
    if (!lines.length) errors.push("Debe existir al menos 1 línea.");

    lines.forEach((ln, idx) => {
      if (!ln.product_variant_id) errors.push(`Línea ${idx + 1}: la variante es obligatoria.`);
      const signed = Number(ln.quantity_signed);
      if (!Number.isFinite(signed) || signed === 0) errors.push(`Línea ${idx + 1}: unidades deben ser un número distinto de 0.`);
    });

    // Regla extra (auditoría): referencia + notas mínimas
    if (Boolean(draft.requires_audit)) {
      if (!String(draft.reference_code || "").trim()) errors.push("Auditoría: el código de referencia es obligatorio.");
      if (String(draft.notes || "").trim().length < 10) errors.push("Auditoría: las notas deben tener al menos 10 caracteres.");
    }

    return errors;
  }

  function openEdit(mode, movement_id) {
    STATE.editing.mode = mode;
    STATE.editing.movement_id = movement_id ? Number(movement_id) : null;

    $("#editErrors").classList.add("hidden");
    $("#editErrors").innerHTML = "";

    initEditSelects();

    if (mode === "new") {
      const now = new Date();
      const adjustTypeId = getAdjustTypeId();
      const initStatusId = getInitialStatusId();

      const next = {
        id: nextId(),
        movement_id: null,
        movement_code: generateAdjustmentCode(),
        movement_date: now.toISOString(),
        movement_type_id: adjustTypeId,
        status_id: initStatusId,
        reason_id: Number((STATE.db.movement_reasons || [])[0]?.id || 1),
        cost_center_id: "",
        source_warehouse_id: Number((STATE.db.warehouses || [])[0]?.id || 1),
        target_warehouse_id: null,
        reference_type: "",
        reference_code: "",
        notes: "",
        is_urgent: false,
        requires_audit: false,
        previous_status_id: null,
        created_by: "demo.user",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        lines: [
          { id: 100001, product_variant_id: null, quantity: 0, quantity_signed: 1, lot_code: null, expiry_date: null },
        ],
      };

      STATE.editing.movement_id = next.id;

      $("#modalEditTitle").textContent = "Nuevo ajuste";
      $("#modalEditSubtitle").textContent = "Creación en memoria (demo)";

      $("#editCode").value = next.movement_code;
      $("#editDate").value = toDateTimeLocal(next.movement_date);

      $("#editStatus").value = String(next.status_id);
      $("#editReason").value = String(next.reason_id);
      $("#editCostCenter").value = String(next.cost_center_id || "");
      $("#editWarehouse").value = String(next.source_warehouse_id);

      $("#editRefType").value = next.reference_type || "";
      $("#editRefCode").value = next.reference_code || "";
      $("#editNotes").value = next.notes || "";
      $("#editUrgent").checked = Boolean(next.is_urgent);
      $("#editAudit").checked = Boolean(next.requires_audit);

      renderEditLines(next.lines);
      $("#editMeta").textContent = `ID: (nuevo) • Estado: Pendiente • Tipo: ADJUST`;

      openModal("modalEdit");
      return;
    }

    const m = findAdjustment(movement_id);
    if (!m) return;

    $("#modalEditTitle").textContent = "Editar ajuste";
    $("#modalEditSubtitle").textContent = `${m.movement_code || "—"} • ${fmtDateTime(m.movement_date)}`;

    $("#editCode").value = m.movement_code || "";
    $("#editDate").value = toDateTimeLocal(m.movement_date);

    $("#editStatus").value = String(m.status_id);
    $("#editReason").value = String(m.reason_id);
    $("#editCostCenter").value = String(m.cost_center_id || "");
    $("#editWarehouse").value = String(m.source_warehouse_id || "");

    $("#editRefType").value = m.reference_type || "";
    $("#editRefCode").value = m.reference_code || "";
    $("#editNotes").value = m.notes || "";
    $("#editUrgent").checked = Boolean(m.is_urgent);
    $("#editAudit").checked = Boolean(m.requires_audit);

    renderEditLines((m.lines || []).map((x) => ({
      ...x,
      quantity_signed: Number.isFinite(Number(x.quantity_signed)) ? Number(x.quantity_signed) : (Number(x.units_signed) || 0)
    })));

    $("#editMeta").textContent = `ID: ${m.movement_id} • Neto: ${fmtUnits(m.total_units_net)} • Abs: ${fmtUnits(m.total_units_abs)}`;

    openModal("modalEdit");
  }

  function saveEdit() {
    const id = Number(STATE.editing.movement_id);
    const mode = STATE.editing.mode;

    const adjustTypeId = getAdjustTypeId();

    const draft = {
      id,
      movement_id: id,
      movement_code: String($("#editCode").value || "").trim() || generateAdjustmentCode(),
      movement_date: $("#editDate").value ? new Date($("#editDate").value).toISOString() : "",
      movement_type_id: adjustTypeId,

      status_id: Number($("#editStatus").value || 0),
      reason_id: Number($("#editReason").value || 0),
      cost_center_id: $("#editCostCenter").value ? Number($("#editCostCenter").value) : "",

      source_warehouse_id: Number($("#editWarehouse").value || 0),
      target_warehouse_id: null,

      reference_type: String($("#editRefType").value || "").trim() || null,
      reference_code: String($("#editRefCode").value || "").trim() || null,
      notes: String($("#editNotes").value || "").trim() || null,

      is_urgent: Boolean($("#editUrgent").checked),
      requires_audit: Boolean($("#editAudit").checked),

      previous_status_id: null,

      lines: readEditLines(),
    };

    const errs = validateDraft(draft);
    const box = $("#editErrors");
    if (errs.length) {
      box.innerHTML = `• ${errs.map(escapeHtml).join("<br/>• ")}`;
      box.classList.remove("hidden");
      return;
    }
    box.classList.add("hidden");
    box.innerHTML = "";

    if (mode === "new") {
      const now = new Date().toISOString();
      const obj = {
        ...draft,
        status_id: draft.status_id || getInitialStatusId(),
        created_by: "demo.user",
        created_at: now,
        updated_at: now,
      };

      obj.lines = draft.lines.map((ln, i) => ({
        ...ln,
        id: obj.id * 100 + i + 1,
        movement_id: obj.id,
      }));

      regenerateDerivedFields(obj);
      STATE.adjustments.unshift(obj);
    } else {
      const m = findAdjustment(id);
      if (!m) return;

      // Regla: si está finalizado, bloquear edición (doble seguridad)
      if (m.is_final) {
        closeModal("modalEdit");
        renderTable();
        return;
      }

      m.movement_code = draft.movement_code;
      m.movement_date = draft.movement_date;
      m.status_id = draft.status_id;
      m.reason_id = draft.reason_id;
      m.cost_center_id = draft.cost_center_id;
      m.source_warehouse_id = draft.source_warehouse_id;

      m.reference_type = draft.reference_type;
      m.reference_code = draft.reference_code;
      m.notes = draft.notes;

      m.is_urgent = draft.is_urgent;
      m.requires_audit = draft.requires_audit;

      m.lines = draft.lines.map((ln, i) => ({
        ...ln,
        id: m.movement_id * 100 + i + 1,
        movement_id: m.movement_id,
      }));

      m.updated_at = new Date().toISOString();
      regenerateDerivedFields(m);
    }

    closeModal("modalEdit");
    renderTable();
  }

  function nextId() {
    const max = STATE.adjustments.reduce((mx, m) => Math.max(mx, Number(m.movement_id || 0)), 0);
    return max + 1;
  }

  function generateAdjustmentCode() {
    const stamp = new Date();
    const yy = String(stamp.getFullYear()).slice(2);
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");
    const rnd = Math.floor(100 + Math.random() * 900);
    return `ADJ-${yy}${mm}${dd}-${rnd}`;
  }

  // ---------- Workflow: approve / reject / reverse ----------
  function openConfirm(action, movement_id) {
    const m = findAdjustment(movement_id);
    if (!m) return;

    const a = String(action || "");
    STATE.confirm.action = a;
    STATE.confirm.movement_id = Number(movement_id);

    const title = a === "approve" ? "Aprobar ajuste" : "Rechazar ajuste";
    const icon = a === "approve" ? "✓" : "✕";
    const iconBg = a === "approve" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)";

    $("#modalConfirmTitle").textContent = title;
    $("#modalConfirmSubtitle").textContent = `${m.movement_code || "—"} • ${fmtDateTime(m.movement_date)}`;
    $("#confirmIcon").textContent = icon;
    $("#confirmIcon").style.background = iconBg;

    $("#confirmMsg").textContent =
      a === "approve"
        ? "¿Confirmas la aprobación del ajuste?"
        : "¿Confirmas el rechazo del ajuste?";

    $("#confirmSub").textContent = `Acción irreversible hasta ejecutar “Reversar (⟲)”.`;
    $("#confirmMeta").textContent = `Ítems: ${fmtInt(m.total_items)} • Neto: ${fmtUnits(m.total_units_net)} • Abs: ${fmtUnits(m.total_units_abs)}`;

    const btn = $("#btnConfirmAction");
    btn.textContent = a === "approve" ? "Confirmar aprobación" : "Confirmar rechazo";
    btn.classList.toggle("btn-danger", a !== "approve");
    btn.classList.toggle("btn-primary", a === "approve");

    openModal("modalConfirm");
  }

  function applyWorkflowAction() {
    const action = STATE.confirm.action;
    const id = STATE.confirm.movement_id;

    const m = findAdjustment(id);
    if (!m) return;

    // regla: si ya finalizado, no re-aplicar
    if (m.is_final) {
      closeModal("modalConfirm");
      return;
    }

    // Validación previa a aprobar/rechazar
    const draft = {
      ...m,
      lines: (m.lines || []).map((ln) => ({
        ...ln,
        product_variant_id: ln.product_variant_id,
        quantity_signed: Number.isFinite(Number(ln.quantity_signed)) ? Number(ln.quantity_signed) : Number(ln.units_signed || 0),
        quantity: Number(ln.quantity || Math.abs(Number(ln.units_signed || 0))),
      })),
    };
    const errs = validateDraft(draft);
    if (errs.length) {
      $("#confirmMsg").textContent = "No es posible ejecutar la acción por validación.";
      $("#confirmSub").innerHTML = `• ${errs.map(escapeHtml).join("<br/>• ")}`;
      $("#btnConfirmAction").disabled = true;
      setTimeout(() => { $("#btnConfirmAction").disabled = false; }, 800);
      return;
    }

    const approved = (STATE.db.movement_statuses || []).find((s) => String(s.status_label).toLowerCase().includes("aprob"));
    const rejected = (STATE.db.movement_statuses || []).find((s) => String(s.status_label).toLowerCase().includes("rech"));
    const nextStatusId = action === "approve" ? Number(approved?.id) : Number(rejected?.id);

    // persistir estado anterior para reversa
    m.previous_status_id = Number(m.status_id);
    m.status_id = nextStatusId;

    const now = new Date().toISOString();
    m.updated_at = now;
    if (action === "approve") m.approved_at = now;
    if (action === "reject") m.rejected_at = now;

    regenerateDerivedFields(m);
    closeModal("modalConfirm");
    renderTable();
  }

  function reverseAdjustment(movement_id) {
    const m = findAdjustment(movement_id);
    if (!m) return;

    // regla: reversa solo cuando está finalizado
    if (!m.is_final) return;

    const fallback = getInitialStatusId();
    const prev = Number(m.previous_status_id || 0);

    m.status_id = prev ? prev : fallback;
    m.previous_status_id = null;
    m.updated_at = new Date().toISOString();

    regenerateDerivedFields(m);
    renderTable();
  }

  // ---------- Events wiring ----------
  function bindEvents() {
    // global close (backdrop + [data-close])
    document.addEventListener("click", (e) => {
      const closeId = e.target?.getAttribute?.("data-close");
      if (closeId) closeModal(closeId);
    });

    // ESC closes modals
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      ["modalConfirm", "modalEdit", "modalView"].forEach((id) => {
        const m = $("#" + id);
        if (m && !m.classList.contains("hidden")) closeModal(id);
      });
    });

    const apply = debounce(() => {
      STATE.page = 1;
      renderTable();
    }, 160);

    // Filters
    $("#filterTerm").addEventListener("input", (e) => { STATE.filters.term = e.target.value; apply(); });
    $("#filterDateFrom").addEventListener("change", (e) => { STATE.filters.date_from = e.target.value; apply(); });
    $("#filterDateTo").addEventListener("change", (e) => { STATE.filters.date_to = e.target.value; apply(); });
    $("#filterStatus").addEventListener("change", (e) => { STATE.filters.status_id = e.target.value; apply(); });
    $("#filterDirection").addEventListener("change", (e) => { STATE.filters.direction = e.target.value; apply(); });
    $("#filterWarehouse").addEventListener("change", (e) => { STATE.filters.warehouse_id = e.target.value; apply(); });
    $("#filterCostCenter").addEventListener("change", (e) => { STATE.filters.cost_center_id = e.target.value; apply(); });
    $("#filterReason").addEventListener("change", (e) => { STATE.filters.reason_id = e.target.value; apply(); });

    $("#toggleWithReference").addEventListener("change", (e) => { STATE.filters.with_reference = e.target.checked; apply(); });
    $("#toggleNonZero").addEventListener("change", (e) => { STATE.filters.nonzero_only = e.target.checked; apply(); });
    $("#toggleUrgent").addEventListener("change", (e) => { STATE.filters.urgent_only = e.target.checked; apply(); });
    $("#toggleAudit").addEventListener("change", (e) => { STATE.filters.audit_only = e.target.checked; apply(); });

    $("#btnClearFilters").addEventListener("click", () => {
      STATE.filters = {
        term: "",
        date_from: "",
        date_to: "",
        status_id: "",
        direction: "",
        warehouse_id: "",
        cost_center_id: "",
        reason_id: "",
        with_reference: false,
        nonzero_only: true,
        urgent_only: false,
        audit_only: false,
      };

      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterDirection").value = "";
      $("#filterWarehouse").value = "";
      $("#filterCostCenter").value = "";
      $("#filterReason").value = "";
      $("#toggleWithReference").checked = false;
      $("#toggleNonZero").checked = true;
      $("#toggleUrgent").checked = false;
      $("#toggleAudit").checked = false;

      STATE.page = 1;
      renderTable();
    });

    // sorting + page size
    $("#sortBy").addEventListener("change", (e) => { STATE.sortBy = e.target.value; renderTable(); });
    $("#pageSize").addEventListener("change", (e) => { STATE.pageSize = Number(e.target.value); STATE.page = 1; renderTable(); });

    // pagination clicks
    $("#pagination").addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-page]");
      if (!btn) return;
      const page = Number(btn.getAttribute("data-page"));
      if (!Number.isFinite(page)) return;
      STATE.page = page;
      renderTable();
    });

    // main actions
    $("#tableBody").addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-act]");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      const id = Number(btn.getAttribute("data-id"));

      if (act === "view") return openView(id);
      if (act === "edit") return openEdit("edit", id);
      if (act === "approve") return openConfirm("approve", id);
      if (act === "reject") return openConfirm("reject", id);
      if (act === "reverse") return reverseAdjustment(id);
    });

    // confirm
    $("#btnConfirmAction").addEventListener("click", applyWorkflowAction);

    // new + reload
    $("#btnNew").addEventListener("click", () => openEdit("new", null));
    $("#btnReload").addEventListener("click", async () => {
      await init(); // recarga completa
    });

    // edit modal: add/remove line + save
    $("#btnAddLine").addEventListener("click", () => {
      const curr = readEditLines();
      curr.push({ id: 100000 + curr.length + 1, product_variant_id: null, quantity: 0, quantity_signed: 1, lot_code: null, expiry_date: null });
      renderEditLines(curr);
    });

    $("#linesBody").addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-act='removeLine']");
      if (!btn) return;
      const tr = e.target.closest("tr");
      const idx = Number(tr?.getAttribute("data-line-index"));
      const curr = readEditLines();
      if (Number.isFinite(idx)) curr.splice(idx, 1);
      renderEditLines(curr.length ? curr : [{ id: 100001, product_variant_id: null, quantity: 0, quantity_signed: 1, lot_code: null, expiry_date: null }]);
    });

    $("#btnSave").addEventListener("click", saveEdit);

    // UX: enter no submit
    $("#editForm").addEventListener("submit", (e) => e.preventDefault());
  }

  // ---------- Init ----------
  async function init() {
    try {
      const db = await loadData();
      STATE.db = db;

      buildMaps(db);
      initFilterSelects();

      STATE.adjustments = normalizeAdjustments(db);

      // defaults
      STATE.page = 1;
      STATE.pageSize = Number($("#pageSize").value || 10);
      STATE.sortBy = $("#sortBy").value || "date_desc";

      renderTable();
      bindEvents();
    } catch (err) {
      console.error(err);
      alert("Error cargando data.json. Sugerencia: servir con un HTTP server (p.ej. python -m http.server).");
    }
  }

  init();
})();
