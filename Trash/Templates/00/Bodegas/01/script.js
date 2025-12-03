// ============================================
// DATOS DE PRUEBA (Mock Data)
// ============================================

const mockUsers = [
  { id: 1, name: "Juan Pérez", email: "juan.perez@empresa.cl" },
  { id: 2, name: "María González", email: "maria.gonzalez@empresa.cl" },
  { id: 3, name: "Carlos Rodríguez", email: "carlos.rodriguez@empresa.cl" },
  { id: 4, name: "Ana Martínez", email: "ana.martinez@empresa.cl" },
  { id: 5, name: "Pedro Silva", email: "pedro.silva@empresa.cl" },
];

const mockWarehouses = [
  {
    id: 1,
    warehouse_code: "BOD-001",
    warehouse_name: "Bodega Central Santiago",
    warehouse_type: "WAREHOUSE",
    responsible_user_id: 1,
    responsible_name: "Juan Pérez",
    address: "Av. Libertador Bernardo O'Higgins 1234",
    city: "Santiago",
    country: "Chile",
    phone: "+56 9 1234 5678",
    email: "bodega.central@empresa.cl",
    is_active: 1,
    users_count: 5,
    zones_count: 3,
    assigned_users: [1, 2, 3],
    zones: [
      {
        id: 1,
        zone_code: "Z-A",
        zone_name: "Zona A - Productos Frescos",
        zone_description: "Refrigerados y perecibles",
        is_location_tracking_enabled: 1,
        is_active: 1,
      },
      {
        id: 2,
        zone_code: "Z-B",
        zone_name: "Zona B - Abarrotes",
        zone_description: "Productos no perecibles",
        is_location_tracking_enabled: 0,
        is_active: 1,
      },
      {
        id: 3,
        zone_code: "Z-C",
        zone_name: "Zona C - Electrónica",
        zone_description: "Productos electrónicos",
        is_location_tracking_enabled: 1,
        is_active: 1,
      },
    ],
  },
  {
    id: 2,
    warehouse_code: "TDA-001",
    warehouse_name: "Tienda Mall Plaza",
    warehouse_type: "STORE",
    responsible_user_id: 2,
    responsible_name: "María González",
    address: "Mall Plaza Vespucio, Local 234",
    city: "Santiago",
    country: "Chile",
    phone: "+56 9 8765 4321",
    email: "tienda.plaza@empresa.cl",
    is_active: 1,
    users_count: 3,
    zones_count: 2,
    assigned_users: [2, 4],
    zones: [
      {
        id: 4,
        zone_code: "SALA",
        zone_name: "Sala de Ventas",
        zone_description: "Área principal de ventas",
        is_location_tracking_enabled: 0,
        is_active: 1,
      },
      {
        id: 5,
        zone_code: "TRAS",
        zone_name: "Trastienda",
        zone_description: "Almacenamiento interno",
        is_location_tracking_enabled: 1,
        is_active: 1,
      },
    ],
  },
  {
    id: 3,
    warehouse_code: "OUT-001",
    warehouse_name: "Outlet La Dehesa",
    warehouse_type: "OUTLET",
    responsible_user_id: 3,
    responsible_name: "Carlos Rodríguez",
    address: "Av. La Dehesa 1950",
    city: "Santiago",
    country: "Chile",
    phone: "+56 9 5555 6666",
    email: "outlet.dehesa@empresa.cl",
    is_active: 1,
    users_count: 2,
    zones_count: 1,
    assigned_users: [3, 5],
    zones: [
      {
        id: 6,
        zone_code: "PRINC",
        zone_name: "Zona Principal",
        zone_description: "Área de ventas y stock",
        is_location_tracking_enabled: 0,
        is_active: 1,
      },
    ],
  },
  {
    id: 4,
    warehouse_code: "BOD-002",
    warehouse_name: "Bodega Valparaíso",
    warehouse_type: "WAREHOUSE",
    responsible_user_id: 4,
    responsible_name: "Ana Martínez",
    address: "Calle Errázuriz 567",
    city: "Valparaíso",
    country: "Chile",
    phone: "+56 9 7777 8888",
    email: "bodega.valpo@empresa.cl",
    is_active: 0,
    users_count: 1,
    zones_count: 2,
    assigned_users: [4],
    zones: [
      {
        id: 7,
        zone_code: "Z-1",
        zone_name: "Zona 1",
        zone_description: "Primera zona",
        is_location_tracking_enabled: 1,
        is_active: 1,
      },
      {
        id: 8,
        zone_code: "Z-2",
        zone_name: "Zona 2",
        zone_description: "Segunda zona",
        is_location_tracking_enabled: 0,
        is_active: 0,
      },
    ],
  },
];

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

let state = {
  warehouses: [...mockWarehouses],
  filteredWarehouses: [...mockWarehouses],
  currentPage: 1,
  itemsPerPage: 10,
  currentWarehouse: null,
  currentFilter: {
    search: "",
    type: "",
    status: "",
  },
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  loadUsers();
  renderWarehouses();
  bindEvents();
}

// ============================================
// CARGA DE DATOS
// ============================================

function loadUsers() {
  const selects = ["responsibleUser", "selectUser"];
  selects.forEach((selectId) => {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccionar usuario</option>';
    mockUsers.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = `${user.name} (${user.email})`;
      select.appendChild(option);
    });
  });
}

// ============================================
// RENDERIZADO DE TABLA
// ============================================

function renderWarehouses() {
  const tbody = document.getElementById("warehousesTableBody");
  const { filteredWarehouses, currentPage, itemsPerPage } = state;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWarehouses = filteredWarehouses.slice(startIndex, endIndex);

  if (paginatedWarehouses.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: var(--secondary);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    No se encontraron bodegas
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = paginatedWarehouses
    .map(
      (warehouse) => `
        <tr>
            <td><strong>${warehouse.warehouse_code}</strong></td>
            <td>${warehouse.warehouse_name}</td>
            <td><span class="warehouse-type">${getWarehouseTypeLabel(
              warehouse.warehouse_type
            )}</span></td>
            <td>${warehouse.responsible_name}</td>
            <td>${warehouse.city}</td>
            <td><span class="count-text">${warehouse.users_count}</span></td>
            <td><span class="count-text">${warehouse.zones_count}</span></td>
            <td><span class="status-${
              warehouse.is_active ? "active" : "inactive"
            }">${warehouse.is_active ? "Activo" : "Inactivo"}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action edit" onclick="editWarehouse(${
                      warehouse.id
                    })" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action zones" onclick="manageZones(${
                      warehouse.id
                    })" title="Gestionar Zonas">
                        <i class="fas fa-layer-group"></i>
                    </button>
                    <button class="btn-action users" onclick="manageUsers(${
                      warehouse.id
                    })" title="Asignar Usuarios">
                        <i class="fas fa-users"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteWarehouse(${
                      warehouse.id
                    })" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");

  updatePagination();
}

function getWarehouseTypeLabel(type) {
  const labels = {
    WAREHOUSE: "Bodega",
    STORE: "Tienda",
    OUTLET: "Outlet",
  };
  return labels[type] || type;
}

function updatePagination() {
  const { filteredWarehouses, currentPage, itemsPerPage } = state;
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);

  document.getElementById("currentPage").textContent = currentPage;
  document.getElementById("totalPages").textContent = totalPages;
  document.getElementById("btnPrevPage").disabled = currentPage === 1;
  document.getElementById("btnNextPage").disabled =
    currentPage === totalPages || totalPages === 0;
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

function applyFilters() {
  const { search, type, status } = state.currentFilter;

  state.filteredWarehouses = state.warehouses.filter((warehouse) => {
    const matchSearch =
      !search ||
      warehouse.warehouse_code.toLowerCase().includes(search.toLowerCase()) ||
      warehouse.warehouse_name.toLowerCase().includes(search.toLowerCase()) ||
      warehouse.city.toLowerCase().includes(search.toLowerCase());

    const matchType = !type || warehouse.warehouse_type === type;
    const matchStatus =
      status === "" || warehouse.is_active === parseInt(status);

    return matchSearch && matchType && matchStatus;
  });

  state.currentPage = 1;
  renderWarehouses();
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterType").value = "";
  document.getElementById("filterStatus").value = "";
  state.currentFilter = { search: "", type: "", status: "" };
  applyFilters();
}

// ============================================
// GESTIÓN DE BODEGAS
// ============================================

function openWarehouseModal(warehouse = null) {
  const modal = document.getElementById("modalWarehouse");
  const title = document.getElementById("modalWarehouseTitle");
  const form = document.getElementById("formWarehouse");

  form.reset();

  if (warehouse) {
    title.innerHTML = '<i class="fas fa-edit"></i> Editar Bodega';
    document.getElementById("warehouseId").value = warehouse.id;
    document.getElementById("warehouseCode").value = warehouse.warehouse_code;
    document.getElementById("warehouseName").value = warehouse.warehouse_name;
    document.getElementById("warehouseType").value = warehouse.warehouse_type;
    document.getElementById("responsibleUser").value =
      warehouse.responsible_user_id;
    document.getElementById("warehouseAddress").value = warehouse.address || "";
    document.getElementById("warehouseCity").value = warehouse.city || "";
    document.getElementById("warehouseCountry").value = warehouse.country || "";
    document.getElementById("warehousePhone").value = warehouse.phone || "";
    document.getElementById("warehouseEmail").value = warehouse.email || "";
    document.getElementById("warehouseIsActive").checked = warehouse.is_active;
  } else {
    title.innerHTML = '<i class="fas fa-warehouse"></i> Nueva Bodega';
    document.getElementById("warehouseId").value = "";
    document.getElementById("warehouseIsActive").checked = true;
  }

  modal.classList.add("active");
}

function closeWarehouseModal() {
  document.getElementById("modalWarehouse").classList.remove("active");
}

function saveWarehouse() {
  const id = document.getElementById("warehouseId").value;
  const formData = {
    warehouse_code: document.getElementById("warehouseCode").value,
    warehouse_name: document.getElementById("warehouseName").value,
    warehouse_type: document.getElementById("warehouseType").value,
    responsible_user_id: parseInt(
      document.getElementById("responsibleUser").value
    ),
    address: document.getElementById("warehouseAddress").value,
    city: document.getElementById("warehouseCity").value,
    country: document.getElementById("warehouseCountry").value,
    phone: document.getElementById("warehousePhone").value,
    email: document.getElementById("warehouseEmail").value,
    is_active: document.getElementById("warehouseIsActive").checked ? 1 : 0,
  };

  // Validación básica
  if (
    !formData.warehouse_code ||
    !formData.warehouse_name ||
    !formData.warehouse_type ||
    !formData.responsible_user_id
  ) {
    alert("Por favor complete todos los campos obligatorios");
    return;
  }

  if (id) {
    // Editar
    const index = state.warehouses.findIndex((w) => w.id === parseInt(id));
    if (index !== -1) {
      state.warehouses[index] = {
        ...state.warehouses[index],
        ...formData,
        responsible_name:
          mockUsers.find((u) => u.id === formData.responsible_user_id)?.name ||
          "",
      };
    }
  } else {
    // Crear nuevo
    const newId = Math.max(...state.warehouses.map((w) => w.id)) + 1;
    state.warehouses.push({
      id: newId,
      ...formData,
      responsible_name:
        mockUsers.find((u) => u.id === formData.responsible_user_id)?.name ||
        "",
      users_count: 0,
      zones_count: 0,
      assigned_users: [],
      zones: [],
    });
  }

  applyFilters();
  closeWarehouseModal();
  showNotification(
    id ? "Bodega actualizada exitosamente" : "Bodega creada exitosamente",
    "success"
  );
}

function editWarehouse(id) {
  const warehouse = state.warehouses.find((w) => w.id === id);
  if (warehouse) {
    openWarehouseModal(warehouse);
  }
}

function deleteWarehouse(id) {
  const warehouse = state.warehouses.find((w) => w.id === id);
  if (warehouse) {
    state.currentWarehouse = warehouse;
    document.getElementById(
      "confirmMessage"
    ).textContent = `¿Está seguro que desea eliminar la bodega "${warehouse.warehouse_name}"?`;
    document.getElementById("modalConfirm").classList.add("active");
  }
}

function confirmDelete() {
  if (state.currentWarehouse) {
    const index = state.warehouses.findIndex(
      (w) => w.id === state.currentWarehouse.id
    );
    if (index !== -1) {
      state.warehouses.splice(index, 1);
      applyFilters();
      showNotification("Bodega eliminada exitosamente", "success");
    }
  }
  closeConfirmModal();
}

function closeConfirmModal() {
  document.getElementById("modalConfirm").classList.remove("active");
  state.currentWarehouse = null;
}

// ============================================
// GESTIÓN DE ZONAS
// ============================================

function manageZones(id) {
  const warehouse = state.warehouses.find((w) => w.id === id);
  if (warehouse) {
    state.currentWarehouse = warehouse;
    document.getElementById(
      "zonesWarehouseName"
    ).textContent = `Bodega: ${warehouse.warehouse_name}`;
    renderZones();
    document.getElementById("modalZones").classList.add("active");
  }
}

function renderZones() {
  const container = document.getElementById("zonesList");
  const zones = state.currentWarehouse?.zones || [];

  if (zones.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--secondary);">
                <i class="fas fa-layer-group" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                No hay zonas configuradas
            </div>
        `;
    return;
  }

  container.innerHTML = zones
    .map(
      (zone) => `
        <div class="zone-item">
            <div class="zone-info">
                <h4>${zone.zone_code} - ${zone.zone_name}</h4>
                <p>${zone.zone_description || "Sin descripción"}</p>
                <p style="font-size: 0.8rem; margin-top: 0.25rem; color: #6b7280;">
                    ${
                      zone.is_location_tracking_enabled
                        ? '<i class="fas fa-map-marker-alt"></i> Seguimiento activo'
                        : '<i class="fas fa-map-marker-alt" style="opacity: 0.3;"></i> Sin seguimiento'
                    }
                    | <span class="status-${
                      zone.is_active ? "active" : "inactive"
                    }">${zone.is_active ? "Activa" : "Inactiva"}</span>
                </p>
            </div>
            <div class="zone-actions">
                <button class="btn-action edit" onclick="editZone(${
                  zone.id
                })" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" onclick="deleteZone(${
                  zone.id
                })" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function addZone() {
  const zoneCode = prompt("Código de zona:");
  if (!zoneCode) return;

  const zoneName = prompt("Nombre de zona:");
  if (!zoneName) return;

  const newZone = {
    id: Date.now(),
    zone_code: zoneCode,
    zone_name: zoneName,
    zone_description: "",
    is_location_tracking_enabled: 0,
    is_active: 1,
  };

  state.currentWarehouse.zones.push(newZone);
  state.currentWarehouse.zones_count = state.currentWarehouse.zones.length;
  renderZones();
  applyFilters();
  showNotification("Zona agregada exitosamente", "success");
}

function editZone(zoneId) {
  const zone = state.currentWarehouse.zones.find((z) => z.id === zoneId);
  if (!zone) return;

  const newName = prompt("Nuevo nombre:", zone.zone_name);
  if (newName) {
    zone.zone_name = newName;
    renderZones();
    applyFilters();
    showNotification("Zona actualizada exitosamente", "success");
  }
}

function deleteZone(zoneId) {
  if (confirm("¿Está seguro de eliminar esta zona?")) {
    const index = state.currentWarehouse.zones.findIndex(
      (z) => z.id === zoneId
    );
    if (index !== -1) {
      state.currentWarehouse.zones.splice(index, 1);
      state.currentWarehouse.zones_count = state.currentWarehouse.zones.length;
      renderZones();
      applyFilters();
      showNotification("Zona eliminada exitosamente", "success");
    }
  }
}

function closeZonesModal() {
  document.getElementById("modalZones").classList.remove("active");
  state.currentWarehouse = null;
}

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

function manageUsers(id) {
  const warehouse = state.warehouses.find((w) => w.id === id);
  if (warehouse) {
    state.currentWarehouse = warehouse;
    document.getElementById(
      "usersWarehouseName"
    ).textContent = `Bodega: ${warehouse.warehouse_name}`;
    renderAssignedUsers();
    document.getElementById("modalUsers").classList.add("active");
  }
}

function renderAssignedUsers() {
  const container = document.getElementById("assignedUsersList");
  const assignedUserIds = state.currentWarehouse?.assigned_users || [];
  const assignedUsers = mockUsers.filter((u) => assignedUserIds.includes(u.id));

  if (assignedUsers.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--secondary);">
                <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                No hay usuarios asignados
            </div>
        `;
    return;
  }

  container.innerHTML = assignedUsers
    .map(
      (user) => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-avatar">${user.name.charAt(0)}</div>
                <div class="user-details">
                    <h4>${user.name}</h4>
                    <p>${user.email}</p>
                </div>
            </div>
            <button class="btn-action delete" onclick="removeUser(${
              user.id
            })" title="Quitar">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `
    )
    .join("");
}

function addUser() {
  const userId = parseInt(document.getElementById("selectUser").value);
  if (!userId) {
    alert("Por favor seleccione un usuario");
    return;
  }

  if (state.currentWarehouse.assigned_users.includes(userId)) {
    alert("El usuario ya está asignado a esta bodega");
    return;
  }

  state.currentWarehouse.assigned_users.push(userId);
  state.currentWarehouse.users_count =
    state.currentWarehouse.assigned_users.length;
  document.getElementById("selectUser").value = "";
  renderAssignedUsers();
  applyFilters();
  showNotification("Usuario asignado exitosamente", "success");
}

function removeUser(userId) {
  if (confirm("¿Está seguro de quitar este usuario?")) {
    const index = state.currentWarehouse.assigned_users.indexOf(userId);
    if (index !== -1) {
      state.currentWarehouse.assigned_users.splice(index, 1);
      state.currentWarehouse.users_count =
        state.currentWarehouse.assigned_users.length;
      renderAssignedUsers();
      applyFilters();
      showNotification("Usuario removido exitosamente", "success");
    }
  }
}

function closeUsersModal() {
  document.getElementById("modalUsers").classList.remove("active");
  state.currentWarehouse = null;
}

// ============================================
// NOTIFICACIONES
// ============================================

function showNotification(message, type = "info") {
  // Implementación simple con alert (puedes mejorarla con toast notifications)
  console.log(`[${type.toUpperCase()}] ${message}`);

  // Puedes agregar aquí tu sistema de notificaciones personalizado
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === "success" ? "#10b981" : "#ef4444"};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// EVENTOS
// ============================================

function bindEvents() {
  // Búsqueda
  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.currentFilter.search = e.target.value;
    applyFilters();
  });

  // Filtros
  document.getElementById("filterType").addEventListener("change", (e) => {
    state.currentFilter.type = e.target.value;
    applyFilters();
  });

  document.getElementById("filterStatus").addEventListener("change", (e) => {
    state.currentFilter.status = e.target.value;
    applyFilters();
  });

  document
    .getElementById("btnClearFilters")
    .addEventListener("click", clearFilters);

  // Paginación
  document.getElementById("btnPrevPage").addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderWarehouses();
    }
  });

  document.getElementById("btnNextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(
      state.filteredWarehouses.length / state.itemsPerPage
    );
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderWarehouses();
    }
  });

  // Modal Bodega
  document
    .getElementById("btnNewWarehouse")
    .addEventListener("click", () => openWarehouseModal());
  document
    .getElementById("btnCloseWarehouse")
    .addEventListener("click", closeWarehouseModal);
  document
    .getElementById("btnCancelWarehouse")
    .addEventListener("click", closeWarehouseModal);
  document
    .getElementById("btnSaveWarehouse")
    .addEventListener("click", saveWarehouse);

  // Modal Zonas
  document
    .getElementById("btnCloseZones")
    .addEventListener("click", closeZonesModal);
  document
    .getElementById("btnCloseZonesModal")
    .addEventListener("click", closeZonesModal);
  document.getElementById("btnAddZone").addEventListener("click", addZone);

  // Modal Usuarios
  document
    .getElementById("btnCloseUsers")
    .addEventListener("click", closeUsersModal);
  document
    .getElementById("btnCloseUsersModal")
    .addEventListener("click", closeUsersModal);
  document.getElementById("btnAddUser").addEventListener("click", addUser);

  // Modal Confirmación
  document
    .getElementById("btnCloseConfirm")
    .addEventListener("click", closeConfirmModal);
  document
    .getElementById("btnCancelConfirm")
    .addEventListener("click", closeConfirmModal);
  document
    .getElementById("btnConfirmDelete")
    .addEventListener("click", confirmDelete);

  // Cerrar modales al hacer click fuera
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });
}

// ============================================
// ANIMACIONES CSS ADICIONALES
// ============================================

const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
