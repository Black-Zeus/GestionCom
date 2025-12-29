/* =========================================================
   GestionCom • suppliers/contacts (vanilla)
   ---------------------------------------------------------
   Especificación funcional (explícita):
   - Objeto normalizado principal: contact
   - Columna de fecha principal: created_at
   - Columna de monto principal (equivalente): neto_activos (derivado)
   - Identificador (PK): contact_id
   - Catálogos asociados (selects): suppliers, contact_types, contact_categories,
     contact_statuses, cost_centers, countries
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

  const toLocalInputValue = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (x) => String(x).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const fromLocalInputValueToISO = (val) => {
    // Interpreta como local y convierte a ISO
    if (!val) return new Date().toISOString();
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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

    byId: {
      suppliers: new Map(),
      types: new Map(),
      categories: new Map(),
      statuses: new Map(),
      costCenters: new Map(),
      countries: new Map(),
    },

    contacts: [],

    filters: {
      term: "",
      date_from: "",
      date_to: "",
      status_id: "",
      type_id: "",
      category_id: "",
      supplier_id: "",
      cost_center_id: "",
      primary_only: false,
      active_only: false,
      with_email_only: false,
      do_not_contact_only: false,
    },

    sortBy: "date_desc",
    pageSize: 10,
    page: 1,

    confirm: { action: null, contact_id: null },
    editing: { contact_id: null, mode: "edit" }, // edit | new
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

  // -------- Load + init --------
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

    STATE.byId.suppliers = map(db.suppliers);
    STATE.byId.types = map(db.contact_types);
    STATE.byId.categories = map(db.contact_categories);
    STATE.byId.statuses = map(db.contact_statuses);
    STATE.byId.costCenters = map(db.cost_centers);
    STATE.byId.countries = map(db.countries);
  }

  function normalizeContacts(db) {
    const contacts = (db.supplier_contacts || []).map((c) => {
      const supplier = STATE.byId.suppliers.get(Number(c.supplier_id)) || null;
      const type = STATE.byId.types.get(Number(c.contact_type_id)) || null;
      const category = STATE.byId.categories.get(Number(c.category_id)) || null;
      const status = STATE.byId.statuses.get(Number(c.status_id)) || null;
      const cc = STATE.byId.costCenters.get(Number(c.cost_center_id)) || null;
      const country = STATE.byId.countries.get(Number(c.country_id)) || null;

      const statusLabel = status?.status_label || "—";
      const isFinal = isFinalStatusLabel(statusLabel);

      const supplierLabel = supplier ? `${supplier.supplier_code} • ${supplier.supplier_name}` : "—";

      return {
        ...c,
        contact_id: Number(c.id),
        supplier,
        type,
        category,
        status,
        cost_center: cc,
        country,

        is_final: isFinal,

        supplier_label: supplierLabel,
        type_label: type?.type_label || "—",
        category_label: category?.category_label || "—",
        status_label: statusLabel,
        cost_center_label: cc ? `${cc.cost_center_code} • ${cc.cost_center_name}` : "—",
        country_label: country?.country_name || "—",

        _search: [
          c.full_name,
          c.position,
          c.email,
          c.phone,
          c.city,
          c.address,
          c.notes,
          supplier?.supplier_code,
          supplier?.supplier_name,
          type?.type_label,
          category?.category_label,
          status?.status_label,
          cc?.cost_center_code,
          cc?.cost_center_name,
          country?.country_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    });

    contacts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return contacts;
  }

  // -------- Selects --------
  function fillSelect(
    selectEl,
    items,
    { valueKey = "id", labelKey = "label", includeEmpty = false, emptyLabel = "Todos" } = {}
  ) {
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
    const statuses = (STATE.db.contact_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const types = (STATE.db.contact_types || []).map((t) => ({ id: t.id, label: t.type_label }));
    const cats = (STATE.db.contact_categories || []).map((c) => ({ id: c.id, label: c.category_label }));
    const suppliers = (STATE.db.suppliers || []).map((s) => ({ id: s.id, label: `${s.supplier_code} • ${s.supplier_name}` }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));

    fillSelect($("#filterStatus"), statuses, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterType"), types, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCategory"), cats, { includeEmpty: true, emptyLabel: "Todas" });
    fillSelect($("#filterSupplier"), suppliers, { includeEmpty: true, emptyLabel: "Todos" });
    fillSelect($("#filterCostCenter"), ccs, { includeEmpty: true, emptyLabel: "Todos" });
  }

  function initEditSelects() {
    const suppliers = (STATE.db.suppliers || []).map((s) => ({ id: s.id, label: `${s.supplier_code} • ${s.supplier_name}` }));
    const types = (STATE.db.contact_types || []).map((t) => ({ id: t.id, label: t.type_label }));
    const cats = (STATE.db.contact_categories || []).map((c) => ({ id: c.id, label: c.category_label }));
    const statuses = (STATE.db.contact_statuses || []).map((s) => ({ id: s.id, label: s.status_label }));
    const ccs = (STATE.db.cost_centers || []).map((c) => ({ id: c.id, label: `${c.cost_center_code} • ${c.cost_center_name}` }));
    const countries = (STATE.db.countries || []).map((c) => ({ id: c.id, label: c.country_name }));

    fillSelect($("#editSupplier"), suppliers, { includeEmpty: false });
    fillSelect($("#editType"), types, { includeEmpty: false });
    fillSelect($("#editCategory"), cats, { includeEmpty: false });
    fillSelect($("#editStatus"), statuses, { includeEmpty: false });
    fillSelect($("#editCostCenter"), [{ id: "", label: "—" }, ...ccs], { includeEmpty: false });
    fillSelect($("#editCountry"), [{ id: "", label: "—" }, ...countries], { includeEmpty: false });
  }

  // -------- Filtering + sorting + paging --------
  function getFiltered() {
    const f = STATE.filters;
    const term = String(f.term || "").trim().toLowerCase();

    const from = f.date_from ? new Date(f.date_from + "T00:00:00") : null;
    const to = f.date_to ? new Date(f.date_to + "T23:59:59") : null;

    return STATE.contacts.filter((c) => {
      if (term && !c._search.includes(term)) return false;

      if (from) {
        const d = new Date(c.created_at);
        if (d < from) return false;
      }
      if (to) {
        const d = new Date(c.created_at);
        if (d > to) return false;
      }

      if (f.status_id && String(c.status_id) !== String(f.status_id)) return false;
      if (f.type_id && String(c.contact_type_id) !== String(f.type_id)) return false;
      if (f.category_id && String(c.category_id) !== String(f.category_id)) return false;
      if (f.supplier_id && String(c.supplier_id) !== String(f.supplier_id)) return false;

      if (f.cost_center_id) {
        if (String(c.cost_center_id || "") !== String(f.cost_center_id)) return false;
      }

      if (f.primary_only && !Boolean(c.is_primary)) return false;
      if (f.active_only && !Boolean(c.is_active)) return false;
      if (f.with_email_only && !String(c.email || "").trim()) return false;
      if (f.do_not_contact_only && !Boolean(c.do_not_contact)) return false;

      return true;
    });
  }

  function sortContacts(list) {
    const k = STATE.sortBy;
    const copy = list.slice();

    const byDateAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    const byNameAsc = (a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "es", { sensitivity: "base" });
    const byNameDesc = (a, b) => -byNameAsc(a, b);
    const bySupplierAsc = (a, b) => String(a.supplier?.supplier_name || "").localeCompare(String(b.supplier?.supplier_name || ""), "es", { sensitivity: "base" });
    const bySupplierDesc = (a, b) => -bySupplierAsc(a, b);

    switch (k) {
      case "date_asc": copy.sort(byDateAsc); break;
      case "date_desc": copy.sort(byDateDesc); break;
      case "name_asc": copy.sort(byNameAsc); break;
      case "name_desc": copy.sort(byNameDesc); break;
      case "supplier_asc": copy.sort(bySupplierAsc); break;
      case "supplier_desc": copy.sort(bySupplierDesc); break;
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

  // -------- KPIs --------
  function renderKpis(filtered) {
    const total = filtered.length;
    const pending = filtered.filter((c) => !c.is_final).length;
    const approved = filtered.filter((c) => String(c.status?.status_label || "").toLowerCase().includes("aprob")).length;
    const rejected = filtered.filter((c) => String(c.status?.status_label || "").toLowerCase().includes("rech")).length;

    const active = filtered.filter((c) => Boolean(c.is_active)).length;
    const inactive = total - active;
    const netActive = active - inactive;

    $("#kpiTotal").textContent = fmtInt(total);
    $("#kpiTotalSub").textContent = "Según filtros actuales";
    $("#kpiPending").textContent = fmtInt(pending);
    $("#kpiApproved").textContent = fmtInt(approved);
    $("#kpiRejected").textContent = fmtInt(rejected);

    $("#kpiNetActive").textContent = fmtInt(netActive);
    $("#kpiNetActiveSub").textContent = `Activos: ${fmtInt(active)} • Inactivos: ${fmtInt(inactive)}`;
  }

  // -------- Table rendering --------
  function statusBadge(statusLabel) {
    const v = String(statusLabel || "").toLowerCase();
    if (v.includes("aprob")) return { cls: "ok", label: statusLabel };
    if (v.includes("rech")) return { cls: "bad", label: statusLabel };
    return { cls: "warn", label: statusLabel || "Pendiente" };
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
    const filtered = sortContacts(getFiltered());
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
      .map((c) => {
        const st = statusBadge(c.status?.status_label);
        const isFinal = Boolean(c.is_final);

        const editBtn = 
          `<button class="icon-btn edit" data-act="edit" data-id="${c.contact_id}" title="Editar">✎</button>`;

        const approveBtn = isFinal
          ? `<button class="icon-btn approve" disabled title="Aprobar (bloqueado)">✓</button>`
          : `<button class="icon-btn approve" data-act="approve" data-id="${c.contact_id}" title="Aprobar">✓</button>`;

        const rejectBtn = isFinal
          ? `<button class="icon-btn reject" disabled title="Rechazar (bloqueado)">✕</button>`
          : `<button class="icon-btn reject" data-act="reject" data-id="${c.contact_id}" title="Rechazar">✕</button>`;

        const reverseBtn = isFinal
          ? `<button class="icon-btn reverse" data-act="reverse" data-id="${c.contact_id}" title="Reversar">⟲</button>`
          : "";

        const flags = [
          c.is_primary ? `<span class="badge info"><span class="dot"></span>Principal</span>` : "",
          c.is_active ? `<span class="badge ok"><span class="dot"></span>Activo</span>` : `<span class="badge warn"><span class="dot"></span>Inactivo</span>`,
          c.do_not_contact ? `<span class="badge bad"><span class="dot"></span>No contactar</span>` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const channels = [
          c.email ? `<span class="chip">✉ ${escapeHtml(c.email)}</span>` : "",
          c.phone ? `<span class="chip">☎ ${escapeHtml(c.phone)}</span>` : "",
        ].filter(Boolean).join(" ");

        return `
          <tr>
            <td>
              <div class="small">${escapeHtml(fmtDateTime(c.created_at))}</div>
              <div class="row-sub">${escapeHtml(c.country_label)}${c.city ? " • " + escapeHtml(c.city) : ""}</div>
            </td>

            <td>
              <div class="mono">${escapeHtml(c.supplier?.supplier_code || "—")}</div>
              <div class="row-sub">${escapeHtml(c.supplier?.supplier_name || "—")}</div>
            </td>

            <td>
              <div><strong>${escapeHtml(c.full_name || "—")}</strong></div>
              <div class="row-sub">${escapeHtml(c.position || "—")}</div>
            </td>

            <td>${escapeHtml(c.type_label)}</td>
            <td>${escapeHtml(c.category_label)}</td>

            <td>
              <span class="badge ${st.cls}">
                <span class="dot"></span>
                ${escapeHtml(st.label)}
              </span>
              ${flags ? `<div class="row-sub">${flags}</div>` : ""}
            </td>

            <td>${channels || "—"}</td>

            <td class="center">
              <div class="actions">
                <button class="icon-btn view" data-act="view" data-id="${c.contact_id}" title="Ver">👁</button>
                ${editBtn}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    renderPagination(page.totalPages);
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
    const closeId = e.target?.getAttribute?.("data-close");
    if (closeId) closeModal(closeId);
  }

  // -------- Contact get/update --------
  function findContact(id) {
    return STATE.contacts.find((c) => Number(c.contact_id) === Number(id)) || null;
  }

  function getInitialStatusId() {
    const s = (STATE.db.contact_statuses || []).find((x) => String(x.status_label) === WORKFLOW.initial_status_label);
    return s ? Number(s.id) : Number((STATE.db.contact_statuses || [])[0]?.id || 1);
  }

  function getStatusIdByLabelIncludes(fragmentLower) {
    const s = (STATE.db.contact_statuses || []).find((x) => String(x.status_label || "").toLowerCase().includes(fragmentLower));
    return s ? Number(s.id) : null;
  }

  function regenerateDerivedFields(c) {
    const supplier = STATE.byId.suppliers.get(Number(c.supplier_id)) || null;
    const type = STATE.byId.types.get(Number(c.contact_type_id)) || null;
    const category = STATE.byId.categories.get(Number(c.category_id)) || null;
    const status = STATE.byId.statuses.get(Number(c.status_id)) || null;
    const cc = STATE.byId.costCenters.get(Number(c.cost_center_id)) || null;
    const country = STATE.byId.countries.get(Number(c.country_id)) || null;

    const statusLabel = status?.status_label || "—";
    const isFinal = isFinalStatusLabel(statusLabel);

    c.supplier = supplier;
    c.type = type;
    c.category = category;
    c.status = status;
    c.cost_center = cc;
    c.country = country;

    c.is_final = isFinal;

    c.supplier_label = supplier ? `${supplier.supplier_code} • ${supplier.supplier_name}` : "—";
    c.type_label = type?.type_label || "—";
    c.category_label = category?.category_label || "—";
    c.status_label = statusLabel;
    c.cost_center_label = cc ? `${cc.cost_center_code} • ${cc.cost_center_name}` : "—";
    c.country_label = country?.country_name || "—";

    c._search = [
      c.full_name, c.position, c.email, c.phone, c.city, c.address, c.notes,
      supplier?.supplier_code, supplier?.supplier_name,
      type?.type_label, category?.category_label, status?.status_label,
      cc?.cost_center_code, cc?.cost_center_name,
      country?.country_name,
    ].filter(Boolean).join(" ").toLowerCase();
  }

  // -------- View modal --------
  function openView(contact_id) {
    const c = findContact(contact_id);
    if (!c) return;

    $("#modalViewSubtitle").textContent = `${c.full_name || "—"} • ${c.supplier_label || "—"}`;

    $("#viewSupplier").value = c.supplier_label || "—";
    $("#viewCreatedAt").value = fmtDateTime(c.created_at);
    $("#viewFullName").value = c.full_name || "—";
    $("#viewPosition").value = c.position || "—";
    $("#viewType").value = c.type_label || "—";
    $("#viewCategory").value = c.category_label || "—";
    $("#viewCostCenter").value = c.cost_center_label || "—";
    $("#viewStatus").value = c.status_label || "—";
    $("#viewEmail").value = c.email || "—";
    $("#viewPhone").value = c.phone || "—";
    $("#viewCountry").value = c.country_label || "—";
    $("#viewCity").value = c.city || "—";
    $("#viewAddress").value = c.address || "—";
    $("#viewNotes").value = c.notes || "—";

    $("#viewFlagPrimary").textContent = c.is_primary ? "Principal" : "No principal";
    $("#viewFlagActive").textContent = c.is_active ? "Activo" : "Inactivo";
    $("#viewFlagPrefersEmail").textContent = c.prefers_email ? "Prefiere email" : "Prefiere otro canal";
    $("#viewFlagDoNotContact").textContent = c.do_not_contact ? "No contactar" : "Contactable";

    $("#viewMeta").textContent = `ID: ${c.contact_id} • Actualizado: ${fmtDateTime(c.updated_at || c.created_at)}`;

    openModal("modalView");
  }

  // -------- Edit modal --------
  function clearEditErrors() {
    const box = $("#editErrors");
    box.classList.add("hidden");
    box.innerHTML = "";
  }

  function showEditErrors(lines) {
    const box = $("#editErrors");
    box.classList.remove("hidden");
    box.innerHTML = `<ul style="margin:0; padding-left: 18px">${lines.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  }

  function openEdit(contact_id, mode) {
    STATE.editing.contact_id = contact_id || null;
    STATE.editing.mode = mode;

    clearEditErrors();

    const isNew = mode === "new";
    const c = isNew
      ? {
          id: null,
          contact_id: null,
          supplier_id: Number((STATE.db.suppliers || [])[0]?.id || 1),
          full_name: "",
          position: "",
          contact_type_id: Number((STATE.db.contact_types || [])[0]?.id || 1),
          category_id: Number((STATE.db.contact_categories || [])[0]?.id || 1),
          status_id: getInitialStatusId(),
          cost_center_id: "",
          email: "",
          phone: "",
          country_id: "",
          city: "",
          address: "",
          notes: "",
          is_primary: false,
          is_active: true,
          prefers_email: true,
          do_not_contact: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          previous_status_id: null,
        }
      : findContact(contact_id);

    if (!c) return;

    $("#modalEditTitle").textContent = isNew ? "Nuevo contacto" : "Editar contacto";
    $("#modalEditSubtitle").textContent = isNew ? "Alta de contacto para proveedor" : `${c.full_name || "—"} • ${c.supplier_label || "—"}`;

    $("#editSupplier").value = String(c.supplier_id || "");
    $("#editCreatedAt").value = toLocalInputValue(c.created_at);
    $("#editFullName").value = c.full_name || "";
    $("#editPosition").value = c.position || "";
    $("#editType").value = String(c.contact_type_id || "");
    $("#editCategory").value = String(c.category_id || "");
    $("#editCostCenter").value = String(c.cost_center_id || "");
    $("#editStatus").value = String(c.status_id || "");
    $("#editEmail").value = c.email || "";
    $("#editPhone").value = c.phone || "";
    $("#editCountry").value = String(c.country_id || "");
    $("#editCity").value = c.city || "";
    $("#editAddress").value = c.address || "";
    $("#editNotes").value = c.notes || "";
    $("#editIsPrimary").checked = Boolean(c.is_primary);
    $("#editIsActive").checked = Boolean(c.is_active);
    $("#editPrefersEmail").checked = Boolean(c.prefers_email);
    $("#editDoNotContact").checked = Boolean(c.do_not_contact);

    $("#editMeta").textContent = isNew
      ? `Se asignará ID al guardar • Estado inicial: ${WORKFLOW.initial_status_label}`
      : `ID: ${c.contact_id} • Creado: ${fmtDateTime(c.created_at)} • Actualizado: ${fmtDateTime(c.updated_at || c.created_at)}`;

    // Regla: editar solo no-finalizados (UI ya lo oculta). Por seguridad:
    if (!isNew && c.is_final) {
      closeModal("modalEdit");
      return;
    }

    openModal("modalEdit");
  }

  function readEditForm() {
    return {
      supplier_id: Number($("#editSupplier").value || 0),
      created_at: fromLocalInputValueToISO($("#editCreatedAt").value),
      full_name: String($("#editFullName").value || "").trim(),
      position: String($("#editPosition").value || "").trim(),
      contact_type_id: Number($("#editType").value || 0),
      category_id: Number($("#editCategory").value || 0),
      cost_center_id: $("#editCostCenter").value ? Number($("#editCostCenter").value) : "",
      email: String($("#editEmail").value || "").trim(),
      phone: String($("#editPhone").value || "").trim(),
      country_id: $("#editCountry").value ? Number($("#editCountry").value) : "",
      city: String($("#editCity").value || "").trim(),
      address: String($("#editAddress").value || "").trim(),
      notes: String($("#editNotes").value || "").trim(),
      is_primary: Boolean($("#editIsPrimary").checked),
      is_active: Boolean($("#editIsActive").checked),
      prefers_email: Boolean($("#editPrefersEmail").checked),
      do_not_contact: Boolean($("#editDoNotContact").checked),
    };
  }

  function validateContact(payload) {
    const errs = [];
    if (!payload.supplier_id) errs.push("Proveedor es obligatorio.");
    if (!payload.full_name) errs.push("Nombre completo es obligatorio.");
    if (!payload.contact_type_id) errs.push("Tipo es obligatorio.");
    if (!payload.category_id) errs.push("Categoría es obligatoria.");

    const hasEmail = Boolean(payload.email);
    const hasPhone = Boolean(payload.phone);
    if (!hasEmail && !hasPhone) errs.push("Debe registrar al menos un canal: Email o Teléfono.");

    if (payload.do_not_contact && payload.is_active) {
      errs.push("Si el contacto está marcado como 'No contactar', se recomienda desactivar 'Activo' (ajústalo según política).");
    }
    return errs;
  }

  function saveEdit() {
    const isNew = STATE.editing.mode === "new";
    const payload = readEditForm();
    const errs = validateContact(payload);

    // warnings como error "suave": si do_not_contact + is_active, no bloqueamos
    const hardErrs = errs.filter((e) => !e.includes("se recomienda"));
    const softErrs = errs.filter((e) => e.includes("se recomienda"));

    if (hardErrs.length) {
      showEditErrors(hardErrs);
      return;
    }
    if (softErrs.length) {
      showEditErrors(softErrs);
      // no retornamos: se permite guardar con advertencia visible
    } else {
      clearEditErrors();
    }

    if (isNew) {
      const maxId = STATE.contacts.reduce((m, c) => Math.max(m, Number(c.contact_id || 0)), 0);
      const newId = maxId + 1;

      const c = {
        id: newId,
        contact_id: newId,
        status_id: getInitialStatusId(),
        previous_status_id: null,
        updated_at: new Date().toISOString(),
        ...payload,
      };

      STATE.contacts.push(c);
      regenerateDerivedFields(c);
    } else {
      const c = findContact(STATE.editing.contact_id);
      if (!c) return;

      if (c.is_final) return; // seguridad

      Object.assign(c, payload);
      c.updated_at = new Date().toISOString();
      // status se mantiene (disabled), workflow por acciones
      regenerateDerivedFields(c);
    }

    closeModal("modalEdit");
    renderTable();
  }

  // -------- Workflow (approve/reject/reverse) --------
  function openConfirm(action, contact_id) {
    const c = findContact(contact_id);
    if (!c) return;

    STATE.confirm.action = action;
    STATE.confirm.contact_id = contact_id;

    const actionLabel = action === "approve" ? "Aprobar" : action === "reject" ? "Rechazar" : "Confirmar";
    $("#modalConfirmSubtitle").textContent = `${actionLabel} • ${c.full_name || "—"}`;
    $("#confirmTitle").textContent = `${actionLabel} contacto`;
    $("#confirmSub").textContent = `${c.full_name || "—"} • ${c.supplier_label || "—"}`;
    $("#confirmMeta").textContent = `Estado actual: ${c.status_label || "—"}`;

    const ic = $("#confirmIcon");
    ic.textContent = action === "approve" ? "✓" : "✕";

    const ok = $("#btnConfirmOk");
    ok.classList.remove("btn-danger");
    ok.classList.add("btn-primary");
    if (action === "reject") {
      ok.classList.remove("btn-primary");
      ok.classList.add("btn-danger");
    }
    ok.textContent = "Confirmar";

    openModal("modalConfirm");
  }

  function doConfirmAction() {
    const { action, contact_id } = STATE.confirm;
    const c = findContact(contact_id);
    if (!c) return;

    if (action === "approve" || action === "reject") {
      if (c.is_final) return;

      const nextStatusId =
        action === "approve"
          ? getStatusIdByLabelIncludes("aprob")
          : getStatusIdByLabelIncludes("rech");

      if (!nextStatusId) return;

      c.previous_status_id = Number(c.status_id);
      c.status_id = Number(nextStatusId);
      c.updated_at = new Date().toISOString();
      regenerateDerivedFields(c);
    }

    closeModal("modalConfirm");
    STATE.confirm = { action: null, contact_id: null };
    renderTable();
  }

  function reverseContact(contact_id) {
    const c = findContact(contact_id);
    if (!c) return;

    if (!c.is_final) return;

    const fallback = getInitialStatusId();
    const prev = Number(c.previous_status_id || 0);
    c.status_id = prev || fallback;
    c.previous_status_id = null;
    c.updated_at = new Date().toISOString();
    regenerateDerivedFields(c);

    renderTable();
  }

  // -------- Events --------
  function bindEvents() {
    // global close on backdrop
    document.addEventListener("click", (e) => {
      closeAnyOnBackdropClick(e);

      // pagination
      const btn = e.target?.closest?.(".page-btn");
      if (btn && btn.dataset.page) {
        const p = Number(btn.dataset.page);
        if (Number.isFinite(p)) {
          STATE.page = p;
          renderTable();
        }
        return;
      }

      // table actions
      const actBtn = e.target?.closest?.("[data-act]");
      if (!actBtn) return;

      const act = actBtn.dataset.act;
      const id = Number(actBtn.dataset.id);

      if (act === "view") return openView(id);
      if (act === "edit") return openEdit(id, "edit");
      if (act === "approve") return openConfirm("approve", id);
      if (act === "reject") return openConfirm("reject", id);
      if (act === "reverse") return reverseContact(id);
    });

    $("#btnNew").addEventListener("click", () => openEdit(null, "new"));
    $("#btnReload").addEventListener("click", async () => {
      await boot(true);
    });

    $("#btnSave").addEventListener("click", (e) => {
      e.preventDefault();
      saveEdit();
    });

    $("#btnConfirmOk").addEventListener("click", (e) => {
      e.preventDefault();
      doConfirmAction();
    });

    // filters
    $("#btnClearFilters").addEventListener("click", () => {
      STATE.filters = {
        term: "",
        date_from: "",
        date_to: "",
        status_id: "",
        type_id: "",
        category_id: "",
        supplier_id: "",
        cost_center_id: "",
        primary_only: false,
        active_only: false,
        with_email_only: false,
        do_not_contact_only: false,
      };
      $("#filterTerm").value = "";
      $("#filterDateFrom").value = "";
      $("#filterDateTo").value = "";
      $("#filterStatus").value = "";
      $("#filterType").value = "";
      $("#filterCategory").value = "";
      $("#filterSupplier").value = "";
      $("#filterCostCenter").value = "";
      $("#togglePrimaryOnly").checked = false;
      $("#toggleActiveOnly").checked = false;
      $("#toggleWithEmail").checked = false;
      $("#toggleDoNotContact").checked = false;
      STATE.page = 1;
      renderTable();
    });

    $("#filterTerm").addEventListener(
      "input",
      debounce(() => {
        STATE.filters.term = $("#filterTerm").value || "";
        STATE.page = 1;
        renderTable();
      }, 180)
    );

    $("#filterDateFrom").addEventListener("change", () => {
      STATE.filters.date_from = $("#filterDateFrom").value || "";
      STATE.page = 1;
      renderTable();
    });
    $("#filterDateTo").addEventListener("change", () => {
      STATE.filters.date_to = $("#filterDateTo").value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#filterStatus").addEventListener("change", () => {
      STATE.filters.status_id = $("#filterStatus").value || "";
      STATE.page = 1;
      renderTable();
    });
    $("#filterType").addEventListener("change", () => {
      STATE.filters.type_id = $("#filterType").value || "";
      STATE.page = 1;
      renderTable();
    });
    $("#filterCategory").addEventListener("change", () => {
      STATE.filters.category_id = $("#filterCategory").value || "";
      STATE.page = 1;
      renderTable();
    });
    $("#filterSupplier").addEventListener("change", () => {
      STATE.filters.supplier_id = $("#filterSupplier").value || "";
      STATE.page = 1;
      renderTable();
    });
    $("#filterCostCenter").addEventListener("change", () => {
      STATE.filters.cost_center_id = $("#filterCostCenter").value || "";
      STATE.page = 1;
      renderTable();
    });

    $("#togglePrimaryOnly").addEventListener("change", () => {
      STATE.filters.primary_only = Boolean($("#togglePrimaryOnly").checked);
      STATE.page = 1;
      renderTable();
    });
    $("#toggleActiveOnly").addEventListener("change", () => {
      STATE.filters.active_only = Boolean($("#toggleActiveOnly").checked);
      STATE.page = 1;
      renderTable();
    });
    $("#toggleWithEmail").addEventListener("change", () => {
      STATE.filters.with_email_only = Boolean($("#toggleWithEmail").checked);
      STATE.page = 1;
      renderTable();
    });
    $("#toggleDoNotContact").addEventListener("change", () => {
      STATE.filters.do_not_contact_only = Boolean($("#toggleDoNotContact").checked);
      STATE.page = 1;
      renderTable();
    });

    $("#sortBy").addEventListener("change", () => {
      STATE.sortBy = $("#sortBy").value || "date_desc";
      STATE.page = 1;
      renderTable();
    });

    $("#pageSize").addEventListener("change", () => {
      STATE.pageSize = Number($("#pageSize").value || 10);
      STATE.page = 1;
      renderTable();
    });

    // ESC close
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      ["modalEdit", "modalView", "modalConfirm"].forEach((id) => {
        const m = $("#" + id);
        if (m && !m.classList.contains("hidden")) closeModal(id);
      });
    });
  }

  // -------- Boot --------
  async function boot(isReload = false) {
    try {
      const db = await loadData();
      STATE.db = db;
      buildMaps(db);
      STATE.contacts = normalizeContacts(db);

      initFilterSelects();
      initEditSelects();

      // Reset paging only on full reload
      if (isReload) STATE.page = 1;

      renderTable();
    } catch (err) {
      console.error(err);
      alert(`Error inicializando módulo: ${err.message || err}`);
    }
  }

  // start
  bindEvents();
  boot(false);
})();
