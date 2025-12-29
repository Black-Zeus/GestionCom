/* GestionCom • Content only (vanilla) */

const state = {
  data: [],
  filtered: [],
  page: 1,
  pageSize: 8,
  q: "",
  status: "",
  period: "",
  pendingAction: null, // { type: 'approve'|'reject'|'reverse', id }
};

const els = {};
document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEls();
  bindEvents();
  await loadData();
  applyFilters(true);
}

function bindEls() {
  [
    "q","status","period","btnClear","btnExport","btnRefresh","btnPrev","btnNext","btnNew",
    "tbody","rowsCount","pageNow","pageTotal",
    "kpiTotalCount","kpiTotalAmount",
    "kpiPendingCount","kpiPendingAmount",
    "kpiApprovedCount","kpiApprovedAmount",
    "kpiRejectedCount","kpiRejectedAmount",
    "backdrop","modalView","modalConfirm","modalEdit",
    "vFolio","vFecha","vProveedor","vEstado","vGlosa","vMonto",
    "confirmTitle","confirmSubtitle","confirmMsg","confirmHint","btnConfirmDo",
    "eFecha","eProveedor","eGlosa","eMonto","btnSave"
  ].forEach(id => (els[id] = document.getElementById(id)));

  // Delegado para cierres
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close")));
  });

  // Cerrar al click en backdrop
  els.backdrop.addEventListener("click", () => closeAllModals());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
}

function bindEvents() {
  els.q.addEventListener("input", () => { state.q = els.q.value.trim(); applyFilters(true); });
  els.status.addEventListener("change", () => { state.status = els.status.value; applyFilters(true); });
  els.period.addEventListener("change", () => { state.period = els.period.value; applyFilters(true); });

  els.btnClear.addEventListener("click", () => {
    els.q.value = "";
    els.status.value = "";
    els.period.value = "";
    state.q = ""; state.status = ""; state.period = "";
    applyFilters(true);
  });

  els.btnRefresh.addEventListener("click", () => applyFilters(false));
  els.btnPrev.addEventListener("click", () => { if (state.page > 1) { state.page--; render(); } });
  els.btnNext.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (state.page < totalPages) { state.page++; render(); }
  });

  els.btnExport.addEventListener("click", exportCsv);

  els.btnNew.addEventListener("click", () => {
    state.pendingAction = null;
    els.eFecha.value = isoToday();
    els.eProveedor.value = "";
    els.eGlosa.value = "";
    els.eMonto.value = "";
    openModal("modalEdit");
  });

  els.btnSave.addEventListener("click", () => {
    const payload = {
      id: cryptoRandomId(),
      folio: `G-${String(Math.floor(Math.random()*9000)+1000)}`,
      fecha: els.eFecha.value || isoToday(),
      proveedor: (els.eProveedor.value || "").trim() || "Proveedor N/D",
      glosa: (els.eGlosa.value || "").trim() || "Sin glosa",
      monto: toNumber(els.eMonto.value),
      estado: "Pendiente",
    };
    state.data.unshift(payload);
    applyFilters(true);
    closeModal("modalEdit");
  });
}

async function loadData() {
  const res = await fetch("data.json", { cache: "no-store" });
  const json = await res.json();
  state.data = Array.isArray(json?.items) ? json.items : [];
}

/* Filtering */
function applyFilters(resetPage) {
  if (resetPage) state.page = 1;

  const q = state.q.toLowerCase();
  const now = new Date();
  const from = periodToRange(state.period, now);

  state.filtered = state.data.filter(it => {
    const haystack = `${it.folio} ${it.proveedor} ${it.glosa}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (state.status && it.estado !== state.status) return false;

    if (from) {
      const d = new Date(it.fecha);
      if (d < from.start || d > from.end) return false;
    }

    return true;
  });

  computeKpis();
  render();
}

/* Rendering */
function render() {
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.pageSize;
  const pageItems = state.filtered.slice(start, start + state.pageSize);

  els.rowsCount.textContent = String(total);
  els.pageNow.textContent = String(state.page);
  els.pageTotal.textContent = String(totalPages);

  els.tbody.innerHTML = pageItems.map(rowTemplate).join("") || emptyRow();

  // Bind acciones por fila
  els.tbody.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", () => onRowAction(btn));
  });
}

function rowTemplate(it) {
  const chip = statusChip(it.estado);

  const isLocked = it.estado === "Aprobado" || it.estado === "Rechazado";
  const canEdit = it.estado === "Pendiente";
  const canApproveReject = it.estado === "Pendiente";
  const canReverse = isLocked;

  return `
    <tr>
      <td><span class="chip chip-neutral">${escapeHtml(it.folio)}</span></td>
      <td>${escapeHtml(fmtDate(it.fecha))}</td>
      <td>${escapeHtml(it.proveedor)}</td>
      <td>${escapeHtml(it.glosa)}</td>
      <td class="ta-r">${escapeHtml(fmtMoney(it.monto))}</td>
      <td>${chip}</td>
      <td class="ta-r">
        <div class="row-actions">
          <button class="btn mini btn-ghost" data-act="view" data-id="${it.id}">Ver</button>
          ${canEdit ? `<button class="btn mini btn-ghost" data-act="edit" data-id="${it.id}">Editar</button>` : ``}
          ${canApproveReject ? `
            <button class="btn mini btn-ghost" data-act="approve" data-id="${it.id}">Aprobar</button>
            <button class="btn mini btn-ghost" data-act="reject" data-id="${it.id}">Rechazar</button>
          ` : ``}
          ${canReverse ? `<button class="btn mini btn-primary" data-act="reverse" data-id="${it.id}">Reversar</button>` : ``}
        </div>
      </td>
    </tr>
  `;
}

function emptyRow() {
  return `
    <tr>
      <td colspan="7" class="muted" style="padding:18px;">
        Sin registros para los filtros actuales.
      </td>
    </tr>
  `;
}

/* Actions */
function onRowAction(btn) {
  const act = btn.getAttribute("data-act");
  const id = btn.getAttribute("data-id");
  const it = state.data.find(x => String(x.id) === String(id));
  if (!it) return;

  if (act === "view") return openView(it);

  if (act === "edit") {
    // Edición básica (placeholder); en Pendiente únicamente
    els.eFecha.value = it.fecha;
    els.eProveedor.value = it.proveedor;
    els.eGlosa.value = it.glosa;
    els.eMonto.value = String(it.monto ?? 0);
    state.pendingAction = { type: "edit", id: it.id };
    openModal("modalEdit");

    // Guardar sobrescribe
    els.btnSave.onclick = () => {
      it.fecha = els.eFecha.value || it.fecha;
      it.proveedor = (els.eProveedor.value || "").trim() || it.proveedor;
      it.glosa = (els.eGlosa.value || "").trim() || it.glosa;
      it.monto = toNumber(els.eMonto.value);
      applyFilters(false);
      closeModal("modalEdit");
      // restaurar handler original
      els.btnSave.onclick = null;
      bindEvents(); // simple: reatacha (idempotente por on* reset); suficiente para plantilla
    };
    return;
  }

  if (act === "approve") return confirmAction("Aprobar", it, "approve");
  if (act === "reject") return confirmAction("Rechazar", it, "reject");
  if (act === "reverse") return confirmAction("Reversar", it, "reverse");
}

function openView(it) {
  els.vFolio.textContent = it.folio;
  els.vFecha.textContent = fmtDate(it.fecha);
  els.vProveedor.textContent = it.proveedor;
  els.vEstado.textContent = it.estado;
  els.vGlosa.textContent = it.glosa;
  els.vMonto.textContent = fmtMoney(it.monto);
  els.viewSubtitle.textContent = `ID: ${it.id}`;
  openModal("modalView");
}

function confirmAction(label, it, type) {
  state.pendingAction = { type, id: it.id };

  els.confirmTitle.textContent = `Confirmar: ${label}`;
  els.confirmSubtitle.textContent = `${it.folio} • ${it.proveedor}`;
  els.confirmMsg.textContent = buildConfirmMsg(type, it);
  els.confirmHint.textContent = buildConfirmHint(type);

  // estilo del callout según acción
  const callout = els.confirmCallout;
  callout.style.borderColor =
    type === "approve" ? "rgba(34,197,94,.35)" :
    type === "reject"  ? "rgba(239,68,68,.35)" :
                         "rgba(59,130,246,.35)";

  els.btnConfirmDo.classList.remove("btn-primary");
  els.btnConfirmDo.classList.add("btn-primary");

  els.btnConfirmDo.onclick = () => {
    applyAction();
    closeModal("modalConfirm");
  };

  openModal("modalConfirm");
}

function applyAction() {
  const p = state.pendingAction;
  if (!p) return;

  const it = state.data.find(x => String(x.id) === String(p.id));
  if (!it) return;

  if (p.type === "approve") it.estado = "Aprobado";
  if (p.type === "reject") it.estado = "Rechazado";
  if (p.type === "reverse") it.estado = "Pendiente";

  state.pendingAction = null;
  applyFilters(false);
}

/* Modals helpers */
function openModal(id) {
  els.backdrop.classList.remove("hidden");
  els[id].classList.remove("hidden");
  els.backdrop.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  if (els[id]) els[id].classList.add("hidden");

  // Si no queda ningún modal visible, ocultar backdrop
  const anyOpen = ["modalView","modalConfirm","modalEdit"].some(m => !els[m].classList.contains("hidden"));
  if (!anyOpen) {
    els.backdrop.classList.add("hidden");
    els.backdrop.setAttribute("aria-hidden", "true");
  }
}

function closeAllModals() {
  ["modalView","modalConfirm","modalEdit"].forEach(closeModal);
}

/* KPI */
function computeKpis() {
  const items = state.filtered;

  const sum = (arr) => arr.reduce((a,b) => a + (Number(b.monto)||0), 0);

  const pending = items.filter(x => x.estado === "Pendiente");
  const approved = items.filter(x => x.estado === "Aprobado");
  const rejected = items.filter(x => x.estado === "Rechazado");

  els.kpiTotalCount.textContent = String(items.length);
  els.kpiTotalAmount.textContent = fmtMoney(sum(items));

  els.kpiPendingCount.textContent = String(pending.length);
  els.kpiPendingAmount.textContent = fmtMoney(sum(pending));

  els.kpiApprovedCount.textContent = String(approved.length);
  els.kpiApprovedAmount.textContent = fmtMoney(sum(approved));

  els.kpiRejectedCount.textContent = String(rejected.length);
  els.kpiRejectedAmount.textContent = fmtMoney(sum(rejected));
}

/* Export */
function exportCsv() {
  const rows = state.filtered.map(it => ({
    folio: it.folio,
    fecha: it.fecha,
    proveedor: it.proveedor,
    glosa: it.glosa,
    monto: it.monto,
    estado: it.estado
  }));

  const header = Object.keys(rows[0] || { folio:"",fecha:"",proveedor:"",glosa:"",monto:"",estado:"" });
  const csv = [header.join(",")]
    .concat(rows.map(r => header.map(k => csvCell(r[k])).join(",")))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Utils */
function statusChip(s) {
  const cls =
    s === "Pendiente" ? "chip-warn" :
    s === "Aprobado" ? "chip-ok" :
    s === "Rechazado" ? "chip-bad" :
    "chip-neutral";
  return `<span class="chip ${cls}">${escapeHtml(s || "—")}</span>`;
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-CL", { style:"currency", currency:"CLP", maximumFractionDigits:0 });
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("es-CL", { year:"numeric", month:"2-digit", day:"2-digit" });
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function periodToRange(period, now) {
  if (!period) return null;

  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === "thisMonth") {
    return { start: new Date(y, m, 1), end: new Date(y, m+1, 0, 23,59,59,999) };
  }
  if (period === "lastMonth") {
    return { start: new Date(y, m-1, 1), end: new Date(y, m, 0, 23,59,59,999) };
  }
  if (period === "thisYear") {
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23,59,59,999) };
  }
  return null;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

function buildConfirmMsg(type, it) {
  if (type === "approve") return `Se aprobará el gasto ${it.folio}.`;
  if (type === "reject") return `Se rechazará el gasto ${it.folio}.`;
  if (type === "reverse") return `Se reversará el estado del gasto ${it.folio} a "Pendiente".`;
  return "¿Confirmar operación?";
}

function buildConfirmHint(type) {
  if (type === "approve") return "La acción bloqueará edición y habilitará reversa.";
  if (type === "reject") return "La acción bloqueará edición y habilitará reversa.";
  if (type === "reverse") return "Se re-habilitarán acciones de aprobación/rechazo.";
  return "—";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function cryptoRandomId(){
  // suficiente para template local
  return (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}
