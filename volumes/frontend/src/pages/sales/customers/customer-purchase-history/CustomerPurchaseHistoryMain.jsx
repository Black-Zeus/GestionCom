import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import CustomerPurchaseHistoryIdentification from "./CustomerPurchaseHistoryIdentification";
import CustomerPurchaseHistoryFilters from "./CustomerPurchaseHistoryFilters";
import CustomerPurchaseHistoryEmpty from "./CustomerPurchaseHistoryEmpty";
import CustomerPurchaseHistoryDetail from "./CustomerPurchaseHistoryDetail";
import CustomerSearchModal from "./CustomerSearchModal";
import mockData from "./data.json";

const CustomerPurchaseHistoryMain = () => {
  // Datos del sistema
  const [customers, setCustomers] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Estado de selección
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filtros de documentos
  const [documentFilters, setDocumentFilters] = useState({
    dateFrom: "",
    dateTo: "",
    documentType: "ALL",
    paymentCondition: "ALL",
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCustomers(mockData.customers || []);
    setDocuments(mockData.documents || []);
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    // Reset filtros al cambiar de cliente
    setDocumentFilters({
      dateFrom: "",
      dateTo: "",
      documentType: "ALL",
      paymentCondition: "ALL",
    });
  };

  const handleOpenSearchModal = () => {
    ModalManager.custom({
      title: "Buscar cliente",
      size: "xlarge",
      content: (
        <CustomerSearchModal
          customers={customers}
          onSelectCustomer={handleSelectCustomer}
        />
      ),
    });
  };

  const handleFilterChange = (newFilters) => {
    setDocumentFilters(newFilters);
  };

  const handleClearFilters = () => {
    setDocumentFilters({
      dateFrom: "",
      dateTo: "",
      documentType: "ALL",
      paymentCondition: "ALL",
    });
  };

  // Filtrar documentos del cliente seleccionado
  const getFilteredDocuments = () => {
    if (!selectedCustomer) return [];

    let filtered = documents.filter(
      (doc) => doc.customer_id === selectedCustomer.id
    );

    // Filtro por rango de fechas
    if (documentFilters.dateFrom) {
      filtered = filtered.filter(
        (doc) =>
          new Date(doc.document_date) >= new Date(documentFilters.dateFrom)
      );
    }
    if (documentFilters.dateTo) {
      filtered = filtered.filter(
        (doc) => new Date(doc.document_date) <= new Date(documentFilters.dateTo)
      );
    }

    // Filtro por tipo de documento
    if (documentFilters.documentType !== "ALL") {
      filtered = filtered.filter(
        (doc) => doc.document_type_code === documentFilters.documentType
      );
    }

    // Filtro por condición de pago
    if (documentFilters.paymentCondition !== "ALL") {
      filtered = filtered.filter(
        (doc) => doc.payment_condition === documentFilters.paymentCondition
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();

  return (
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Icon name="chart" className="text-blue-600 text-3xl" />
              Historial de Compras del Cliente
            </h1>
            <p className="text-gray-500 text-sm">
              Analiza el comportamiento de compra de tus clientes: volumen,
              frecuencia, ticket promedio y mix contado/crédito
            </p>
          </div>
        </div>

        {/* Identificación del cliente */}
        <CustomerPurchaseHistoryIdentification
          selectedCustomer={selectedCustomer}
          onOpenSearch={handleOpenSearchModal}
        />

        {/* Filtros de compras */}
        <CustomerPurchaseHistoryFilters
          filters={documentFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          disabled={!selectedCustomer}
        />

        {/* Estado vacío o detalle */}
        {!selectedCustomer ? (
          <CustomerPurchaseHistoryEmpty />
        ) : (
          <CustomerPurchaseHistoryDetail
            customer={selectedCustomer}
            documents={filteredDocuments}
            allDocuments={documents.filter(
              (doc) => doc.customer_id === selectedCustomer.id
            )}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerPurchaseHistoryMain;
