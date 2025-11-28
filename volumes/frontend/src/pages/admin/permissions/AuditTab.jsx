import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import Pagination from "@components/common/pagination/Pagination"
import AuditDetailModal from "./AuditDetailModal";

const AuditTab = ({ data }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    action: "",
    dateFrom: "",
    dateTo: "",
  });
  const itemsPerPage = 10;

  useEffect(() => {
    setAuditLogs(data.auditLog);
    setFilteredLogs(data.auditLog);
  }, [data]);

  useEffect(() => {
    applyFilters();
  }, [filters, auditLogs]);

  const applyFilters = () => {
    const filtered = auditLogs.filter((log) => {
      const matchSearch =
        !filters.search ||
        log.actor_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (log.target_user_name &&
          log.target_user_name
            .toLowerCase()
            .includes(filters.search.toLowerCase()));

      const matchAction =
        !filters.action || log.action_type === filters.action;

      const logDate = new Date(log.created_at);
      const matchDateFrom =
        !filters.dateFrom || logDate >= new Date(filters.dateFrom);
      const matchDateTo =
        !filters.dateTo ||
        logDate <=
          new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999));

      return matchSearch && matchAction && matchDateFrom && matchDateTo;
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleViewDetail = (log) => {
    ModalManager.custom({
      title: "Detalle del Registro de Auditoría",
      size: "large",
      content: (
        <AuditDetailModal log={log} onClose={() => ModalManager.closeAll()} />
      ),
    });
  };

  const clearFilters = () => {
    setFilters({ search: "", action: "", dateFrom: "", dateTo: "" });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Paginación
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Log de Auditoría
        </h2>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Icon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar por usuario..."
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-blue-600 transition-all"
          >
            <option value="">Todas las acciones</option>
            <option value="ASSIGN_ROLE">Asignar Rol</option>
            <option value="REVOKE_ROLE">Revocar Rol</option>
            <option value="GRANT_PERMISSION">Conceder Permiso</option>
            <option value="REVOKE_PERMISSION">Revocar Permiso</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value })
            }
            className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-all"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-all"
            placeholder="Hasta"
          />

          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Icon name="close" className="text-sm" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {paginatedLogs.length === 0 ? (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
          <div className="text-center py-16 text-gray-400">
            <Icon name="inbox" className="text-5xl mb-4" />
            <p>No se encontraron registros</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-6">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Usuario Afectado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 font-bold">{ log.action_type }</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.actor_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.target_user_name || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {log.description}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDetail(log)}
                      title="Ver detalle"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Icon name="eye" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default AuditTab;