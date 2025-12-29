/* script.js — GestionCom (stock/transfers) — Vanilla, sin dependencias */
(() => {
  "use strict";

  // =========================
  // Config
  // =========================
  const ROUTE = "stock/transfers";
  const WORKFLOW = {
    initial_status_label: "Pendiente envío",
    sent_status_label: "Enviado",
    final_labels: ["Aceptado", "Parcial", "Rechazado"],
  };

  // =========================
  // Helpers DOM
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
  const toNum = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  const parseDate = (v) => {
    if (!v) return null;
    // Acepta "YYYY-MM-DD" o ISO
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  const fmtDate = (v) => {
    const d = parseDate(v);
    if (!d) return "—";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const fmtDateTime = (v) => {
    const d = parseDate(v);
    if (!d) return "—";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const toInputDate = (v) => {
    const d = parseDate(v);
    if (!d) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const isoNow = () => new Date().toISOString();

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const sum = (arr, fn) => arr.reduce((acc, x) => acc + toNum(fn(x), 0), 0);

  const byIdMap = (arr) => {
    const m = new Map();
    (arr || []).forEach((x) => m.set(Number(x.id), x));
    return m;
  };

  const groupBy = (arr, keyFn) => {
    const m = new Map();
    (arr || []).forEach((x) => {
      const k = keyFn(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    });
    return m;
  };

  const hasFinalLabel = (label) => WORKFLOW.final_labels.some((x) => String(label || "").toLowerCase() === String(x).toLowerCase());

  const statusChipClass = (label) => {
    const l = String(label || "").toLowerCase();
    if (l.includes("acept")) return "chip chip-ok";
    if (l.includes("parc")) return "chip chip-warn";
    if (l.includes("rech")) return "chip chip-bad";
    if (l.includes("envi")) return "chip chip-info";
    return "chip";
  };

  const mkOption = (value, label, selectedValue) => {
    const sel = String(value) === String(selectedValue) ? "selected" : "";
    return `<option value="${escapeHtml(value)}" ${sel}>${escapeHtml(label)}</option>`;
  };

  // =========================
  // Estado global
  // =========================
  const STATE = {
    db: null,
    byId: {
      statuses: new Map(),
      reasons: new Map(),
      warehouses: new Map(),
      costCenters: new Map(),
      users: new Map(),
      products: new Map(),
      variants: new Map(),
    },
    idx: {
      linesByTransfer: new Map(),
      msgsByTransfer: new Map(),
    },
    transfers: [],         // normalizados
    filtered: [],          // resultado filtros
    currentUserId: null,

    ui: {
      page: 1,
      pageSize: 10,
      sortBy: "date_desc",
      editingId: null,
      viewingId: null,
      confirm: { action: null, transferId: null },
      receive: { transferId: null },
    },

    filters: {
      term: "",
      dateFrom: "",
      dateTo: "",
      statusId: "",
      reasonId: "",
      sourceWhId: "",
      targetWhId: "",
      costCenterId: "",
      onlyUrgent: false,
      onlyDiff: false,
      onlyRejected: false,
      onlyPartial: false,
    },
  };

  // =========================
  // Modal utils
  // =========================
  function anyModalOpen() {
    return $$(".modal").some((m) => !m.classList.contains("hidden"));
  }

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
    if (!anyModalOpen()) document.body.style.overflow = "";
  }

  function forceCloseAllModals() {
    ["modalEdit", "modalView", "modalConfirm", "modalReceive"].forEach((id) => {
      const m = $("#" + id);
      if (!m) return;
      m.classList.add("hidden");
      m.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "";
  }

  function wireModalClose() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      const closeId = t?.getAttribute?.("data-close");
      if (closeId) closeModal(closeId);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // cierra el último modal visible por orden conocido
      const order = ["modalReceive", "modalConfirm", "modalView", "modalEdit"];
      const openId = order.find((id) => {
        const m = $("#" + id);
        return m && !m.classList.contains("hidden");
      });
      if (openId) closeModal(openId);
    });
  }

  // Bloqueo visual (sin “apagarse”) en modo View
  function lockControl(el) {
    if (!el) return;
    el.setAttribute("data-locked", "1");
    el.setAttribute("aria-readonly", "true");
    const stop = (ev) => {
      if (el.getAttribute("data-locked") === "1") {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    ["mousedown", "click", "keydown", "change", "input"].forEach((evt) => el.addEventListener(evt, stop, true));

    // Mantener “activo” visualmente incluso si el navegador aplica estilos por readonly/disabled
    el.style.opacity = "1";
    el.style.filter = "none";
  }

  // =========================
  // Carga / Normalización
  // =========================
  async function loadData() {
    const res = await fetch("data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar data.json (${res.status})`);
    const data = await res.json();
    STATE.db = data;

    STATE.byId.statuses = byIdMap(data.transfer_statuses);
    STATE.byId.reasons = byIdMap(data.transfer_reasons);
    STATE.byId.warehouses = byIdMap(data.warehouses);
    STATE.byId.costCenters = byIdMap(data.cost_centers);
    STATE.byId.users = byIdMap(data.users);
    STATE.byId.products = byIdMap(data.products);
    STATE.byId.variants = byIdMap(data.product_variants);

    STATE.idx.linesByTransfer = groupBy(data.stock_transfer_lines, (x) => Number(x.transfer_id));
    STATE.idx.msgsByTransfer = groupBy(data.stock_transfer_messages, (x) => Number(x.transfer_id));

    // usuario actual (meta fallback al primero)
    const metaUserId = Number(data.meta?.current_user_id || 0);
    STATE.currentUserId = STATE.byId.users.has(metaUserId) ? metaUserId : Number((data.users || [])[0]?.id || 1);

    STATE.transfers = (data.stock_transfers || []).map((t) => normalizeTransfer(t));
    applyFiltersAndRender(true);
  }

  function normalizeTransfer(t) {
    const status = STATE.byId.statuses.get(Number(t.status_id)) || null;
    const reason = STATE.byId.reasons.get(Number(t.reason_id)) || null;
    const sourceWh = STATE.byId.warehouses.get(Number(t.source_warehouse_id)) || null;
    const targetWh = STATE.byId.warehouses.get(Number(t.target_warehouse_id)) || null;
    const cc = STATE.byId.costCenters.get(Number(t.cost_center_id)) || null;
    const requestedBy = STATE.byId.users.get(Number(t.requested_by_user_id)) || null;
    const sentBy = t.sent_by_user_id ? STATE.byId.users.get(Number(t.sent_by_user_id)) : null;
    const receivedBy = t.received_by_user_id ? STATE.byId.users.get(Number(t.received_by_user_id)) : null;

    const rawLines = STATE.idx.linesByTransfer.get(Number(t.id)) || [];
    const lines = rawLines.map((ln) => {
      const v = STATE.byId.variants.get(Number(ln.product_variant_id)) || null;
      const p = v ? STATE.byId.products.get(Number(v.product_id)) : null;
      return {
        ...ln,
        variant: v,
        product: p,
        _label:
          v && p
            ? `${v.variant_sku} • ${v.variant_name} • ${p.product_name}`
            : `Variante #${ln.product_variant_id}`,
      };
    });

    const totalItems = lines.length;
    const totalReq = sum(lines, (x) => x.qty_requested);
    const totalSent = sum(lines, (x) => x.qty_sent);
    const totalRecv = sum(lines, (x) => x.qty_received);

    const diffUnits = totalSent - totalRecv;
    const diffAbs = Math.abs(diffUnits);
    const hasDiff = totalSent !== totalRecv;

    const statusLabel = status?.status_label || "";
    const isFinal = Boolean(status?.is_final) || hasFinalLabel(statusLabel);

    const rawMsgs = STATE.idx.msgsByTransfer.get(Number(t.id)) || [];
    const msgs = rawMsgs
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m) => ({
        ...m,
        user: STATE.byId.users.get(Number(m.created_by_user_id)) || null,
      }));

    const search = [
      t.transfer_code,
      t.reference,
      t.notes,
      status?.status_label,
      reason?.reason_label,
      sourceWh?.warehouse_code,
      sourceWh?.warehouse_name,
      targetWh?.warehouse_code,
      targetWh?.warehouse_name,
      cc?.cost_center_code,
      cc?.cost_center_name,
      requestedBy?.display_name,
      requestedBy?.username,
      lines.map((x) => `${x.variant?.variant_sku || ""} ${x.variant?.variant_name || ""} ${x.product?.product_name || ""}`).join(" "),
      msgs.map((x) => x.message).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      ...t,
      status,
      reason,
      sourceWh,
      targetWh,
      costCenter: cc,
      requestedBy,
      sentBy,
      receivedBy,
      lines,
      msgs,
      total_items: totalItems,
      total_req: totalReq,
      total_sent: totalSent,
      total_recv: totalRecv,
      diff_units: diffUnits,
      diff_abs: diffAbs,
      has_diff: hasDiff,
      is_final: isFinal,
      _search: search,
    };
  }

  function reNormalizeInPlace(transferId) {
    const idx = STATE.transfers.findIndex((x) => Number(x.id) === Number(transferId));
    if (idx < 0) return;
    const raw = (STATE.db.stock_transfers || []).find((x) => Number(x.id) === Number(transferId));
    if (!raw) return;
    STATE.transfers[idx] = normalizeTransfer(raw);
  }

  // =========================
  // Filtros / Sorting / Paginación
  // =========================
  function readFiltersFromUI() {
    STATE.filters.term = ($("#filterTerm")?.value || "").trim().toLowerCase();
    STATE.filters.dateFrom = $("#filterDateFrom")?.value || "";
    STATE.filters.dateTo = $("#filterDateTo")?.value || "";
    STATE.filters.statusId = $("#filterStatus")?.value || "";
    STATE.filters.reasonId = $("#filterReason")?.value || "";
    STATE.filters.sourceWhId = $("#filterSourceWh")?.value || "";
    STATE.filters.targetWhId = $("#filterTargetWh")?.value || "";
    STATE.filters.costCenterId = $("#filterCostCenter")?.value || "";
    STATE.filters.onlyUrgent = Boolean($("#toggleUrgent")?.checked);
    STATE.filters.onlyDiff = Boolean($("#toggleDiff")?.checked);
    STATE.filters.onlyRejected = Boolean($("#toggleRejected")?.checked);
    STATE.filters.onlyPartial = Boolean($("#togglePartial")?.checked);

    STATE.ui.sortBy = $("#sortBy")?.value || "date_desc";
    STATE.ui.pageSize = toNum($("#pageSize")?.value, 10);
  }

  function filterTransfers() {
    const f = STATE.filters;
    const from = f.dateFrom ? parseDate(f.dateFrom) : null;
    const to = f.dateTo ? parseDate(f.dateTo) : null;

    return STATE.transfers.filter((t) => {
      if (f.term && !t._search.includes(f.term)) return false;

      if (from || to) {
        const d = parseDate(t.transfer_date) || parseDate(t.created_at);
        if (from && d && d.getTime() < from.getTime()) return false;
        if (to && d && d.getTime() > to.getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      }

      if (f.statusId && String(t.status_id) !== String(f.statusId)) return false;
      if (f.reasonId && String(t.reason_id) !== String(f.reasonId)) return false;
      if (f.sourceWhId && String(t.source_warehouse_id) !== String(f.sourceWhId)) return false;
      if (f.targetWhId && String(t.target_warehouse_id) !== String(f.targetWhId)) return false;
      if (f.costCenterId && String(t.cost_center_id) !== String(f.costCenterId)) return false;

      if (f.onlyUrgent && !t.is_urgent) return false;
      if (f.onlyDiff && !t.has_diff) return false;

      const st = String(t.status?.status_label || "").toLowerCase();
      if (f.onlyRejected && !st.includes("rech")) return false;
      if (f.onlyPartial && !st.includes("parc")) return false;

      return true;
    });
  }

  function sortTransfers(arr) {
    const s = STATE.ui.sortBy || "date_desc";
    const toTS = (v) => {
      const d = parseDate(v);
      return d ? d.getTime() : 0;
    };

    const copy = arr.slice();
    copy.sort((a, b) => {
      if (s === "date_desc") return toTS(b.transfer_date) - toTS(a.transfer_date);
      if (s === "date_asc") return toTS(a.transfer_date) - toTS(b.transfer_date);

      if (s === "sent_desc") return toTS(b.sent_at) - toTS(a.sent_at);
      if (s === "sent_asc") return toTS(a.sent_at) - toTS(b.sent_at);

      if (s === "diff_desc") return toNum(b.diff_abs) - toNum(a.diff_abs);
      if (s === "diff_asc") return toNum(a.diff_abs) - toNum(b.diff_abs);

      return 0;
    });
    return copy;
  }

  function paginate(arr) {
    const pageSize = clamp(toNum(STATE.ui.pageSize, 10), 5, 100);
    const total = arr.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = clamp(toNum(STATE.ui.page, 1), 1, totalPages);
    STATE.ui.page = page;

    const start = (page - 1) * pageSize;
    const slice = arr.slice(start, start + pageSize);

    return { slice, total, totalPages, page, pageSize, start };
  }

  // =========================
  // Render: filtros (selects)
  // =========================
  function renderFilterSelects() {
    const statuses = (STATE.db.transfer_statuses || []).slice().sort((a, b) => String(a.status_label).localeCompare(String(b.status_label)));
    const reasons = (STATE.db.transfer_reasons || []).slice().sort((a, b) => String(a.reason_label).localeCompare(String(b.reason_label)));
    const whs = (STATE.db.warehouses || []).slice().sort((a, b) => String(a.warehouse_name).localeCompare(String(b.warehouse_name)));
    const ccs = (STATE.db.cost_centers || []).slice().sort((a, b) => String(a.cost_center_name).localeCompare(String(b.cost_center_name)));

    const fStatus = $("#filterStatus");
    const fReason = $("#filterReason");
    const fSrc = $("#filterSourceWh");
    const fDst = $("#filterTargetWh");
    const fCC = $("#filterCostCenter");

    if (fStatus) fStatus.innerHTML = `<option value="">Todos</option>` + statuses.map((x) => mkOption(x.id, x.status_label, STATE.filters.statusId)).join("");
    if (fReason) fReason.innerHTML = `<option value="">Todos</option>` + reasons.map((x) => mkOption(x.id, x.reason_label, STATE.filters.reasonId)).join("");
    if (fSrc) fSrc.innerHTML = `<option value="">Todas</option>` + whs.map((x) => mkOption(x.id, `${x.warehouse_code} • ${x.warehouse_name}`, STATE.filters.sourceWhId)).join("");
    if (fDst) fDst.innerHTML = `<option value="">Todas</option>` + whs.map((x) => mkOption(x.id, `${x.warehouse_code} • ${x.warehouse_name}`, STATE.filters.targetWhId)).join("");
    if (fCC) fCC.innerHTML = `<option value="">Todos</option>` + ccs.map((x) => mkOption(x.id, `${x.cost_center_code} • ${x.cost_center_name}`, STATE.filters.costCenterId)).join("");
  }

  // =========================
  // Render: KPIs
  // =========================
  function renderKPIs(filtered) {
    const total = filtered.length;
    const all = STATE.transfers.length;

    const pendingSend = filtered.filter((x) => String(x.status?.status_label || "").toLowerCase().includes("pendiente")).length;
    const pendingRecv = filtered.filter((x) => String(x.status?.status_label || "").toLowerCase().includes("envi")).length;
    const final = filtered.filter((x) => x.is_final).length;

    const netUnits = sum(filtered, (x) => x.total_recv);

    $("#kpiTotal").textContent = String(total);
    $("#kpiTotalSub").textContent = `Según filtros actuales • Base total: ${all}`;

    $("#kpiPendingSend").textContent = String(pendingSend);
    $("#kpiPendingReceive").textContent = String(pendingRecv);
    $("#kpiFinal").textContent = String(final);

    $("#kpiNetUnits").textContent = String(netUnits);
    const sentUnits = sum(filtered, (x) => x.total_sent);
    const diffUnits = sentUnits - netUnits;
    $("#kpiUnitsSub").textContent = `Enviado: ${sentUnits} • Diferencia: ${diffUnits}`;
  }

  // =========================
  // Render: tabla + paginación
  // =========================
  function renderPagination(totalPages, page) {
    const el = $("#pagination");
    const info = $("#lblPageInfo");
    if (!el) return;

    const mkBtn = (label, targetPage, disabled, active) => {
      const dis = disabled ? "disabled" : "";
      const act = active ? "active" : "";
      return `<button class="page-btn ${act}" data-page="${targetPage}" ${dis} type="button">${escapeHtml(label)}</button>`;
    };

    const parts = [];
    parts.push(mkBtn("‹", page - 1, page <= 1, false));

    const win = 2;
    const start = Math.max(1, page - win);
    const end = Math.min(totalPages, page + win);

    if (start > 1) parts.push(mkBtn("1", 1, false, page === 1));
    if (start > 2) parts.push(`<span class="muted small">…</span>`);

    for (let i = start; i <= end; i++) parts.push(mkBtn(String(i), i, false, i === page));

    if (end < totalPages - 1) parts.push(`<span class="muted small">…</span>`);
    if (end < totalPages) parts.push(mkBtn(String(totalPages), totalPages, false, page === totalPages));

    parts.push(mkBtn("›", page + 1, page >= totalPages, false));

    el.innerHTML = parts.join("");

    if (info) info.textContent = `Página ${page} / ${totalPages}`;
  }

  function isEditable(t) {
    // Reglas del submódulo: editable sólo antes de enviar
    const st = String(t.status?.status_label || "").toLowerCase();
    return st.includes("pendiente") && !t.is_final;
  }

  function isReceivable(t) {
    const st = String(t.status?.status_label || "").toLowerCase();
    return st.includes("envi") && !t.is_final;
  }

  function renderTable() {
    const filtered = STATE.filtered;
    const sorted = sortTransfers(filtered);
    const { slice, total, totalPages, page, pageSize, start } = paginate(sorted);

    $("#lblCount").textContent = String(total);

    const body = $("#tableBody");
    const empty = $("#emptyState");
    if (!body) return;

    if (!slice.length) {
      body.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      renderPagination(1, 1);
      return;
    }
    if (empty) empty.classList.add("hidden");

    body.innerHTML = slice
      .map((t) => {
        const statusLabel = t.status?.status_label || "—";
        const src = t.sourceWh ? `${t.sourceWh.warehouse_code}` : "—";
        const dst = t.targetWh ? `${t.targetWh.warehouse_code}` : "—";
        const reason = t.reason?.reason_label || "—";
        const reqBy = t.requestedBy ? t.requestedBy.display_name : "—";

        const canEdit = isEditable(t);
        const canSend = canEdit; // send desde Pendiente
        const canReceive = isReceivable(t);
        const showReverse = t.is_final;

        const diffBadge = t.has_diff ? `<span class="chip chip-warn" title="Diferencias">Δ</span>` : "";
        const urgentBadge = t.is_urgent ? `<span class="chip chip-bad" title="Urgente">!</span>` : "";

        const actions = [
          `<button class="icon-btn" data-act="view" data-id="${t.id}" title="Ver">👁</button>`,
          canEdit ? `<button class="icon-btn" data-act="edit" data-id="${t.id}" title="Editar">✎</button>` : "",
          canSend ? `<button class="icon-btn" data-act="send" data-id="${t.id}" title="Enviar">📤</button>` : "",
          canReceive ? `<button class="icon-btn" data-act="accept" data-id="${t.id}" title="Aceptar (total)">✓</button>` : "",
          canReceive ? `<button class="icon-btn" data-act="receive" data-id="${t.id}" title="Recepcionar parcial">≋</button>` : "",
          canReceive ? `<button class="icon-btn" data-act="reject" data-id="${t.id}" title="Rechazar">✕</button>` : "",
          showReverse ? `<button class="icon-btn" data-act="reverse" data-id="${t.id}" title="Reversar (⟲)">⟲</button>` : "",
        ]
          .filter(Boolean)
          .join("");

        return `
          <tr>
            <td>${escapeHtml(fmtDate(t.transfer_date))}</td>
            <td>
              <div class="mono">${escapeHtml(t.transfer_code || "—")}</div>
              <div class="row-sub muted">${escapeHtml(t.reference || "")}</div>
            </td>
            <td>
              <span class="${escapeHtml(statusChipClass(statusLabel))}">${escapeHtml(statusLabel)}</span>
              <div class="row-sub">${urgentBadge} ${diffBadge}</div>
            </td>
            <td>${escapeHtml(src)}</td>
            <td>${escapeHtml(dst)}</td>
            <td class="right">${escapeHtml(String(t.total_items))}</td>
            <td class="right">${escapeHtml(String(t.total_req))}</td>
            <td class="right">${escapeHtml(String(t.total_sent))}</td>
            <td class="right">${escapeHtml(String(t.total_recv))}</td>
            <td>${escapeHtml(reason)}</td>
            <td>${escapeHtml(reqBy)}</td>
            <td class="center">
              <div class="row-actions">${actions}</div>
            </td>
          </tr>
        `;
      })
      .join("");

    renderPagination(totalPages, page);

    // Info paging
    const info = $("#lblPageInfo");
    if (info) {
      const end = Math.min(start + pageSize, total);
      info.textContent = `Mostrando ${start + 1}–${end} de ${total}`;
    }
  }

  // =========================
  // Orquestación render
  // =========================
  function applyFiltersAndRender(resetPage = false) {
    readFiltersFromUI();
    if (resetPage) STATE.ui.page = 1;
    STATE.filtered = filterTransfers();
    renderFilterSelects();
    renderKPIs(STATE.filtered);
    renderTable();
  }

  // =========================
  // CRUD / Workflow (memoria)
  // =========================
  function findRawTransfer(id) {
    return (STATE.db.stock_transfers || []).find((x) => Number(x.id) === Number(id)) || null;
  }

  function getInitialStatusId() {
    const s = (STATE.db.transfer_statuses || []).find((x) => String(x.status_label) === WORKFLOW.initial_status_label);
    return s ? Number(s.id) : Number((STATE.db.transfer_statuses || [])[0]?.id || 1);
  }

  function getStatusIdByLabel(label) {
    const s = (STATE.db.transfer_statuses || []).find((x) => String(x.status_label).toLowerCase() === String(label).toLowerCase());
    return s ? Number(s.id) : null;
  }

  function getCurrentUser() {
    return STATE.byId.users.get(Number(STATE.currentUserId)) || null;
  }

  function nextId(arr) {
    const max = (arr || []).reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
    return max + 1;
  }

  function addMessage(transferId, message, kind = "USER", lineId = null) {
    const user = getCurrentUser();
    const msg = {
      id: nextId(STATE.db.stock_transfer_messages || []),
      transfer_id: Number(transferId),
      line_id: lineId != null ? Number(lineId) : null,
      kind,
      message: String(message || "").trim(),
      created_by_user_id: Number(user?.id || STATE.currentUserId || 1),
      created_at: isoNow(),
    };
    if (!msg.message) return;
    STATE.db.stock_transfer_messages.push(msg);
    // refrescar índices
    STATE.idx.msgsByTransfer = groupBy(STATE.db.stock_transfer_messages, (x) => Number(x.transfer_id));
  }

  function validateDraft(draft) {
    const errs = [];
    const src = Number(draft.source_warehouse_id || 0);
    const dst = Number(draft.target_warehouse_id || 0);
    if (!src) errs.push("Bodega Origen es obligatoria.");
    if (!dst) errs.push("Bodega Destino es obligatoria.");
    if (src && dst && src === dst) errs.push("Origen y Destino no pueden ser la misma bodega.");
    if (!draft.reason_id) errs.push("Motivo es obligatorio.");
    if (!draft.cost_center_id) errs.push("Centro de costo es obligatorio.");
    if (!draft.requested_by_user_id) errs.push("Solicitado por es obligatorio.");

    const lines = draft._lines || [];
    if (!lines.length) errs.push("Debe existir al menos 1 línea.");
    const anyQty = lines.some((l) => toNum(l.qty_requested) > 0);
    if (lines.length && !anyQty) errs.push("Debe existir al menos 1 línea con cantidad requerida > 0.");

    lines.forEach((l, idx) => {
      if (!l.product_variant_id) errs.push(`Línea #${idx + 1}: Variante es obligatoria.`);
      const req = toNum(l.qty_requested);
      const sent = toNum(l.qty_sent);
      if (req < 0) errs.push(`Línea #${idx + 1}: Requerido no puede ser negativo.`);
      if (sent < 0) errs.push(`Línea #${idx + 1}: Enviado no puede ser negativo.`);
      if (sent > req) errs.push(`Línea #${idx + 1}: Enviado no puede superar Requerido.`);
    });

    return errs;
  }

  // =========================
  // Modal: Edit (crear/editar)
  // =========================
  function openEdit(transferId) {
    const isNew = transferId == null;

    const raw = isNew ? null : findRawTransfer(transferId);
    if (!isNew && !raw) return;

    const draft = isNew
      ? {
          id: null,
          transfer_code: "",
          transfer_date: toInputDate(isoNow()),
          status_id: getInitialStatusId(),
          reason_id: (STATE.db.transfer_reasons || [])[0]?.id || "",
          cost_center_id: (STATE.db.cost_centers || [])[0]?.id || "",
          source_warehouse_id: (STATE.db.warehouses || [])[0]?.id || "",
          target_warehouse_id: (STATE.db.warehouses || [])[1]?.id || "",
          requested_by_user_id: STATE.currentUserId,
          reference: "",
          notes: "",
          is_urgent: false,
          sent_by_user_id: null,
          sent_at: null,
          received_by_user_id: null,
          received_at: null,
          previous_status_id: null,
          created_at: isoNow(),
          updated_at: isoNow(),
          _lines: [],
        }
      : {
          ...raw,
          transfer_date: toInputDate(raw.transfer_date),
          _lines: (STATE.idx.linesByTransfer.get(Number(raw.id)) || []).map((x) => ({ ...x })),
        };

    // Regla: sólo abrir si editable
    if (!isNew) {
      const norm = STATE.transfers.find((x) => Number(x.id) === Number(transferId));
      if (norm && !isEditable(norm)) return;
    }

    STATE.ui.editingId = transferId;

    // Header modal
    $("#modalEditTitle").textContent = isNew ? "Nuevo ticket" : "Editar ticket";
    $("#modalEditSub").textContent = isNew ? `Ruta: ${ROUTE}` : `${raw.transfer_code || "—"} • ${fmtDate(raw.transfer_date)}`;

    // Campos base
    $("#editCode").value = isNew ? "(AUTO)" : (raw.transfer_code || "");
    $("#editDate").value = draft.transfer_date || "";

    // Selects
    fillSelect("#editStatus", STATE.db.transfer_statuses, "status_label", draft.status_id);
    fillSelect("#editReason", STATE.db.transfer_reasons, "reason_label", draft.reason_id);
    fillSelect("#editCostCenter", STATE.db.cost_centers, (x) => `${x.cost_center_code} • ${x.cost_center_name}`, draft.cost_center_id);
    fillSelect("#editRequestedBy", STATE.db.users, (x) => `${x.display_name} (@${x.username})`, draft.requested_by_user_id);
    fillSelect("#editSourceWh", STATE.db.warehouses, (x) => `${x.warehouse_code} • ${x.warehouse_name}`, draft.source_warehouse_id);
    fillSelect("#editTargetWh", STATE.db.warehouses, (x) => `${x.warehouse_code} • ${x.warehouse_name}`, draft.target_warehouse_id);

    // Estado: no editable manualmente (workflow)
    $("#editStatus").disabled = true;
    $("#editStatus").style.opacity = "1";

    $("#editReference").value = draft.reference || "";
    $("#editUrgent").checked = Boolean(draft.is_urgent);
    $("#editNotes").value = draft.notes || "";

    const sentBy = draft.sent_by_user_id ? STATE.byId.users.get(Number(draft.sent_by_user_id)) : null;
    const recBy = draft.received_by_user_id ? STATE.byId.users.get(Number(draft.received_by_user_id)) : null;

    $("#editSentBy").value = sentBy ? sentBy.display_name : "—";
    $("#editSentAt").value = draft.sent_at ? fmtDateTime(draft.sent_at) : "—";
    $("#editReceivedBy").value = recBy ? recBy.display_name : "—";
    $("#editReceivedAt").value = draft.received_at ? fmtDateTime(draft.received_at) : "—";

    // Líneas
    renderEditLines(draft._lines);

    // Mensajes
    renderMessages("edit", isNew ? [] : (STATE.idx.msgsByTransfer.get(Number(raw.id)) || []));

    // Hint
    $("#editHint").textContent = "Edición permitida sólo en estado “Pendiente envío”. Enviar/Recepcionar se ejecuta desde la tabla (acciones por fila).";

    // Guardar draft en DOM (simple)
    $("#modalEdit")._draft = draft;

    openModal("modalEdit");
  }

  function fillSelect(sel, arr, labelKeyOrFn, selectedValue) {
    const el = $(sel);
    if (!el) return;
    const getLabel = typeof labelKeyOrFn === "function" ? labelKeyOrFn : (x) => x[labelKeyOrFn];
    const opts = (arr || []).map((x) => mkOption(x.id, getLabel(x), selectedValue)).join("");
    el.innerHTML = opts;
  }

  function buildVariantOptions(selectedId) {
    const variants = (STATE.db.product_variants || [])
      .map((v) => {
        const p = STATE.byId.products.get(Number(v.product_id));
        return {
          id: v.id,
          label: `${v.variant_sku} • ${v.variant_name} • ${p ? p.product_name : "—"}`,
        };
      })
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    return `<option value="">Seleccionar…</option>` + variants.map((v) => mkOption(v.id, v.label, selectedId)).join("");
  }

  function renderEditLines(lines) {
    const tbody = $("#editLinesBody");
    if (!tbody) return;

    tbody.innerHTML = (lines || [])
      .map((ln, idx) => {
        return `
          <tr data-idx="${idx}">
            <td style="min-width: 280px">
              <select class="ln-variant">${buildVariantOptions(ln.product_variant_id)}</select>
              <div class="row-sub muted">SKU / Variante / Producto</div>
            </td>
            <td class="right" style="width: 120px">
              <input class="ln-req right" type="number" min="0" step="1" value="${escapeHtml(String(ln.qty_requested ?? 0))}" />
            </td>
            <td class="right" style="width: 120px">
              <input class="ln-sent right" type="number" min="0" step="1" value="${escapeHtml(String(ln.qty_sent ?? 0))}" />
            </td>
            <td style="width: 140px">
              <input class="ln-lot" type="text" placeholder="LOTE (opcional)" value="${escapeHtml(ln.lot_code || "")}" />
            </td>
            <td style="min-width: 200px">
              <input class="ln-notes" type="text" placeholder="Notas línea (opcional)" value="${escapeHtml(ln.notes || "")}" />
            </td>
            <td class="center" style="width: 64px">
              <button class="icon-btn" type="button" data-act="lineRemove" data-idx="${idx}" title="Quitar">🗑</button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function readEditLinesFromUI(draft) {
    const rows = $$("#editLinesBody tr");
    const out = [];
    rows.forEach((tr, i) => {
      const idx = toNum(tr.getAttribute("data-idx"), i);
      const v = tr.querySelector(".ln-variant")?.value || "";
      const req = toNum(tr.querySelector(".ln-req")?.value, 0);
      const sent = toNum(tr.querySelector(".ln-sent")?.value, 0);
      const lot = tr.querySelector(".ln-lot")?.value || "";
      const notes = tr.querySelector(".ln-notes")?.value || "";

      const base = draft._lines[idx] || {};
      out.push({
        id: base.id || null,
        transfer_id: draft.id || null,
        product_variant_id: v ? Number(v) : null,
        qty_requested: req,
        qty_sent: sent,
        qty_received: toNum(base.qty_received, 0), // no se edita aquí
        lot_code: lot || null,
        notes: notes || null,
      });
    });
    return out;
  }

  function renderMessages(mode, msgsRaw) {
    const isEdit = mode === "edit";
    const listEl = isEdit ? $("#editMsgList") : $("#viewMsgList");
    const countEl = isEdit ? $("#editMsgCount") : $("#viewMsgCount");
    if (!listEl) return;

    const msgs = (msgsRaw || [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m) => ({
        ...m,
        user: STATE.byId.users.get(Number(m.created_by_user_id)) || null,
      }));

    if (countEl) countEl.textContent = `${msgs.length} mensaje(s)`;

    listEl.innerHTML = msgs.length
      ? msgs
          .map((m) => {
            const u = m.user ? m.user.display_name : "Sistema";
            const k = String(m.kind || "USER").toUpperCase();
            return `
              <div class="msg-item">
                <div class="msg-top">
                  <div class="msg-who"><strong>${escapeHtml(u)}</strong> <span class="muted small">• ${escapeHtml(k)}</span></div>
                  <div class="muted small">${escapeHtml(fmtDateTime(m.created_at))}</div>
                </div>
                <div class="msg-body">${escapeHtml(m.message)}</div>
              </div>
            `;
          })
          .join("")
      : `<div class="muted small">Sin mensajes.</div>`;
  }

  function saveDraftFromEditModal() {
    const modal = $("#modalEdit");
    const draft = modal?._draft;
    if (!draft) return;

    // campos
    draft.transfer_date = $("#editDate")?.value || draft.transfer_date;
    draft.reason_id = toNum($("#editReason")?.value, "");
    draft.cost_center_id = toNum($("#editCostCenter")?.value, "");
    draft.requested_by_user_id = toNum($("#editRequestedBy")?.value, "");
    draft.source_warehouse_id = toNum($("#editSourceWh")?.value, "");
    draft.target_warehouse_id = toNum($("#editTargetWh")?.value, "");
    draft.reference = ($("#editReference")?.value || "").trim();
    draft.notes = ($("#editNotes")?.value || "").trim();
    draft.is_urgent = Boolean($("#editUrgent")?.checked);

    // líneas (UI)
    draft._lines = readEditLinesFromUI(draft);

    // validación
    const errs = validateDraft(draft);
    if (errs.length) {
      // feedback simple vía alert (sin dependencias)
      alert(`Validación:\n- ${errs.join("\n- ")}`);
      return;
    }

    const isNew = draft.id == null;

    if (isNew) {
      // crear
      const id = nextId(STATE.db.stock_transfers || []);
      const code = `TR-${new Date().getFullYear()}${pad2(new Date().getMonth() + 1)}${pad2(new Date().getDate())}-${String(id).padStart(4, "0")}`;

      const now = isoNow();
      const raw = {
        id,
        transfer_code: code,
        transfer_date: draft.transfer_date,
        status_id: getInitialStatusId(),
        reason_id: Number(draft.reason_id),
        cost_center_id: Number(draft.cost_center_id),
        source_warehouse_id: Number(draft.source_warehouse_id),
        target_warehouse_id: Number(draft.target_warehouse_id),
        requested_by_user_id: Number(draft.requested_by_user_id),
        reference: draft.reference || null,
        notes: draft.notes || null,
        is_urgent: Boolean(draft.is_urgent),
        sent_by_user_id: null,
        sent_at: null,
        received_by_user_id: null,
        received_at: null,
        previous_status_id: null,
        created_at: now,
        updated_at: now,
      };
      STATE.db.stock_transfers.push(raw);

      // líneas
      const linesArr = STATE.db.stock_transfer_lines || [];
      draft._lines.forEach((l) => {
        linesArr.push({
          id: nextId(linesArr),
          transfer_id: id,
          product_variant_id: Number(l.product_variant_id),
          qty_requested: toNum(l.qty_requested),
          qty_sent: toNum(l.qty_sent),
          qty_received: 0,
          lot_code: l.lot_code || null,
          notes: l.notes || null,
        });
      });

      // mensaje sistema
      addMessage(id, `Ticket creado (${code}).`, "SYSTEM");

      // refrescar idx líneas
      STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

      // normalizar
      STATE.transfers.push(normalizeTransfer(raw));
    } else {
      // update en memoria (sólo si editable)
      const raw = findRawTransfer(draft.id);
      if (!raw) return;

      raw.transfer_date = draft.transfer_date;
      raw.reason_id = Number(draft.reason_id);
      raw.cost_center_id = Number(draft.cost_center_id);
      raw.requested_by_user_id = Number(draft.requested_by_user_id);
      raw.source_warehouse_id = Number(draft.source_warehouse_id);
      raw.target_warehouse_id = Number(draft.target_warehouse_id);
      raw.reference = draft.reference || null;
      raw.notes = draft.notes || null;
      raw.is_urgent = Boolean(draft.is_urgent);
      raw.updated_at = isoNow();

      // líneas: estrategia simple => reemplazar todas las líneas del ticket
      STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).filter((x) => Number(x.transfer_id) !== Number(draft.id));
      const linesArr = STATE.db.stock_transfer_lines;
      draft._lines.forEach((l) => {
        linesArr.push({
          id: l.id ? Number(l.id) : nextId(linesArr),
          transfer_id: Number(draft.id),
          product_variant_id: Number(l.product_variant_id),
          qty_requested: toNum(l.qty_requested),
          qty_sent: toNum(l.qty_sent),
          qty_received: toNum(l.qty_received, 0),
          lot_code: l.lot_code || null,
          notes: l.notes || null,
        });
      });

      // refrescar idx
      STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

      addMessage(draft.id, "Ticket actualizado.", "SYSTEM");

      reNormalizeInPlace(draft.id);
    }

    closeModal("modalEdit");
    applyFiltersAndRender(false);
  }

  // =========================
  // Modal: View
  // =========================
  function openView(transferId) {
    const t = STATE.transfers.find((x) => Number(x.id) === Number(transferId));
    if (!t) return;

    $("#modalViewTitle").textContent = "Ver ticket";
    $("#modalViewSub").textContent = `${t.transfer_code || "—"} • ${fmtDate(t.transfer_date)} • ${t.status?.status_label || "—"}`;

    // Single-value “readonly” selects: se cargan con las mismas opciones, pero se bloquean sin “disabled”
    fillSelect("#viewStatus", STATE.db.transfer_statuses, "status_label", t.status_id);
    fillSelect("#viewReason", STATE.db.transfer_reasons, "reason_label", t.reason_id);
    fillSelect("#viewCostCenter", STATE.db.cost_centers, (x) => `${x.cost_center_code} • ${x.cost_center_name}`, t.cost_center_id);
    fillSelect("#viewRequestedBy", STATE.db.users, (x) => `${x.display_name} (@${x.username})`, t.requested_by_user_id);
    fillSelect("#viewSourceWh", STATE.db.warehouses, (x) => `${x.warehouse_code} • ${x.warehouse_name}`, t.source_warehouse_id);
    fillSelect("#viewTargetWh", STATE.db.warehouses, (x) => `${x.warehouse_code} • ${x.warehouse_name}`, t.target_warehouse_id);

    $("#viewCode").value = t.transfer_code || "—";
    $("#viewDate").value = toInputDate(t.transfer_date);
    $("#viewReference").value = t.reference || "";
    $("#viewNotes").value = t.notes || "";
    $("#viewUrgent").checked = Boolean(t.is_urgent);

    $("#viewSentBy").value = t.sentBy ? t.sentBy.display_name : "—";
    $("#viewSentAt").value = t.sent_at ? fmtDateTime(t.sent_at) : "—";
    $("#viewReceivedBy").value = t.receivedBy ? t.receivedBy.display_name : "—";
    $("#viewReceivedAt").value = t.received_at ? fmtDateTime(t.received_at) : "—";

    // Bloquear controles sin apagar visual
    ["#viewStatus", "#viewReason", "#viewCostCenter", "#viewRequestedBy", "#viewSourceWh", "#viewTargetWh", "#viewUrgent"].forEach((sel) => lockControl($(sel)));
    $("#viewNotes").setAttribute("readonly", "true");
    lockControl($("#viewNotes"));
    $("#viewNewMsg").setAttribute("readonly", "true");
    lockControl($("#viewNewMsg"));

    // Líneas (incluye recibido)
    const tbody = $("#viewLinesBody");
    tbody.innerHTML = (t.lines || [])
      .map((ln) => {
        const sku = ln.variant?.variant_sku || "—";
        const vn = ln.variant?.variant_name || "—";
        const pn = ln.product?.product_name || "—";
        return `
          <tr>
            <td>
              <div class="mono">${escapeHtml(sku)}</div>
              <div class="row-sub">${escapeHtml(vn)}</div>
              <div class="row-sub muted">${escapeHtml(pn)}</div>
            </td>
            <td class="right"><strong>${escapeHtml(String(ln.qty_requested ?? 0))}</strong></td>
            <td class="right"><strong>${escapeHtml(String(ln.qty_sent ?? 0))}</strong></td>
            <td class="right"><strong>${escapeHtml(String(ln.qty_received ?? 0))}</strong></td>
            <td>${escapeHtml(ln.lot_code || "—")}</td>
            <td>${escapeHtml(ln.notes || "—")}</td>
          </tr>
        `;
      })
      .join("");

    // Mensajes
    renderMessages("view", STATE.idx.msgsByTransfer.get(Number(t.id)) || []);
    $("#viewHint").textContent = `Ítems: ${t.total_items} • Req: ${t.total_req} • Enviado: ${t.total_sent} • Recibido: ${t.total_recv} • Dif: ${t.diff_units}`;

    openModal("modalView");
  }

  // =========================
  // Confirm modal (send/accept/reject/reverse)
  // =========================
  function openConfirm(action, transferId) {
    const t = STATE.transfers.find((x) => Number(x.id) === Number(transferId));
    if (!t) return;

    STATE.ui.confirm.action = action;
    STATE.ui.confirm.transferId = Number(transferId);

    const titleMap = {
      send: "Confirmar envío",
      accept: "Confirmar aceptación (total)",
      reject: "Confirmar rechazo",
      reverse: "Confirmar reversa",
    };
    const iconMap = { send: "📤", accept: "✓", reject: "✕", reverse: "⟲" };

    $("#modalConfirmTitle").textContent = "Confirmación";
    $("#modalConfirmSub").textContent = `${t.transfer_code || "—"} • ${fmtDate(t.transfer_date)} • ${t.status?.status_label || "—"}`;
    $("#confirmIcon").textContent = iconMap[action] || "⚠";

    if (action === "send") {
      $("#confirmTitle").textContent = "¿Deseas marcar el ticket como Enviado?";
      $("#confirmBody").textContent = "Se bloqueará la edición y quedará disponible para recepción en bodega destino.";
      $("#confirmHint").textContent = `Ítems: ${t.total_items} • Req: ${t.total_req} • Enviado: ${t.total_sent}`;
    } else if (action === "accept") {
      $("#confirmTitle").textContent = "¿Deseas aceptar el ticket (recepción total)?";
      $("#confirmBody").textContent = "Se registrará Recibido = Enviado en todas las líneas y el ticket quedará finalizado (Aceptado).";
      $("#confirmHint").textContent = `Enviado: ${t.total_sent} • Recibido actual: ${t.total_recv}`;
    } else if (action === "reject") {
      $("#confirmTitle").textContent = "¿Deseas rechazar el ticket?";
      $("#confirmBody").textContent = "Se registrará Recibido = 0 en todas las líneas y el ticket quedará finalizado (Rechazado).";
      $("#confirmHint").textContent = `Enviado: ${t.total_sent}`;
    } else if (action === "reverse") {
      $("#confirmTitle").textContent = "¿Deseas reversar la última decisión?";
      $("#confirmBody").textContent = "Se restaurará el estado anterior (fallback al estado inicial). Para estados de recepción, se limpiarán datos de recepción.";
      $("#confirmHint").textContent = `Estado actual: ${t.status?.status_label || "—"}`;
    } else {
      $("#confirmTitle").textContent = "¿Confirmas la acción?";
      $("#confirmBody").textContent = "—";
      $("#confirmHint").textContent = "—";
    }

    $("#confirmReason").value = "";
    openModal("modalConfirm");
  }

  function applyConfirmAction() {
    const action = STATE.ui.confirm.action;
    const transferId = STATE.ui.confirm.transferId;
    const note = ($("#confirmReason")?.value || "").trim();

    const raw = findRawTransfer(transferId);
    if (!raw) return;

    const norm = STATE.transfers.find((x) => Number(x.id) === Number(transferId));
    if (!norm) return;

    const now = isoNow();
    const me = getCurrentUser();

    // util: set previous status
    const setPrev = () => {
      raw.previous_status_id = Number(raw.status_id || getInitialStatusId());
    };

    if (action === "send") {
      // sólo desde Pendiente envío
      if (!isEditable(norm)) {
        closeModal("modalConfirm");
        return;
      }

      // si qty_sent es 0, autocompletar con requested (por línea)
      const lines = (STATE.idx.linesByTransfer.get(Number(raw.id)) || []).map((x) => ({ ...x }));
      const fixed = lines.map((ln) => {
        const req = toNum(ln.qty_requested, 0);
        let sent = toNum(ln.qty_sent, 0);
        if (!sent && req) sent = req;
        if (sent > req) sent = req;
        return { ...ln, qty_sent: sent };
      });

      const anySent = fixed.some((x) => toNum(x.qty_sent, 0) > 0);
      if (!anySent) {
        alert("No es posible enviar: todas las líneas tienen Enviado = 0.");
        return;
      }

      // persistir líneas
      STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).map((x) => {
        if (Number(x.transfer_id) !== Number(raw.id)) return x;
        const nx = fixed.find((y) => Number(y.id) === Number(x.id));
        return nx ? { ...x, qty_sent: toNum(nx.qty_sent, 0) } : x;
      });
      STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

      setPrev();
      raw.status_id = getStatusIdByLabel(WORKFLOW.sent_status_label) || raw.status_id;
      raw.sent_by_user_id = Number(me?.id || STATE.currentUserId);
      raw.sent_at = now;
      raw.updated_at = now;

      addMessage(raw.id, `Ticket marcado como Enviado por ${me?.display_name || "usuario"}.`, "SYSTEM");
      if (note) addMessage(raw.id, note, "USER");

      reNormalizeInPlace(raw.id);
      closeModal("modalConfirm");
      applyFiltersAndRender(false);
      return;
    }

    if (action === "accept") {
      // sólo si recepcionable
      if (!isReceivable(norm)) {
        closeModal("modalConfirm");
        return;
      }

      // Recibido = Enviado
      STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).map((x) => {
        if (Number(x.transfer_id) !== Number(raw.id)) return x;
        return { ...x, qty_received: toNum(x.qty_sent, 0) };
      });
      STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

      setPrev();
      raw.status_id = getStatusIdByLabel("Aceptado") || raw.status_id;
      raw.received_by_user_id = Number(me?.id || STATE.currentUserId);
      raw.received_at = now;
      raw.updated_at = now;

      addMessage(raw.id, `Recepción TOTAL confirmada por ${me?.display_name || "usuario"}.`, "SYSTEM");
      if (note) addMessage(raw.id, note, "USER");

      reNormalizeInPlace(raw.id);
      closeModal("modalConfirm");
      applyFiltersAndRender(false);
      return;
    }

    if (action === "reject") {
      if (!isReceivable(norm)) {
        closeModal("modalConfirm");
        return;
      }

      // Recibido = 0
      STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).map((x) => {
        if (Number(x.transfer_id) !== Number(raw.id)) return x;
        return { ...x, qty_received: 0 };
      });
      STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

      setPrev();
      raw.status_id = getStatusIdByLabel("Rechazado") || raw.status_id;
      raw.received_by_user_id = Number(me?.id || STATE.currentUserId);
      raw.received_at = now;
      raw.updated_at = now;

      addMessage(raw.id, `Ticket RECHAZADO por ${me?.display_name || "usuario"}.`, "SYSTEM");
      if (note) addMessage(raw.id, note, "USER");

      reNormalizeInPlace(raw.id);
      closeModal("modalConfirm");
      applyFiltersAndRender(false);
      return;
    }

    if (action === "reverse") {
      // Reversa: restaurar estado anterior o inicial
      const prev = raw.previous_status_id ? Number(raw.previous_status_id) : getInitialStatusId();
      const prevStatus = STATE.byId.statuses.get(prev);
      const prevLabel = prevStatus?.status_label || "";

      raw.status_id = prev;
      raw.updated_at = now;

      // Limpieza coherente:
      // - si volvemos a "Enviado": limpiar recepción
      // - si volvemos a "Pendiente envío": limpiar envío + recepción
      const prevLower = String(prevLabel).toLowerCase();
      const toPending = prevLower.includes("pendiente");
      const toSent = prevLower.includes("envi");

      if (toSent) {
        raw.received_by_user_id = null;
        raw.received_at = null;
        STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).map((x) => {
          if (Number(x.transfer_id) !== Number(raw.id)) return x;
          return { ...x, qty_received: 0 };
        });
      } else if (toPending) {
        raw.sent_by_user_id = null;
        raw.sent_at = null;
        raw.received_by_user_id = null;
        raw.received_at = null;
        STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).map((x) => {
          if (Number(x.transfer_id) !== Number(raw.id)) return x;
          return { ...x, qty_sent: 0, qty_received: 0 };
        });
      }

      STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

      addMessage(raw.id, `Reversa ejecutada. Estado restaurado a: ${prevLabel || "—"}.`, "SYSTEM");
      if (note) addMessage(raw.id, note, "USER");

      reNormalizeInPlace(raw.id);
      closeModal("modalConfirm");
      applyFiltersAndRender(false);
      return;
    }

    closeModal("modalConfirm");
  }

  // =========================
  // Modal: Recepción parcial
  // =========================
  function openReceive(transferId) {
    const t = STATE.transfers.find((x) => Number(x.id) === Number(transferId));
    if (!t) return;
    if (!isReceivable(t)) return;

    STATE.ui.receive.transferId = Number(transferId);

    $("#modalReceiveTitle").textContent = "Recepcionar parcial";
    $("#modalReceiveSub").textContent = `${t.transfer_code || "—"} • Origen: ${t.sourceWh?.warehouse_code || "—"} → Destino: ${t.targetWh?.warehouse_code || "—"}`;

    const tbody = $("#receiveLinesBody");
    tbody.innerHTML = (t.lines || [])
      .map((ln) => {
        const sent = toNum(ln.qty_sent, 0);
        const sku = ln.variant?.variant_sku || "—";
        const vn = ln.variant?.variant_name || "—";
        return `
          <tr data-line-id="${ln.id}">
            <td>
              <div class="mono">${escapeHtml(sku)}</div>
              <div class="row-sub muted">${escapeHtml(vn)}</div>
            </td>
            <td class="right"><strong>${escapeHtml(String(sent))}</strong></td>
            <td class="right">
              <input class="recv-input right" type="number" min="0" max="${escapeHtml(String(sent))}" step="1" value="${escapeHtml(String(sent))}" />
            </td>
          </tr>
        `;
      })
      .join("");

    $("#receiveNote").value = "";
    $("#receiveHint").textContent = `Enviado total: ${t.total_sent} • Define recibido por línea.`;

    openModal("modalReceive");
  }

  function receiveFillAll() {
    $$("#receiveLinesBody .recv-input").forEach((inp) => {
      const max = toNum(inp.getAttribute("max"), 0);
      inp.value = String(max);
    });
  }

  function confirmReceivePartial() {
    const transferId = STATE.ui.receive.transferId;
    const raw = findRawTransfer(transferId);
    if (!raw) return;

    const norm = STATE.transfers.find((x) => Number(x.id) === Number(transferId));
    if (!norm || !isReceivable(norm)) return;

    const note = ($("#receiveNote")?.value || "").trim();
    const now = isoNow();
    const me = getCurrentUser();

    // Leer inputs
    const rows = $$("#receiveLinesBody tr");
    const receivedByLine = new Map();
    for (const tr of rows) {
      const lineId = toNum(tr.getAttribute("data-line-id"), 0);
      const inp = tr.querySelector(".recv-input");
      const val = toNum(inp?.value, 0);

      // Validación: 0..sent
      const line = norm.lines.find((x) => Number(x.id) === Number(lineId));
      const sent = toNum(line?.qty_sent, 0);
      if (val < 0 || val > sent) {
        alert(`Recepción inválida en línea #${lineId}: Recibido debe estar entre 0 y ${sent}.`);
        return;
      }
      receivedByLine.set(lineId, val);
    }

    const allRecv = Array.from(receivedByLine.values());
    const sumRecv = allRecv.reduce((a, b) => a + toNum(b, 0), 0);

    // Persistir received en líneas
    STATE.db.stock_transfer_lines = (STATE.db.stock_transfer_lines || []).map((x) => {
      if (Number(x.transfer_id) !== Number(raw.id)) return x;
      const v = receivedByLine.get(Number(x.id));
      if (v == null) return x;
      return { ...x, qty_received: toNum(v, 0) };
    });
    STATE.idx.linesByTransfer = groupBy(STATE.db.stock_transfer_lines, (x) => Number(x.transfer_id));

    // Determinar estado
    const sentTotal = sum(norm.lines, (x) => x.qty_sent);
    const allZero = sumRecv === 0;
    const isTotal = sumRecv === sentTotal;

    raw.previous_status_id = Number(raw.status_id || getInitialStatusId());
    raw.received_by_user_id = Number(me?.id || STATE.currentUserId);
    raw.received_at = now;
    raw.updated_at = now;

    if (allZero) raw.status_id = getStatusIdByLabel("Rechazado") || raw.status_id;
    else if (isTotal) raw.status_id = getStatusIdByLabel("Aceptado") || raw.status_id;
    else raw.status_id = getStatusIdByLabel("Parcial") || raw.status_id;

    const stLabel = STATE.byId.statuses.get(Number(raw.status_id))?.status_label || "—";
    addMessage(raw.id, `Recepción registrada (${stLabel}) por ${me?.display_name || "usuario"}.`, "SYSTEM");
    if (note) addMessage(raw.id, note, "USER");

    reNormalizeInPlace(raw.id);
    closeModal("modalReceive");
    applyFiltersAndRender(false);
  }

  // =========================
  // Eventos UI
  // =========================
  function wireUI() {
    // Inicial: si algo quedó “abierto” por estado previo, forzar cierre
    forceCloseAllModals();
    wireModalClose();

    // Filtros
    const filterIds = [
      "#filterTerm",
      "#filterDateFrom",
      "#filterDateTo",
      "#filterStatus",
      "#filterReason",
      "#filterSourceWh",
      "#filterTargetWh",
      "#filterCostCenter",
      "#toggleUrgent",
      "#toggleDiff",
      "#toggleRejected",
      "#togglePartial",
      "#sortBy",
      "#pageSize",
    ];
    filterIds.forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => applyFiltersAndRender(true));
      el.addEventListener("change", () => applyFiltersAndRender(true));
    });

    $("#btnClearFilters")?.addEventListener("click", () => {
      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterReason").value = "";
      $("#filterSourceWh").value = "";
      $("#filterTargetWh").value = "";
      $("#filterCostCenter").value = "";
      $("#toggleUrgent").checked = false;
      $("#toggleDiff").checked = false;
      $("#toggleRejected").checked = false;
      $("#togglePartial").checked = false;
      applyFiltersAndRender(true);
    });

    // Paginación click
    $("#pagination")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      const p = toNum(btn.getAttribute("data-page"), STATE.ui.page);
      STATE.ui.page = p;
      renderTable();
    });

    // Acciones tabla (delegación)
    $("#tableBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      const id = toNum(btn.getAttribute("data-id"), 0);
      if (!id) return;

      if (act === "view") return openView(id);
      if (act === "edit") return openEdit(id);
      if (act === "send") return openConfirm("send", id);
      if (act === "accept") return openConfirm("accept", id);
      if (act === "reject") return openConfirm("reject", id);
      if (act === "reverse") return openConfirm("reverse", id);
      if (act === "receive") return openReceive(id);
    });

    // Nuevo / Reload
    $("#btnNew")?.addEventListener("click", () => openEdit(null));
    $("#btnReload")?.addEventListener("click", async () => {
      try {
        await loadData();
      } catch (err) {
        alert(String(err?.message || err));
      }
    });

    // Edit modal: líneas
    $("#btnAddLine")?.addEventListener("click", () => {
      const draft = $("#modalEdit")?._draft;
      if (!draft) return;
      draft._lines = draft._lines || [];
      draft._lines.push({
        id: null,
        transfer_id: draft.id || null,
        product_variant_id: null,
        qty_requested: 1,
        qty_sent: 1,
        qty_received: 0,
        lot_code: null,
        notes: null,
      });
      renderEditLines(draft._lines);
    });

    $("#editLinesBody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act='lineRemove']");
      if (!btn) return;
      const idx = toNum(btn.getAttribute("data-idx"), -1);
      const draft = $("#modalEdit")?._draft;
      if (!draft || idx < 0) return;
      draft._lines.splice(idx, 1);
      renderEditLines(draft._lines);
    });

    // Mensajes (edit)
    $("#btnAddMsg")?.addEventListener("click", () => {
      const draft = $("#modalEdit")?._draft;
      if (!draft) return;

      if (draft.id == null) {
        alert("Primero guarda el ticket para habilitar mensajes persistentes.");
        return;
      }

      const msg = ($("#editNewMsg")?.value || "").trim();
      if (!msg) return;
      addMessage(draft.id, msg, "USER");
      $("#editNewMsg").value = "";
      renderMessages("edit", STATE.idx.msgsByTransfer.get(Number(draft.id)) || []);
      reNormalizeInPlace(draft.id);
      applyFiltersAndRender(false);
    });

    // Guardar (edit)
    $("#btnSave")?.addEventListener("click", () => saveDraftFromEditModal());

    // Confirm modal
    $("#btnConfirm")?.addEventListener("click", () => applyConfirmAction());

    // Receive modal
    $("#btnReceiveFillAll")?.addEventListener("click", () => receiveFillAll());
    $("#btnReceiveConfirm")?.addEventListener("click", () => confirmReceivePartial());
  }

  // =========================
  // Boot
  // =========================
  async function boot() {
    wireUI();
    try {
      await loadData();
    } catch (err) {
      // fallback: dejar UI operativa aunque data.json falle
      forceCloseAllModals();
      console.error(err);
      alert(`Error cargando data.json:\n${String(err?.message || err)}`);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
