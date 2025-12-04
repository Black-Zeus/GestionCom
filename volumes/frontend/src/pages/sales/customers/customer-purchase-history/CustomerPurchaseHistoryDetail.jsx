import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CustomerPurchaseHistoryDetail = ({
  customer,
  documents,
  allDocuments,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Calcular KPIs
  const calculateKPIs = () => {
    const totalDocs = documents.length;
    const totalAmount = documents.reduce(
      (sum, doc) => sum + (doc.total_amount || 0),
      0
    );
    const avgTicket = totalDocs > 0 ? totalAmount / totalDocs : 0;

    const lastPurchase =
      documents.length > 0
        ? documents
            .map((d) => d.document_date)
            .filter(Boolean)
            .sort()
            .slice(-1)[0]
        : null;

    return {
      totalDocs,
      totalAmount,
      avgTicket,
      lastPurchase,
    };
  };

  // Calcular comportamiento de pago
  const calculatePaymentBehavior = () => {
    let cashCount = 0;
    let creditCount = 0;

    documents.forEach((doc) => {
      if (doc.payment_condition === "CONTADO") cashCount++;
      else if (doc.payment_condition === "CREDITO") creditCount++;
    });

    const total = cashCount + creditCount;
    const cashPct = total > 0 ? Math.round((cashCount / total) * 100) : 0;
    const creditPct = total > 0 ? Math.round((creditCount / total) * 100) : 0;

    return { cashPct, creditPct };
  };

  // Calcular frecuencia de compra
  const calculatePurchaseFrequency = () => {
    if (allDocuments.length < 2) {
      return "Sin datos suficientes para calcular frecuencia (menos de 2 documentos).";
    }

    const dates = allDocuments
      .map((d) => new Date(d.document_date))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a - b);

    if (dates.length < 2) {
      return "Sin datos suficientes para calcular frecuencia.";
    }

    let totalDiff = 0;
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i] - dates[i - 1];
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      totalDiff += diffDays;
    }

    const avgDiff = totalDiff / Math.max(dates.length - 1, 1);
    const rounded = Math.round(avgDiff);

    let freqText = `Compra aproximadamente cada ${rounded} día(s).`;
    if (rounded <= 15) freqText += " Cliente de alta frecuencia.";
    else if (rounded <= 45) freqText += " Cliente de frecuencia media.";
    else freqText += " Cliente de baja frecuencia.";

    return freqText;
  };

  // Obtener badge de estado de documento
  const getDocumentStatusBadge = (status) => {
    const statusConfig = {
      COMPLETED: { label: "Completado", color: "green" },
      PAID: { label: "Completado", color: "green" },
      CLOSED: { label: "Completado", color: "green" },
      CANCELLED: { label: "Anulado", color: "red" },
      VOID: { label: "Anulado", color: "red" },
      DRAFT: { label: "Borrador", color: "gray" },
    };

    const config = statusConfig[status] || {
      label: "Desconocido",
      color: "gray",
    };

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
        <span className="text-sm text-gray-900">{config.label}</span>
      </div>
    );
  };

  // Obtener badge de condición de pago
  const getPaymentConditionBadge = (condition) => {
    if (condition === "CREDITO") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Crédito
        </span>
      );
    } else if (condition === "CONTADO") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Contado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        N/A
      </span>
    );
  };

  const kpis = calculateKPIs();
  const paymentBehavior = calculatePaymentBehavior();
  const frequencyText = calculatePurchaseFrequency();

  const displayName = customer.commercial_name || customer.legal_name || "-";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Historial del cliente
          </h2>
          <p className="text-sm text-gray-500">
            Resumen de compras, frecuencia, ticket promedio y mix de pago en el
            período seleccionado
          </p>
        </div>
        <div className="flex items-center gap-2">
          {customer.segment && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Segmento: {customer.segment}
            </span>
          )}
          {customer.customer_type && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {customer.customer_type === "COMPANY"
                ? "Empresa"
                : "Persona Natural"}
            </span>
          )}
        </div>
      </div>

      {/* Perfil del cliente */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Perfil del cliente
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              Nombre / Razón Social
            </div>
            <div className="text-sm font-medium text-gray-900">
              {displayName}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">RUT</div>
            <div className="text-sm font-medium text-gray-900">
              {customer.tax_id || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Contacto</div>
            <div className="text-sm font-medium text-gray-900">
              {customer.contact_person || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Correo</div>
            <div className="text-sm font-medium text-gray-900">
              {customer.email || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Ciudad / Región</div>
            <div className="text-sm font-medium text-gray-900">
              {[customer.city, customer.region].filter(Boolean).join(" / ") ||
                "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Fecha registro</div>
            <div className="text-sm font-medium text-gray-900">
              {customer.registration_date || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs de compras */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Resumen de compras del cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">
              Documentos en el período
            </p>
            <p className="text-2xl font-bold text-blue-600">{kpis.totalDocs}</p>
            <p className="text-xs text-gray-500 mt-1">
              Facturas, boletas y notas de crédito
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <p className="text-sm text-gray-600 mb-1">Monto total comprado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(kpis.totalAmount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Incluye notas de crédito
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <p className="text-sm text-gray-600 mb-1">Ticket promedio</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(kpis.avgTicket)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Monto promedio por documento
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <p className="text-sm text-gray-600 mb-1">Última compra</p>
            <p className="text-2xl font-bold text-orange-600">
              {kpis.lastPurchase || "-"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Fecha del último documento
            </p>
          </div>
        </div>
      </div>

      {/* Comportamiento de pago */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Comportamiento de pago
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Mix de condición de pago */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Mix de condición de pago
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Contado</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {paymentBehavior.cashPct}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${paymentBehavior.cashPct}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Crédito</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {paymentBehavior.creditPct}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${paymentBehavior.creditPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Frecuencia de compra */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Frecuencia de compra (aprox.)
            </p>
            <p className="text-sm text-gray-900 mb-2">{frequencyText}</p>
            <p className="text-xs text-gray-500">
              Se calcula como el promedio de días entre documentos emitidos en
              el período.
            </p>
          </div>
        </div>
      </div>

      {/* Documentos del cliente */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Documentos del cliente en el período
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Condición
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sucursal / Caja
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendedor
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    El cliente no tiene documentos en el período seleccionado
                  </td>
                </tr>
              ) : (
                [...documents]
                  .sort((a, b) => {
                    const dateA = new Date(a.document_date);
                    const dateB = new Date(b.document_date);
                    return dateB - dateA;
                  })
                  .map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(doc.document_date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {doc.document_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {doc.document_type_label}
                      </td>
                      <td className="px-4 py-3">
                        {getPaymentConditionBadge(doc.payment_condition)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {doc.warehouse_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {doc.cash_register_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {doc.seller_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(doc.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {getDocumentStatusBadge(doc.status)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistoryDetail;
