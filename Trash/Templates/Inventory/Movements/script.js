/* =========================================================
   GestionCom • stock/movements (vanilla)
   ---------------------------------------------------------
   Especificación funcional (explícita):
   - Objeto normalizado principal: movement
   - Columna de fecha principal: movement_date
   - Columna de monto principal (equivalente): total_units (derivado de líneas)
   - Identificador (PK): movement_id
   - Catálogos asociados: products, product_variants, warehouses, movement_types,
     movement_statuses, movement_reasons, cost_centers
   - Workflow: Pendiente/Aprobado/Rechazado
   - Condición estado final: status_label incluye “Aprob” o “Rech”
   - Estado inicial fallback reversa: Pendiente
   ========================================================= */

(function () {
  "use strict";

  // -------- DOM helpers --------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtInt = (n) =>
    new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(n || 0));

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

  // -------- State --------
  const STATE = {
    db: null,

    // maps
    byId: {
      products: new Map(),
      variants: new Map(),
      warehouses: new Map(),
      types: new Map(),
      statuses: new Map(),
      reasons: new Map(),
      costCenters: new Map(),
    },

    // normalized movements
    movements: [],

    // ui state
    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      type_id: "",
      warehouse_id: "",
      cost_center_id: "",
      reason_id: "",
      with_reference: false,
      transfers_only: false,
      urgent_only: false,
      audit_only: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    // workflow / modals
    confirm: { action: null, movement_id: null },
    editing: { movement_id: null, mode: "edit" }, // edit | new
  };

  // -------- Business rules --------
  const WORKFLOW = {
    initial_status_label: "Pendiente",
    finalLabelIncludes: ["aprob", "rech"],
  };

  const isFinalStatusLabel = (label) => {
    const v = String(label || "").toLowerCase();
    return WORKFLOW.finalLabelIncludes.some((k) => v.includes(k));
  };

  const computeLineSignedUnits = (movementTypeCode, line) => {
    const qty = Number(line.quantity ?? 0);
    const signed = Number(line.quantity_signed ?? NaN);

    switch (movementTypeCode) {
      case "IN":
        return qty;
      case "OUT":
        return -qty;
      case "TRANSFER":
        return 0;
      case "ADJUST":
        // si no viene quantity_signed, fallback a qty (positivo)
        return Number.isFinite(signed) ? signed : qty;
      default:
        return 0;
    }
  };

  const computeLineMovedUnits = (movementTypeCode, line) => {
    const qty = Number(line.quantity ?? 0);
    const signed = Number(line.quantity_signed ?? NaN);
    if (movementTypeCode === "ADJUST" && Number.isFinite(signed)) return Math.abs(signed);
    if (movementTypeCode === "TRANSFER") return qty; // se movió físicamente
    return Math.abs(qty);
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

    STATE.byId.products = map(db.products);
    STATE.byId.variants = map(db.product_variants);
    STATE.byId.warehouses = map(db.warehouses);
    STATE.byId.types = map(db.movement_types);
    STATE.byId.statuses = map(db.movement_statuses);
    STATE.byId.reasons = map(db.movement_reasons);
    STATE.byId.costCenters = map(db.cost_centers);
  }

  function normalizeMovements(db) {
    const linesByMovement = new Map();
    (db.stock_movement_lines || []).forEach((ln) => {
      const mid = Number(ln.movement_id);
      if (!linesByMovement.has(mid)) linesByMovement.set(mid, []);
      linesByMovement.get(mid).push(ln);
    });

    const movements = (db.stock_movements || []).map((m) => {
      const type = STATE.byId.types.get(Number(m.movement_type_id));
      const status = STATE.byId.statuses.get(Number(m.status_id));
      const reason = STATE.byId.reasons.get(Number(m.reason_id));
      const sourceWh = STATE.byId.warehouses.get(Number(m.source_warehouse_id));
      const targetWh = STATE.byId.warehouses.get(Number(m.target_warehouse_id));
      const cc = STATE.byId.costCenters.get(Number(m.cost_center_id));

      const rawLines = linesByMovement.get(Number(m.id)) || [];
      const normLines = rawLines.map((ln) => {
        const v = STATE.byId.variants.get(Number(ln.product_variant_id));
        const p = v ? STATE.byId.products.get(Number(v.product_id)) : null;
        const typeCode = String(type?.type_code || "");
        const unitsSigned = computeLineSignedUnits(typeCode, ln);
        const unitsMoved = computeLineMovedUnits(typeCode, ln);

        return {
          ...ln,
          variant: v || null,
          product: p || null,
          variant_label: v ? `${v.variant_sku} • ${v.variant_name}` : `Variante #${ln.product_variant_id}`,
          product_label: p ? p.product_name : "—",
          units_signed: unitsSigned,
          units_moved: unitsMoved,
        };
      });

      const totalItems = normLines.length;
      const totalUnitsMoved = normLines.reduce((s, ln) => s + Number(ln.units_moved || 0), 0);
      const totalUnitsNet = normLines.reduce((s, ln) => s + Number(ln.units_signed || 0), 0);

      const statusLabel = status?.status_label || "—";
      const typeCode = type?.type_code || "—";
      const isFinal = isFinalStatusLabel(statusLabel);

      // búsqueda ampliada (para filtros)
      const lineHaystack = normLines
        .map((ln) => `${ln.variant_label} ${ln.product_label}`)
        .join(" ")
        .toLowerCase();

      const warehousesHaystack = `${sourceWh?.warehouse_name || ""} ${targetWh?.warehouse_name || ""}`.toLowerCase();

      return {
        ...m,
        movement_id: Number(m.id),
        movement_date: m.movement_date,
        movement_code: m.movement_code,
        type,
        status,
        reason,
        cost_center: cc,
        sourceWh,
        targetWh,
        lines: normLines,

        total_items: totalItems,
        total_units_moved: totalUnitsMoved,
        total_units_net: totalUnitsNet,

        is_final: isFinal,

        _search: [
          m.movement_code,
          m.reference_code,
          m.reference_type,
          m.notes,
          typeCode,
          statusLabel,
          reason?.reason_label,
          cc?.cost_center_name,
          warehousesHaystack,
          lineHaystack,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });

    // default sort date desc
    movements.sort((a, b) => new Date(b.movement_date) - new Date(a.movement_date));
    return movements;
  }

  // -------- UI: Catalog selects --------
  function fillSelect(selectEl, items, { valueKey = "id", labelKey = "name", includeEmpty = false, emptyLabel = "Todos" } = {}) {
    if (!selectEl) return;
    const curr = selectEl.value;
    const opts = [];

    if (includeEmpty) {
      opts.push(`<option value="">${escapeHtml(emptyLabel)}</option>`);
    }
    (items || []).forEach((it) => {
      const v = String(it[valueKey]);
      const lbl = String(it[labelKey] ?? it[valueKey]);
      opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(lbl)}</option>`);
    });

    selectEl.innerHTML = opts.join("");
    // restore value if exists
    if (curr) selectEl.value = curr;
  }

  function initFilterSelects() {
    const statuses = (STATE.db.movement_statuses || []).map((s) => ({
      id: s.id,
      label: s.status_label,
    }));
    const types = (STATE.db.movement_types || []).map((t) => ({
      id: t.id,
      label: `${t.type_code} • ${t.type_label}`,
    }));
    const whs = (STATE.db.warehouses || []).map((w) => ({
      id: w.id,
      label: `${w.warehouse_code} • ${w.warehouse_name}`,
    }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({
      id: c.id,
      label: `${c.cost_center_code} • ${c.cost_center_name}`,
    }));
    const reasons = (STATE.db.movement_reasons || []).map((r) => ({
      id: r.id,
      label: r.reason_label,
    }));

    fillSelect($("#filterStatus"), statuses, { valueKey: "id", labelKey: "label", includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterType"), types, { valueKey: "id", labelKey: "label", includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterWarehouse"), whs, { valueKey: "id", labelKey: "label", includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterCostCenter"), ccs, { valueKey: "id", labelKey: "label", includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterReason"), reasons, { valueKey: "id", labelKey: "label", includeEmpty: true, emptyLabel: "Todos" });
  }

  function initEditSelects() {
    const statusSel = $("#editStatus");
    const typeSel = $("#editType");
    const reasonSel = $("#editReason");
    const ccSel = $("#editCostCenter");
    const srcSel = $("#editSourceWh");
    const dstSel = $("#editTargetWh");

    const statuses = (STATE.db.movement_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const types = (STATE.db.movement_types || []).map((t) => ({ id: t.id, label: `${t.type_code} • ${t.type_label}` }));
    const reasons = (STATE.db.movement_reasons || []).map((r) => ({ id: r.id, label: r.reason_label }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const whs = (STATE.db.warehouses || []).map((w) => ({ id: w.id, label: `${w.warehouse_code} • ${w.warehouse_name}` }));

    fillSelect(typeSel, types, { valueKey: "id", labelKey: "label", includeEmpty: false });
    fillSelect(statusSel, statuses, { valueKey: "id", labelKey: "label", includeEmpty: false });
    fillSelect(reasonSel, reasons, { valueKey: "id", labelKey: "label", includeEmpty: false });
    fillSelect(ccSel, ccs, { valueKey: "id", labelKey: "label", includeEmpty: true, emptyLabel: "—" });
    fillSelect(srcSel, [{ id: "", label: "—" }, ...whs], { valueKey: "id", labelKey: "label", includeEmpty: false });
    fillSelect(dstSel, [{ id: "", label: "—" }, ...whs], { valueKey: "id", labelKey: "label", includeEmpty: false });
  }

  // -------- Filtering + sorting + paging --------
  function getFiltered() {
    const f = STATE.filters;
    const term = String(f.term || "").trim().toLowerCase();

    const from = f.date_from ? new Date(f.date_from + "T00:00:00") : null;
    const to = f.date_to ? new Date(f.date_to + "T23:59:59") : null;

    return STATE.movements.filter((m) => {
      if (term && !m._search.includes(term)) return false;

      if (from) {
        const d = new Date(m.movement_date);
        if (d < from) return false;
      }
      if (to) {
        const d = new Date(m.movement_date);
        if (d > to) return false;
      }

      if (f.status_id && String(m.status_id) !== String(f.status_id)) return false;
      if (f.type_id && String(m.movement_type_id) !== String(f.type_id)) return false;
      if (f.reason_id && String(m.reason_id) !== String(f.reason_id)) return false;

      if (f.cost_center_id) {
        if (String(m.cost_center_id || "") !== String(f.cost_center_id)) return false;
      }

      if (f.warehouse_id) {
        const w = String(f.warehouse_id);
        const src = String(m.source_warehouse_id || "");
        const dst = String(m.target_warehouse_id || "");
        if (src !== w && dst !== w) return false;
      }

      if (f.with_reference) {
        if (!String(m.reference_code || "").trim()) return false;
      }

      if (f.transfers_only) {
        const t = STATE.byId.types.get(Number(m.movement_type_id));
        if ((t?.type_code || "") !== "TRANSFER") return false;
      }

      if (f.urgent_only && !Boolean(m.is_urgent)) return false;
      if (f.audit_only && !Boolean(m.requires_audit)) return false;

      return true;
    });
  }

  function sortMovements(list) {
    const k = STATE.sortBy;

    const byDateAsc = (a, b) => new Date(a.movement_date) - new Date(b.movement_date);
    const byDateDesc = (a, b) => new Date(b.movement_date) - new Date(a.movement_date);
    const byUnitsAsc = (a, b) => Number(a.total_units_moved || 0) - Number(b.total_units_moved || 0);
    const byUnitsDesc = (a, b) => Number(b.total_units_moved || 0) - Number(a.total_units_moved || 0);

    const copy = list.slice();
    switch (k) {
      case "date_asc":
        copy.sort(byDateAsc);
        break;
      case "date_desc":
        copy.sort(byDateDesc);
        break;
      case "units_asc":
        copy.sort(byUnitsAsc);
        break;
      case "units_desc":
        copy.sort(byUnitsDesc);
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
    const pending = filtered.filter((m) => !m.is_final).length;
    const approved = filtered.filter((m) => String(m.status?.status_label || "").toLowerCase().includes("aprob")).length;
    const rejected = filtered.filter((m) => String(m.status?.status_label || "").toLowerCase().includes("rech")).length;

    const netUnits = filtered.reduce((s, m) => s + Number(m.total_units_net || 0), 0);
    const movedUnits = filtered.reduce((s, m) => s + Number(m.total_units_moved || 0), 0);

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiPending").textContent = fmtInt(pending);
    $("#kpiApproved").textContent = fmtInt(approved);
    $("#kpiRejected").textContent = fmtInt(rejected);
    $("#kpiNetUnits").textContent = fmtUnits(netUnits);
    $("#kpiMovedUnits").textContent = `Unidades movidas: ${fmtUnits(movedUnits)}`;
  }

  // -------- Table rendering --------
  function statusBadge(statusLabel) {
    const v = String(statusLabel || "").toLowerCase();
    if (v.includes("aprob")) return { cls: "ok", dot: "", label: statusLabel };
    if (v.includes("rech")) return { cls: "bad", dot: "", label: statusLabel };
    return { cls: "warn", dot: "", label: statusLabel || "Pendiente" };
  }

  function typeChip(type) {
    const code = type?.type_code || "—";
    const label = type?.type_label || "—";
    let cls = "chip";
    if (code === "IN") cls += " info";
    if (code === "OUT") cls += " warn";
    if (code === "TRANSFER") cls += " info";
    if (code === "ADJUST") cls += " warn";
    return `<span class="${cls}"><span class="mono">${escapeHtml(code)}</span> ${escapeHtml(label)}</span>`;
  }

  function renderTable() {
    const filtered = sortMovements(getFiltered());
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
        const src = m.sourceWh ? `${m.sourceWh.warehouse_code} • ${m.sourceWh.warehouse_name}` : "—";
        const dst = m.targetWh ? `${m.targetWh.warehouse_code} • ${m.targetWh.warehouse_name}` : "—";
        const reason = m.reason?.reason_label || "—";

        const isFinal = Boolean(m.is_final);

        // Reglas UI:
        // - Editar solo si NO finalizado
        // - Reversar visible en finalizados
        // - Aprobar/Rechazar con confirmación (en finalizados se muestran deshabilitados + reversa)
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
        ]
          .filter(Boolean)
          .join(" ");

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

            <td>${typeChip(m.type)}</td>

            <td>
              <span class="badge ${st.cls}">
                <span class="dot"></span>
                ${escapeHtml(st.label)}
              </span>
              ${flags ? `<div class="row-sub">${flags}</div>` : ""}
            </td>

            <td>${escapeHtml(src)}</td>
            <td>${escapeHtml(dst)}</td>

            <td class="right">${escapeHtml(fmtInt(m.total_items || 0))}</td>
            <td class="right"><strong>${escapeHtml(fmtUnits(m.total_units_moved || 0))}</strong></td>

            <td>${escapeHtml(reason)}</td>

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

  function renderPagination(totalPages) {
    const el = $("#pagination");
    const p = Number(STATE.page || 1);

    const mk = (label, page, disabled, active) => {
      const cls = ["page-btn", active ? "active" : ""].join(" ").trim();
      return `<button class="${cls}" data-page="${page}" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
    };

    const parts = [];
    parts.push(mk("‹", p - 1, p <= 1, false));

    // ventana de páginas
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

  // -------- Movement get/update --------
  function findMovement(id) {
    return STATE.movements.find((m) => Number(m.movement_id) === Number(id)) || null;
  }

  function getInitialStatusId() {
    const s = (STATE.db.movement_statuses || []).find((x) => String(x.status_label) === WORKFLOW.initial_status_label);
    return s ? Number(s.id) : Number((STATE.db.movement_statuses || [])[0]?.id || 1);
  }

  function regenerateDerivedFields(m) {
    const type = STATE.byId.types.get(Number(m.movement_type_id));
    const status = STATE.byId.statuses.get(Number(m.status_id));
    const reason = STATE.byId.reasons.get(Number(m.reason_id));
    const sourceWh = STATE.byId.warehouses.get(Number(m.source_warehouse_id));
    const targetWh = STATE.byId.warehouses.get(Number(m.target_warehouse_id));
    const cc = STATE.byId.costCenters.get(Number(m.cost_center_id));

    const typeCode = type?.type_code || "";
    const normLines = (m.lines || []).map((ln) => {
      const v = STATE.byId.variants.get(Number(ln.product_variant_id));
      const p = v ? STATE.byId.products.get(Number(v.product_id)) : null;

      const unitsSigned = computeLineSignedUnits(typeCode, ln);
      const unitsMoved = computeLineMovedUnits(typeCode, ln);

      return {
        ...ln,
        variant: v || null,
        product: p || null,
        variant_label: v ? `${v.variant_sku} • ${v.variant_name}` : `Variante #${ln.product_variant_id}`,
        product_label: p ? p.product_name : "—",
        units_signed: unitsSigned,
        units_moved: unitsMoved,
      };
    });

    m.type = type || null;
    m.status = status || null;
    m.reason = reason || null;
    m.cost_center = cc || null;
    m.sourceWh = sourceWh || null;
    m.targetWh = targetWh || null;

    m.total_items = normLines.length;
    m.total_units_moved = normLines.reduce((s, ln) => s + Number(ln.units_moved || 0), 0);
    m.total_units_net = normLines.reduce((s, ln) => s + Number(ln.units_signed || 0), 0);

    const statusLabel = status?.status_label || "";
    m.is_final = isFinalStatusLabel(statusLabel);

    m._search = [
      m.movement_code,
      m.reference_code,
      m.reference_type,
      m.notes,
      type?.type_code,
      type?.type_label,
      status?.status_label,
      reason?.reason_label,
      cc?.cost_center_name,
      sourceWh?.warehouse_name,
      targetWh?.warehouse_name,
      normLines.map((ln) => `${ln.variant_label} ${ln.product_label}`).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    m.lines = normLines;
  }

  // -------- View modal --------
  function openView(movement_id) {
    const m = findMovement(movement_id);
    if (!m) return;

    $("#modalViewSubtitle").textContent = `${m.movement_code || "—"} • ${fmtDateTime(m.movement_date)}`;

    $("#viewCode").value = m.movement_code || "—";
    $("#viewDate").value = fmtDateTime(m.movement_date);
    $("#viewType").value = `${m.type?.type_code || "—"} • ${m.type?.type_label || "—"}`;
    $("#viewStatus").value = m.status?.status_label || "—";
    $("#viewReason").value = m.reason?.reason_label || "—";
    $("#viewCostCenter").value = m.cost_center ? `${m.cost_center.cost_center_code} • ${m.cost_center.cost_center_name}` : "—";
    $("#viewSourceWh").value = m.sourceWh ? `${m.sourceWh.warehouse_code} • ${m.sourceWh.warehouse_name}` : "—";
    $("#viewTargetWh").value = m.targetWh ? `${m.targetWh.warehouse_code} • ${m.targetWh.warehouse_name}` : "—";
    $("#viewRefType").value = m.reference_type || "—";
    $("#viewRefCode").value = m.reference_code || "—";
    $("#viewNotes").value = m.notes || "";

    $("#viewUrgent").textContent = `Urgente: ${m.is_urgent ? "Sí" : "No"}`;
    $("#viewAudit").textContent = `Auditoría: ${m.requires_audit ? "Sí" : "No"}`;

    $("#viewMeta").textContent = `Ítems: ${fmtInt(m.total_items)} • Unidades: ${fmtUnits(m.total_units_moved)} • Neto: ${fmtUnits(m.total_units_net)}`;

    const tbody = $("#viewLinesBody");
    tbody.innerHTML = (m.lines || [])
      .map((ln) => {
        const qty = ln.quantity_signed != null && m.type?.type_code === "ADJUST" ? ln.quantity_signed : ln.quantity;
        return `
          <tr>
            <td>
              <div class="mono">${escapeHtml(ln.variant?.variant_sku || "—")}</div>
              <div class="row-sub">${escapeHtml(ln.variant?.variant_name || "—")}</div>
              <div class="row-sub muted">${escapeHtml(ln.product?.product_name || "—")}</div>
            </td>
            <td class="right"><strong>${escapeHtml(fmtUnits(qty))}</strong></td>
            <td>${escapeHtml(ln.lot_code || "—")}</td>
            <td>${escapeHtml(ln.expiry_date || "—")}</td>
          </tr>
        `;
      })
      .join("");

    openModal("modalView");
  }

  // -------- Edit modal + lines --------
  function buildVariantOptions() {
    // opciones "SKU • Nombre • Producto"
    const variants = (STATE.db.product_variants || []).map((v) => {
      const p = STATE.byId.products.get(Number(v.product_id));
      return {
        id: v.id,
        label: `${v.variant_sku} • ${v.variant_name} • ${p ? p.product_name : "—"}`,
      };
    });

    // orden por sku
    variants.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return variants;
  }

  function lineRowTemplate(line, idx, movementTypeCode) {
    const variants = buildVariantOptions();
    const allowSigned = movementTypeCode === "ADJUST";

    const qtyVal = allowSigned
      ? Number.isFinite(Number(line.quantity_signed)) ? String(line.quantity_signed) : String(line.quantity ?? 0)
      : String(line.quantity ?? 0);

    const options = variants
      .map((v) => {
        const sel = String(v.id) === String(line.product_variant_id) ? "selected" : "";
        return `<option value="${escapeHtml(v.id)}" ${sel}>${escapeHtml(v.label)}</option>`;
      })
      .join("");

    return `
      <tr data-line-index="${idx}">
        <td>
          <select class="ln-variant">
            <option value="">Seleccionar…</option>
            ${options}
          </select>
        </td>

        <td class="right">
          <input class="ln-qty right" type="number" step="0.01" ${allowSigned ? "" : "min=\"0\""} value="${escapeHtml(qtyVal)}" />
          <div class="row-sub muted">${allowSigned ? "Permite negativo (ADJUST)" : "Positivo"}</div>
        </td>

        <td><input class="ln-lot" type="text" placeholder="Ej: LOTE-01" value="${escapeHtml(line.lot_code || "")}" /></td>
        <td><input class="ln-exp" type="date" value="${escapeHtml(line.expiry_date || "")}" /></td>

        <td class="center">
          <button type="button" class="icon-btn reject" data-act="removeLine" title="Quitar">🗑</button>
        </td>
      </tr>
    `;
  }

  function renderEditLines(lines, movementTypeCode) {
    const tbody = $("#linesBody");
    tbody.innerHTML = (lines || [])
      .map((ln, idx) => lineRowTemplate(ln, idx, movementTypeCode))
      .join("");
  }

  function readEditLines(movementTypeCode) {
    const allowSigned = movementTypeCode === "ADJUST";
    const rows = $$("#linesBody tr");

    return rows.map((tr, i) => {
      const variantId = $(".ln-variant", tr).value;
      const qtyRaw = $(".ln-qty", tr).value;
      const lot = $(".ln-lot", tr).value;
      const exp = $(".ln-exp", tr).value;

      const qty = Number(qtyRaw);
      return {
        id: 100000 + i,
        movement_id: STATE.editing.movement_id,
        product_variant_id: variantId ? Number(variantId) : null,
        quantity: Number.isFinite(qty) ? Math.abs(qty) : 0,
        quantity_signed: allowSigned ? (Number.isFinite(qty) ? qty : 0) : null,
        lot_code: String(lot || "").trim() || null,
        expiry_date: exp ? String(exp) : null,
      };
    });
  }

  function validateMovementDraft(draft) {
    const errors = [];

    if (!String(draft.movement_date || "").trim()) errors.push("La fecha del movimiento es obligatoria.");
    if (!draft.movement_type_id) errors.push("El tipo de movimiento es obligatorio.");
    if (!draft.status_id) errors.push("El estado es obligatorio.");
    if (!draft.reason_id) errors.push("El motivo es obligatorio.");

    const type = STATE.byId.types.get(Number(draft.movement_type_id));
    const typeCode = type?.type_code;

    const src = Number(draft.source_warehouse_id || 0);
    const dst = Number(draft.target_warehouse_id || 0);

    if (typeCode === "TRANSFER") {
      if (!src) errors.push("En TRANSFER, la bodega origen es obligatoria.");
      if (!dst) errors.push("En TRANSFER, la bodega destino es obligatoria.");
      if (src && dst && src === dst) errors.push("En TRANSFER, origen y destino deben ser diferentes.");
    } else {
      if (!src) errors.push(`En ${typeCode || "este tipo"}, la bodega origen es obligatoria.`);
      // destino debe ir vacío (opcional) en tipos no TRANSFER
    }

    const lines = draft.lines || [];
    if (!lines.length) errors.push("Debe existir al menos una línea.");

    const allowSigned = typeCode === "ADJUST";
    lines.forEach((ln, i) => {
      if (!ln.product_variant_id) errors.push(`Línea #${i + 1}: variante obligatoria.`);

      const q = allowSigned ? Number(ln.quantity_signed) : Number(ln.quantity);
      if (!Number.isFinite(q)) errors.push(`Línea #${i + 1}: unidades inválidas.`);
      if (allowSigned) {
        if (q === 0) errors.push(`Línea #${i + 1}: en ADJUST, unidades no pueden ser 0.`);
      } else {
        if (q <= 0) errors.push(`Línea #${i + 1}: unidades deben ser > 0.`);
      }
    });

    return errors;
  }

  function openEdit(movement_id, mode = "edit") {
    const isNew = mode === "new";
    const m = isNew ? null : findMovement(movement_id);
    if (!isNew && !m) return;

    initEditSelects();
    $("#editErrors").classList.add("hidden");
    $("#editErrors").innerHTML = "";

    const nowIso = new Date().toISOString();
    const defaultStatusId = getInitialStatusId();

    const draft = isNew
      ? {
          movement_id: null,
          movement_code: "",
          movement_date: nowIso,
          movement_type_id: Number((STATE.db.movement_types || [])[0]?.id || 1),
          status_id: defaultStatusId,
          reason_id: Number((STATE.db.movement_reasons || [])[0]?.id || 1),
          cost_center_id: "",
          source_warehouse_id: Number((STATE.db.warehouses || [])[0]?.id || 1),
          target_warehouse_id: "",
          reference_type: "",
          reference_code: "",
          notes: "",
          is_urgent: false,
          requires_audit: false,
          previous_status_id: null,
          lines: [
            {
              id: 1,
              movement_id: null,
              product_variant_id: Number((STATE.db.product_variants || [])[0]?.id || 1),
              quantity: 1,
              quantity_signed: null,
              lot_code: null,
              expiry_date: null,
            },
          ],
        }
      : JSON.parse(JSON.stringify(m)); // clone

    // Reglas: no editar si finalizado
    if (!isNew && draft.is_final) {
      // hard block: abrir en modo view (no interactivo)
      openView(movement_id);
      return;
    }

    STATE.editing.movement_id = isNew ? null : draft.movement_id;
    STATE.editing.mode = mode;

    $("#modalEditTitle").textContent = isNew ? "Nuevo movimiento" : "Editar movimiento";
    $("#modalEditSubtitle").textContent = isNew
      ? "Crear movimiento en estado Pendiente"
      : `${draft.movement_code || "—"} • ${fmtDateTime(draft.movement_date)}`;

    // fill fields
    $("#editCode").value = draft.movement_code || "";
    $("#editDate").value = toLocalDateTimeInput(draft.movement_date);
    $("#editType").value = String(draft.movement_type_id);
    $("#editStatus").value = String(draft.status_id);
    $("#editReason").value = String(draft.reason_id);
    $("#editCostCenter").value = draft.cost_center_id ? String(draft.cost_center_id) : "";
    $("#editSourceWh").value = draft.source_warehouse_id ? String(draft.source_warehouse_id) : "";
    $("#editTargetWh").value = draft.target_warehouse_id ? String(draft.target_warehouse_id) : "";
    $("#editRefType").value = String(draft.reference_type || "");
    $("#editRefCode").value = String(draft.reference_code || "");
    $("#editNotes").value = String(draft.notes || "");
    $("#editUrgent").checked = Boolean(draft.is_urgent);
    $("#editAudit").checked = Boolean(draft.requires_audit);

    // render lines
    const type = STATE.byId.types.get(Number(draft.movement_type_id));
    renderEditLines(draft.lines || [], type?.type_code || "");

    $("#editMeta").textContent = isNew
      ? `Estado inicial: ${WORKFLOW.initial_status_label}`
      : `Última actualización: ${fmtDateTime(draft.updated_at || draft.movement_date)}`;

    openModal("modalEdit");

    // Ajuste de destino (visible/esperado según tipo)
    applyEditTypeUX();
  }

  function toLocalDateTimeInput(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (x) => String(x).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function fromLocalDateTimeInput(v) {
    // v: "YYYY-MM-DDTHH:mm"
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function applyEditTypeUX() {
    const typeId = Number($("#editType").value);
    const type = STATE.byId.types.get(typeId);
    const typeCode = type?.type_code || "";

    // destino solo requerido/útil en TRANSFER
    const dst = $("#editTargetWh");
    const src = $("#editSourceWh");

    if (typeCode === "TRANSFER") {
      dst.disabled = false;
      // si destino vacío, set a distinta a origen cuando sea posible
      if (!dst.value || dst.value === src.value) {
        const whs = (STATE.db.warehouses || []).map((w) => String(w.id));
        const fallback = whs.find((id) => id !== src.value) || "";
        dst.value = fallback;
      }
    } else {
      dst.value = "";
      dst.disabled = true;
    }

    // re-render líneas para habilitar signed en ADJUST
    const currentLines = readEditLines(typeCode);
    renderEditLines(currentLines, typeCode);
  }

  function saveEdit() {
    const isNew = STATE.editing.mode === "new";
    const editErrors = $("#editErrors");

    const typeId = Number($("#editType").value);
    const type = STATE.byId.types.get(typeId);
    const typeCode = type?.type_code || "";

    const draft = {
      movement_id: isNew ? null : STATE.editing.movement_id,
      movement_code: String($("#editCode").value || "").trim() || null,
      movement_date: fromLocalDateTimeInput($("#editDate").value),
      movement_type_id: typeId,
      status_id: Number($("#editStatus").value),
      reason_id: Number($("#editReason").value),
      cost_center_id: $("#editCostCenter").value ? Number($("#editCostCenter").value) : null,
      source_warehouse_id: $("#editSourceWh").value ? Number($("#editSourceWh").value) : null,
      target_warehouse_id: $("#editTargetWh").value ? Number($("#editTargetWh").value) : null,
      reference_type: String($("#editRefType").value || "").trim() || null,
      reference_code: String($("#editRefCode").value || "").trim() || null,
      notes: String($("#editNotes").value || "").trim() || null,
      is_urgent: Boolean($("#editUrgent").checked),
      requires_audit: Boolean($("#editAudit").checked),
      previous_status_id: null,
      lines: readEditLines(typeCode),
    };

    // normalización de líneas: quantity siempre positiva; quantity_signed solo en ADJUST
    draft.lines = draft.lines.map((ln) => {
      const q = Number(ln.quantity);
      const qs = Number(ln.quantity_signed);
      return {
        ...ln,
        product_variant_id: ln.product_variant_id ? Number(ln.product_variant_id) : null,
        quantity: Number.isFinite(q) ? Math.abs(q) : 0,
        quantity_signed: typeCode === "ADJUST" ? (Number.isFinite(qs) ? qs : 0) : null,
      };
    });

    const errors = validateMovementDraft(draft);
    if (errors.length) {
      editErrors.classList.remove("hidden");
      editErrors.innerHTML = `<strong>Validación:</strong><br/>• ${errors.map(escapeHtml).join("<br/>• ")}`;
      return;
    }

    // generar código si falta
    if (!draft.movement_code) {
      draft.movement_code = generateMovementCode(typeCode);
      $("#editCode").value = draft.movement_code;
    }

    const now = new Date().toISOString();

    if (isNew) {
      const newId = nextId();
      const newRow = {
        id: newId,
        movement_id: newId,
        movement_code: draft.movement_code,
        movement_date: draft.movement_date,
        movement_type_id: draft.movement_type_id,
        status_id: draft.status_id,
        reason_id: draft.reason_id,
        cost_center_id: draft.cost_center_id,
        source_warehouse_id: draft.source_warehouse_id,
        target_warehouse_id: draft.target_warehouse_id,
        reference_type: draft.reference_type,
        reference_code: draft.reference_code,
        notes: draft.notes,
        is_urgent: draft.is_urgent,
        requires_audit: draft.requires_audit,
        previous_status_id: null,
        created_by: "demo.user",
        created_at: now,
        updated_at: now,
        lines: draft.lines.map((ln, i) => ({
          ...ln,
          id: newId * 100 + i + 1,
          movement_id: newId,
        })),
      };

      regenerateDerivedFields(newRow);
      STATE.movements.unshift(newRow); // arriba
    } else {
      const m = findMovement(draft.movement_id);
      if (!m) return;

      // seguridad: no modificar finalizados
      if (m.is_final) return;

      m.movement_code = draft.movement_code;
      m.movement_date = draft.movement_date;
      m.movement_type_id = draft.movement_type_id;
      m.status_id = draft.status_id;
      m.reason_id = draft.reason_id;
      m.cost_center_id = draft.cost_center_id;
      m.source_warehouse_id = draft.source_warehouse_id;
      m.target_warehouse_id = draft.target_warehouse_id;
      m.reference_type = draft.reference_type;
      m.reference_code = draft.reference_code;
      m.notes = draft.notes;
      m.is_urgent = draft.is_urgent;
      m.requires_audit = draft.requires_audit;
      m.updated_at = now;

      m.lines = draft.lines.map((ln, i) => ({
        ...ln,
        id: (m.movement_id || 1) * 100 + i + 1,
        movement_id: m.movement_id,
      }));

      regenerateDerivedFields(m);
    }

    closeModal("modalEdit");
    renderTable();
  }

  function nextId() {
    const max = STATE.movements.reduce((mx, m) => Math.max(mx, Number(m.movement_id || 0)), 0);
    return max + 1;
  }

  function generateMovementCode(typeCode) {
    const prefix = {
      IN: "IN",
      OUT: "OUT",
      TRANSFER: "TRF",
      ADJUST: "ADJ",
    }[typeCode] || "MOV";

    const stamp = new Date();
    const yy = String(stamp.getFullYear()).slice(2);
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");
    const rnd = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${yy}${mm}${dd}-${rnd}`;
  }

  // -------- Workflow: approve / reject / reverse --------
  function openConfirm(action, movement_id) {
    const m = findMovement(movement_id);
    if (!m) return;

    const a = String(action || "");
    STATE.confirm.action = a;
    STATE.confirm.movement_id = Number(movement_id);

    const title = a === "approve" ? "Aprobar movimiento" : "Rechazar movimiento";
    const icon = a === "approve" ? "✓" : "✕";
    const iconBg = a === "approve" ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)";
    $("#modalConfirmTitle").textContent = title;
    $("#modalConfirmSubtitle").textContent = `${m.movement_code || "—"} • ${fmtDateTime(m.movement_date)}`;
    $("#confirmIcon").textContent = icon;
    $("#confirmIcon").style.background = iconBg;

    $("#confirmMsg").textContent =
      a === "approve"
        ? "¿Confirmas la aprobación del movimiento?"
        : "¿Confirmas el rechazo del movimiento?";

    $("#confirmSub").textContent = `Acción irreversible hasta ejecutar “Reversar (⟲)”.`;
    $("#confirmMeta").textContent = `Ítems: ${fmtInt(m.total_items)} • Unidades: ${fmtUnits(m.total_units_moved)}`;

    const btn = $("#btnConfirmAction");
    btn.textContent = a === "approve" ? "Confirmar aprobación" : "Confirmar rechazo";
    btn.classList.toggle("btn-danger", a !== "approve");
    btn.classList.toggle("btn-primary", a === "approve");

    openModal("modalConfirm");
  }

  function applyWorkflowAction() {
    const action = STATE.confirm.action;
    const id = STATE.confirm.movement_id;

    const m = findMovement(id);
    if (!m) return;

    // regla: si ya finalizado, no re-aplicar
    if (m.is_final) {
      closeModal("modalConfirm");
      return;
    }

    // validación: no aprobar/rechazar si líneas no válidas
    const type = STATE.byId.types.get(Number(m.movement_type_id));
    const typeCode = type?.type_code || "";
    const draft = { ...m, lines: (m.lines || []).map((ln) => ({
      ...ln,
      quantity: ln.quantity,
      quantity_signed: ln.quantity_signed,
      product_variant_id: ln.product_variant_id
    }))};
    const errs = validateMovementDraft(draft);
    if (errs.length) {
      // reutilizar confirm modal como feedback
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

    // timestamps (demo)
    const now = new Date().toISOString();
    m.updated_at = now;
    if (action === "approve") m.approved_at = now;
    if (action === "reject") m.rejected_at = now;

    regenerateDerivedFields(m);
    closeModal("modalConfirm");
    renderTable();
  }

  function reverseMovement(movement_id) {
    const m = findMovement(movement_id);
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

  // -------- Events wiring --------
  function bindEvents() {
    // global close (backdrop + [data-close])
    document.addEventListener("click", (e) => {
      const closeId = e.target?.getAttribute?.("data-close");
      if (closeId) closeModal(closeId);
    });

    // ESC closes top-level modals
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      ["modalConfirm", "modalEdit", "modalView"].forEach((id) => {
        const m = $("#" + id);
        if (m && !m.classList.contains("hidden")) closeModal(id);
      });
    });

    // Filters change
    const apply = debounce(() => {
      STATE.page = 1;
      renderTable();
    }, 160);

    $("#filterTerm").addEventListener("input", (e) => {
      STATE.filters.term = e.target.value;
      apply();
    });

    $("#filterDateFrom").addEventListener("change", (e) => {
      STATE.filters.date_from = e.target.value;
      apply();
    });

    $("#filterDateTo").addEventListener("change", (e) => {
      STATE.filters.date_to = e.target.value;
      apply();
    });

    $("#filterStatus").addEventListener("change", (e) => {
      STATE.filters.status_id = e.target.value;
      apply();
    });

    $("#filterType").addEventListener("change", (e) => {
      STATE.filters.type_id = e.target.value;
      apply();
    });

    $("#filterWarehouse").addEventListener("change", (e) => {
      STATE.filters.warehouse_id = e.target.value;
      apply();
    });

    $("#filterCostCenter").addEventListener("change", (e) => {
      STATE.filters.cost_center_id = e.target.value;
      apply();
    });

    $("#filterReason").addEventListener("change", (e) => {
      STATE.filters.reason_id = e.target.value;
      apply();
    });

    $("#toggleWithReference").addEventListener("change", (e) => {
      STATE.filters.with_reference = e.target.checked;
      apply();
    });

    $("#toggleTransfersOnly").addEventListener("change", (e) => {
      STATE.filters.transfers_only = e.target.checked;
      apply();
    });

    $("#toggleUrgent").addEventListener("change", (e) => {
      STATE.filters.urgent_only = e.target.checked;
      apply();
    });

    $("#toggleAudit").addEventListener("change", (e) => {
      STATE.filters.audit_only = e.target.checked;
      apply();
    });

    $("#btnClearFilters").addEventListener("click", () => {
      STATE.filters = {
        term: "",
        date_from: "",
        date_to: "",
        status_id: "",
        type_id: "",
        warehouse_id: "",
        cost_center_id: "",
        reason_id: "",
        with_reference: false,
        transfers_only: false,
        urgent_only: false,
        audit_only: false,
      };

      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterType").value = "";
      $("#filterWarehouse").value = "";
      $("#filterCostCenter").value = "";
      $("#filterReason").value = "";
      $("#toggleWithReference").checked = false;
      $("#toggleTransfersOnly").checked = false;
      $("#toggleUrgent").checked = false;
      $("#toggleAudit").checked = false;

      STATE.page = 1;
      renderTable();
    });

    // Sorting + page size
    $("#sortBy").addEventListener("change", (e) => {
      STATE.sortBy = e.target.value;
      STATE.page = 1;
      renderTable();
    });

    $("#pageSize").addEventListener("change", (e) => {
      STATE.pageSize = Number(e.target.value);
      STATE.page = 1;
      renderTable();
    });

    // Pagination click
    $("#pagination").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      const p = Number(btn.getAttribute("data-page"));
      if (!Number.isFinite(p)) return;
      STATE.page = p;
      renderTable();
    });

    // Table actions (delegation)
    $("#tableBody").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      const id = Number(btn.getAttribute("data-id"));

      if (act === "view") openView(id);
      if (act === "edit") openEdit(id, "edit");
      if (act === "approve") openConfirm("approve", id);
      if (act === "reject") openConfirm("reject", id);
      if (act === "reverse") reverseMovement(id);
    });

    // Header actions
    $("#btnNew").addEventListener("click", () => openEdit(null, "new"));

    $("#btnReload").addEventListener("click", async () => {
      await boot(true);
    });

    // Confirm modal confirm button
    $("#btnConfirmAction").addEventListener("click", applyWorkflowAction);

    // Edit modal: type change impacts UX
    $("#editType").addEventListener("change", () => applyEditTypeUX());

    // Edit modal: add line
    $("#btnAddLine").addEventListener("click", () => {
      const typeId = Number($("#editType").value);
      const type = STATE.byId.types.get(typeId);
      const typeCode = type?.type_code || "";
      const curr = readEditLines(typeCode);

      curr.push({
        id: 100000 + curr.length + 1,
        movement_id: STATE.editing.movement_id,
        product_variant_id: null,
        quantity: 1,
        quantity_signed: typeCode === "ADJUST" ? 1 : null,
        lot_code: null,
        expiry_date: null,
      });

      renderEditLines(curr, typeCode);
    });

    // Edit modal: remove line delegation
    $("#linesBody").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      if (act !== "removeLine") return;

      const tr = btn.closest("tr[data-line-index]");
      if (!tr) return;

      const typeId = Number($("#editType").value);
      const type = STATE.byId.types.get(typeId);
      const typeCode = type?.type_code || "";
      const curr = readEditLines(typeCode);

      const idx = Number(tr.getAttribute("data-line-index"));
      if (Number.isFinite(idx)) curr.splice(idx, 1);

      renderEditLines(curr, typeCode);
    });

    // Edit form submit
    $("#editForm").addEventListener("submit", (e) => {
      e.preventDefault();
      saveEdit();
    });

    // Backdrop click close handled via data-close already; keep for safety
    $$("#modalEdit .modal-backdrop, #modalView .modal-backdrop, #modalConfirm .modal-backdrop").forEach((el) => {
      el.addEventListener("click", closeAnyOnBackdropClick);
    });
  }

  // -------- Boot --------
  async function boot(force = false) {
    try {
      if (force) STATE.db = null;

      const db = await loadData();
      STATE.db = db;

      buildMaps(db);
      STATE.movements = normalizeMovements(db);

      initFilterSelects();
      bindEventsOnce();
      renderTable();
    } catch (err) {
      console.error(err);
      // fallback UX
      alert(
        "Error cargando data.json.\n\n" +
          "Recomendación: servir el directorio con HTTP (ej: python -m http.server) y abrir http://localhost:8000.\n\n" +
          String(err.message || err)
      );
    }
  }

  let _eventsBound = false;
  function bindEventsOnce() {
    if (_eventsBound) return;
    _eventsBound = true;
    bindEvents();
  }

  // -------- Start --------
  boot();
})();
