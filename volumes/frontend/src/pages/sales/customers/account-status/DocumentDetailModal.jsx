import React from "react";
import ModalManager from "@/components/ui/modal/ModalManager";

const DocumentDetailModal = ({ document, customer }) => {
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      OPEN: { label: "Abierto", bgColor: "bg-blue-100", textColor: "text-blue-800" },
      PAID: { label: "Pagado", bgColor: "bg-green-100", textColor: "text-green-800" },
      APPLIED: { label: "Aplicado", bgColor: "bg-purple-100", textColor: "text-purple-800" },
      CANCELLED: { label: "Anulado", bgColor: "bg-red-100", textColor: "text-red-800" },
    };

    const config = statusConfig[status] || {
      label: status,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Datos generales */}
      <div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Documento</div>
            <div className="text-sm font-medium text-gray-900">
              {document.document_number}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Tipo</div>
            <div className="text-sm font-medium text-gray-900">
              {document.document_type_label}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Estado</div>
            <div className="text-sm font-medium text-gray-900">
              {getStatusBadge(document.status)}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Cliente</div>
            <div className="text-sm font-medium text-gray-900">
              {customer.commercial_name || customer.legal_name}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">RUT</div>
            <div className="text-sm font-medium text-gray-900">
              {customer.tax_id}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Sucursal</div>
            <div className="text-sm font-medium text-gray-900">
              {document.branch_name || "-"}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Vendedor</div>
            <div className="text-sm font-medium text-gray-900">
              {document.seller_name || "-"}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Canal</div>
            <div className="text-sm font-medium text-gray-900">
              {document.sales_channel || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Resumen financiero del documento
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Fecha emisión</div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(document.issue_date)}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Fecha vencimiento</div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(document.due_date)}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Condición de pago</div>
            <div className="text-sm font-medium text-gray-900">
              {document.payment_condition || "-"}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Monto original</div>
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(document.original_amount)}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Saldo pendiente</div>
            <div className="text-sm font-semibold text-blue-600">
              {formatCurrency(document.balance_amount)}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Días de atraso</div>
            <div className="text-sm font-medium text-gray-900">
              {(() => {
                const dueDate = new Date(document.due_date);
                const today = new Date();
                const diffTime = today - dueDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                return diffDays > 0 ? diffDays : 0;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de productos */}
      {document.line_items && document.line_items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Detalle de productos / ítems
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Precio unitario
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total línea
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {document.line_items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.product_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagos / movimientos */}
      {document.payments && document.payments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Pagos / movimientos asociados
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Referencia
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {document.payments.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {payment.reference}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Observaciones */}
      {document.observations && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Observaciones
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700">{document.observations}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetailModal;