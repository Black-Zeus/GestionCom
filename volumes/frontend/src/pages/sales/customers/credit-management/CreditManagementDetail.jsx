import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const CreditManagementDetail = ({
  customer,
  creditConfig,
  receivables,
  exceptions,
  onBack,
  getCreditStatus,
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

  const getRiskBadge = (riskLevel) => {
    const riskConfig = {
      LOW: {
        label: "Bajo",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
      },
      MEDIUM: {
        label: "Medio",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
      },
      HIGH: { label: "Alto", bgColor: "bg-red-100", textColor: "text-red-700" },
    };

    const config = riskConfig[riskLevel] || riskConfig.LOW;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      >
        {config.label}
      </span>
    );
  };

  const getCreditStatusBadge = () => {
    const status = getCreditStatus(customer.id);
    const statusConfig = {
      NORMAL: {
        label: "Normal",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
      },
      EN_MORA: {
        label: "Con mora",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
      },
      BLOQUEADO: {
        label: "Bloqueado",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
      },
    };

    const config = statusConfig[status] || statusConfig.NORMAL;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      >
        {config.label}
      </span>
    );
  };

  const getReceivableStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: "Pendiente", color: "blue" },
      OVERDUE: { label: "Vencido", color: "yellow" },
      IN_COLLECTION: { label: "En cobranza", color: "red" },
      PAID: { label: "Pagado", color: "green" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
        <span className="text-sm text-gray-900">{config.label}</span>
      </div>
    );
  };

  const getExceptionStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { label: "Activa", color: "green" },
      REVOKED: { label: "Revocada", color: "red" },
      EXPIRED: { label: "Expirada", color: "gray" },
    };

    const config = statusConfig[status] || statusConfig.ACTIVE;

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
        <span className="text-sm text-gray-900">{config.label}</span>
      </div>
    );
  };

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se ha seleccionado ningún cliente</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header del detalle */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Detalle de crédito
          </h2>
          <p className="text-sm text-gray-500">
            Configuración de crédito y documentos por cobrar del cliente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Icon name="chevron-left" className="text-base" />
            Volver a listado
          </button>
          {creditConfig && getRiskBadge(creditConfig.risk_level)}
          {getCreditStatusBadge()}
        </div>
      </div>

      {!creditConfig ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">ℹ️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sin configuración de crédito
          </h3>
          <p className="text-sm text-gray-500">
            Este cliente no tiene configuración de crédito asociada en el
            sistema.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumen del cliente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Resumen del cliente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  Nombre / Razón Social
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {customer.legal_name}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">RUT</div>
                <div className="text-sm font-medium text-gray-900">
                  {customer.tax_id}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Contacto</div>
                <div className="text-sm font-medium text-gray-900">
                  {customer.contact_person}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Correo</div>
                <div className="text-sm font-medium text-gray-900">
                  {customer.email}
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de crédito */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Configuración de crédito
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-xs text-gray-600">Límite de crédito</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(creditConfig.credit_limit)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                <span className="text-xs text-gray-600">
                  Crédito disponible
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(creditConfig.available_credit)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                <span className="text-xs text-gray-600">Crédito utilizado</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(creditConfig.used_credit)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">
                  Plazo de pago (días)
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.payment_terms_days}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">
                  Período de gracia (días)
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.grace_period_days}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">Pago mínimo (%)</span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.minimum_payment_percentage}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-xs text-gray-600">
                  Tasa de penalización (%)
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.penalty_rate}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xs text-gray-600">
                  Máx. mora permitida
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(creditConfig.max_overdue_amount)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">Permite efectivo</span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.allows_cash ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">Permite cheques</span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.allows_check ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">
                  Permite ch. a fecha
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.allows_postdated_check ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">Permite cuotas</span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.allows_installments ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">Requiere aval</span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.requires_guarantor ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs text-gray-600">
                  Bloqueo automático
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {creditConfig.auto_block_on_overdue ? "Sí" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Documentos por cobrar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Documentos por cobrar
            </h3>
            {receivables.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                No hay documentos por cobrar para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Documento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Emisión
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vencimiento
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Saldo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receivables.map((receivable) => (
                      <tr key={receivable.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {receivable.document_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {receivable.document_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(receivable.issue_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(receivable.due_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(receivable.original_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(receivable.balance_amount)}
                        </td>
                        <td className="px-4 py-3">
                          {getReceivableStatusBadge(receivable.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Excepciones de límite */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Excepciones de límite
            </h3>
            {exceptions.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                No hay excepciones de límite para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Motivo
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Monto excepción
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Nuevo límite efectivo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vigencia
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exceptions.map((exception) => (
                      <tr key={exception.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {exception.reason}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(exception.exception_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                          {formatCurrency(exception.new_effective_limit)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {exception.is_temporary
                            ? `Hasta ${formatDate(exception.expires_at)}`
                            : "Permanente"}
                        </td>
                        <td className="px-4 py-3">
                          {getExceptionStatusBadge(exception.exception_status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditManagementDetail;
