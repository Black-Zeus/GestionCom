import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const SalesHistoryTable = ({ documents }) => {
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

  const getStatusBadge = (doc) => {
    const colorMap = {
      green: "bg-green-500",
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      orange: "bg-orange-500",
      red: "bg-red-500",
      gray: "bg-gray-500",
    };

    const bgColor = colorMap[doc.status_color] || "bg-gray-500";

    return (
      <span className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${bgColor}`}></span>
        <span className="text-sm text-gray-900">{doc.status_display_es}</span>
      </span>
    );
  };

  const handleRowClick = (doc) => {
    // TODO: Navegar a vista de detalle del documento
    console.log("Ver detalle del documento:", doc.id);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Fecha
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Tipo Documento
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Serie - Número
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Cliente
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Total
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Estado
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
              Vendedor
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.length === 0 ? (
            <tr>
              <td
                colSpan="10"
                className="px-6 py-12 text-center text-gray-500 text-sm"
              >
                No hay documentos que coincidan con los filtros aplicados
              </td>
            </tr>
          ) : (
            documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => handleRowClick(doc)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {/* Fecha */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(doc.document_date)}
                </td>

                {/* Tipo Documento */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {doc.document_type_name}
                    </span>
                    {doc.dte_folio && (
                      <span className="text-xs text-gray-500">
                        Folio: {doc.dte_folio}
                      </span>
                    )}
                  </div>
                </td>

                {/* Serie - Número */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex flex-col text-sm font-semibold text-blue-600">
                    {doc.series_code}-{doc.document_number}
                  </span>
                  {doc.is_return && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      <Icon name="return" className="text-xs mr-1" />
                      Devolución
                    </span>
                  )}
                </td>

                {/* Cliente */}
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {doc.customer_name || "Sin cliente"}
                    </span>
                    {doc.customer_tax_id && (
                      <span className="text-xs text-gray-500">
                        {doc.customer_tax_id}
                      </span>
                    )}
                  </div>
                </td>

                {/* Total */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                  {formatCurrency(doc.total_amount)}
                </td>

                {/* Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(doc)}
                </td>

                {/* Vendedor */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doc.created_by_name}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SalesHistoryTable;