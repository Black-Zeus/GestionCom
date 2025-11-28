import React, { useState, useEffect } from "react";
import SalesHistoryFilters from "./SalesHistoryFilters";
import SalesHistoryTable from "./SalesHistoryTable";
import SalesHistorySummary from "./SalesHistorySummary";
import Pagination from "@components/common/pagination/Pagination"
import { Icon } from "@components/ui/icon/iconManager";
import mockData from "./data.json";

const SalesHistoryManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [series, setSeries] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
    documentType: "",
    customer: "",
    status: "",
    user: "",
    series: "",
    includeReturns: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters();
  }, [filters, documents]);

  const loadData = () => {
    setDocuments(mockData.documents);
    setDocumentTypes(mockData.document_types);
    setCustomers(mockData.customers);
    setUsers(mockData.users);
    setSeries(mockData.document_series);
    setStatuses(mockData.system_statuses);
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Filtro de búsqueda (número documento, cliente, RUT)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.document_number.toLowerCase().includes(searchLower) ||
          doc.customer_name?.toLowerCase().includes(searchLower) ||
          doc.customer_tax_id?.toLowerCase().includes(searchLower) ||
          doc.series_code?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro de rango de fechas
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (doc) => new Date(doc.document_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (doc) => new Date(doc.document_date) <= new Date(filters.dateTo)
      );
    }

    // Filtro por tipo de documento
    if (filters.documentType) {
      filtered = filtered.filter(
        (doc) => doc.document_type_id === parseInt(filters.documentType, 10)
      );
    }

    // Filtro por cliente
    if (filters.customer) {
      filtered = filtered.filter(
        (doc) => doc.customer_id === parseInt(filters.customer, 10)
      );
    }

    // Filtro por estado
    if (filters.status) {
      filtered = filtered.filter(
        (doc) => doc.status_id === parseInt(filters.status, 10)
      );
    }

    // Filtro por usuario/vendedor
    if (filters.user) {
      filtered = filtered.filter(
        (doc) => doc.created_by_user_id === parseInt(filters.user, 10)
      );
    }

    // Filtro por serie
    if (filters.series) {
      filtered = filtered.filter(
        (doc) => doc.document_series_id === parseInt(filters.series, 10)
      );
    }

    // Filtro de devoluciones
    if (!filters.includeReturns) {
      filtered = filtered.filter((doc) => !doc.is_return);
    }

    setFilteredDocuments(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      dateFrom: "",
      dateTo: "",
      documentType: "",
      customer: "",
      status: "",
      user: "",
      series: "",
      includeReturns: true,
    });
  };

  // Cálculo de estadísticas
  const calculateSummary = () => {
    const totalDocuments = filteredDocuments.length;
    const totalSales = filteredDocuments.reduce(
      (sum, doc) => sum + (doc.total_amount || 0),
      0
    );
    const totalTax = filteredDocuments.reduce(
      (sum, doc) => sum + (doc.tax_amount || 0),
      0
    );
    const totalDiscount = filteredDocuments.reduce(
      (sum, doc) => sum + (doc.discount_amount || 0),
      0
    );
    const totalSubtotal = filteredDocuments.reduce(
      (sum, doc) => sum + (doc.subtotal || 0),
      0
    );
    const averageSale = totalDocuments > 0 ? totalSales / totalDocuments : 0;

    return {
      totalDocuments,
      totalSales,
      totalTax,
      totalDiscount,
      totalSubtotal,
      averageSale,
    };
  };

  const summary = calculateSummary();

  // Paginación
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="chart" className="text-blue-600 text-3xl" />
              Historial de Ventas
            </h1>
            <p className="text-gray-500 text-sm">
              Visualiza y analiza el historial completo de documentos de venta
            </p>
          </div>
        </div>

        {/* Resumen de Estadísticas */}
        <SalesHistorySummary summary={summary} />

        {/* Filtros */}
        <SalesHistoryFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          documentTypes={documentTypes}
          customers={customers}
          users={users}
          series={series}
          statuses={statuses}
        />

        {/* Tabla */}
        <SalesHistoryTable documents={paginatedDocuments} />

        {/* Paginación */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default SalesHistoryManagement;