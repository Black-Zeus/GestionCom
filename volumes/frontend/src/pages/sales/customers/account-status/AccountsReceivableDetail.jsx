import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import ModalManager from "@/components/ui/modal/ModalManager";
import DocumentDetailModal from "./DocumentDetailModal";

const AccountsReceivableDetail = ({ customer, receivables, filters }) => {
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

    // Filtrar documentos según parámetros
    const getFilteredReceivables = () => {
        const cutoffDate = new Date(filters.cutoffDate);

        let filtered = receivables.filter((r) => {
            const issueDate = new Date(r.issue_date);
            return issueDate <= cutoffDate;
        });

        if (filters.view === "OPEN") {
            filtered = filtered.filter((r) => r.balance_amount !== 0);
        } else if (filters.view === "OVERDUE") {
            filtered = filtered.filter((r) => {
                const dueDate = new Date(r.due_date);
                return r.balance_amount !== 0 && dueDate < cutoffDate;
            });
        }

        return filtered;
    };

    const filteredReceivables = getFilteredReceivables();

    // Calcular KPIs
    const calculateKPIs = () => {
        const openDocs = filteredReceivables.filter((r) => r.balance_amount !== 0);
        const usedBalance = openDocs.reduce(
            (sum, r) => sum + Math.abs(r.balance_amount),
            0
        );

        const cutoffDate = new Date(filters.cutoffDate);
        const overdueAmount = openDocs
            .filter((r) => new Date(r.due_date) < cutoffDate)
            .reduce((sum, r) => sum + Math.abs(r.balance_amount), 0);

        const creditLimit = customer.credit_limit || 0;
        const availableCredit = Math.max(creditLimit - usedBalance, 0);

        return {
            creditLimit,
            usedBalance,
            availableCredit,
            overdueAmount,
            openDocsCount: openDocs.length,
        };
    };

    const kpis = calculateKPIs();

    // Calcular antigüedad de saldos
    const calculateAging = () => {
        const cutoffDate = new Date(filters.cutoffDate);
        const openDocs = filteredReceivables.filter((r) => r.balance_amount !== 0);

        const aging = {
            current: 0,
            days1_30: 0,
            days31_60: 0,
            days61_90: 0,
            over90: 0,
        };

        openDocs.forEach((doc) => {
            const dueDate = new Date(doc.due_date);
            const diffTime = cutoffDate - dueDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const amount = Math.abs(doc.balance_amount);

            if (diffDays <= 0) {
                aging.current += amount;
            } else if (diffDays <= 30) {
                aging.days1_30 += amount;
            } else if (diffDays <= 60) {
                aging.days31_60 += amount;
            } else if (diffDays <= 90) {
                aging.days61_90 += amount;
            } else {
                aging.over90 += amount;
            }
        });

        return aging;
    };

    const aging = calculateAging();


    const handleViewDocumentDetail = (doc) => {
        ModalManager.custom({
            title: "Detalle de documento",
            size: "xlarge",
            content: <DocumentDetailModal document={doc} customer={customer} />,
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            OPEN: { label: "Abierto", color: "blue" },
            PAID: { label: "Pagado", color: "green" },
            APPLIED: { label: "Aplicado", color: "purple" },
            CANCELLED: { label: "Anulado", color: "red" },
        };

        const config = statusConfig[status] || { label: status, color: "gray" };

        return (
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
                <span className="text-sm text-gray-900">{config.label}</span>
            </div>
        );
    };

    const displayName = customer.commercial_name || customer.legal_name || "-";

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        Estado de Cuenta
                    </h2>
                    <p className="text-sm text-gray-500">
                        Resumen de crédito y documentos pendientes a la fecha de corte
                        seleccionada
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {customer.segment && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Segmento: {customer.segment}
                        </span>
                    )}
                </div>
            </div>

            {/* Alerta de riesgo */}
            {kpis.overdueAmount > 0 ? (
                <div className="mb-6 flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="text-xl">⚠️</span>
                    <span className="text-sm text-orange-900">
                        El cliente presenta deuda vencida por{" "}
                        <strong>{formatCurrency(kpis.overdueAmount)}</strong>.
                    </span>
                </div>
            ) : (
                <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-xl">✅</span>
                    <span className="text-sm text-green-900">
                        Cliente sin deuda vencida a la fecha de corte.
                    </span>
                </div>
            )}

            {/* Perfil del cliente */}
            <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Perfil del cliente
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Nombre / Razón Social</div>
                        <div className="text-sm font-medium text-gray-900">{displayName}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">RUT</div>
                        <div className="text-sm font-medium text-gray-900">
                            {customer.tax_id || "-"}
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Contacto</div>
                        <div className="text-sm font-medium text-gray-900">
                            {customer.contact_person || "-"}
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Correo</div>
                        <div className="text-sm font-medium text-gray-900">
                            {customer.email || "-"}
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Ciudad / Región</div>
                        <div className="text-sm font-medium text-gray-900">
                            {[customer.city, customer.region].filter(Boolean).join(" / ") || "-"}
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Fecha registro</div>
                        <div className="text-sm font-medium text-gray-900">
                            {customer.registration_date || "-"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumen financiero */}
            <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Resumen financiero
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-gray-600 mb-1">Límite de crédito</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(kpis.creditLimit)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Límite autorizado</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-gray-600 mb-1">Saldo utilizado</p>
                        <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(kpis.usedBalance)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Documentos pendientes</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-sm text-gray-600 mb-1">Crédito disponible</p>
                        <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(kpis.availableCredit)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Límite menos saldo</p>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                        <p className="text-sm text-gray-600 mb-1">Monto vencido</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(kpis.overdueAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Documentos vencidos</p>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <p className="text-sm text-gray-600 mb-1">Documentos pendientes</p>
                        <p className="text-2xl font-bold text-indigo-600">
                            {kpis.openDocsCount}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Con saldo</p>
                    </div>
                </div>

                {/* Barra de uso de crédito */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-700">Uso de crédito</span>
                        <span className="text-sm text-gray-500">
                            {kpis.creditLimit > 0
                                ? Math.round((kpis.usedBalance / kpis.creditLimit) * 100)
                                : 0}
                            %
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                                width: `${kpis.creditLimit > 0
                                    ? Math.min((kpis.usedBalance / kpis.creditLimit) * 100, 100)
                                    : 0
                                    }%`,
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Antigüedad de saldos */}
            <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Antigüedad de saldos
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Al día
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    1-30 días
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    31-60 días
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    61-90 días
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    +90 días
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            <tr>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatCurrency(aging.current)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatCurrency(aging.days1_30)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatCurrency(aging.days31_60)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {formatCurrency(aging.days61_90)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-orange-600">
                                    {formatCurrency(aging.over90)}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                    {formatCurrency(kpis.usedBalance)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Documentos pendientes */}
            <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Documentos del cliente
                </h3>
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
                                    Monto original
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Saldo
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReceivables.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-6 py-12 text-center text-sm text-gray-500"
                                    >
                                        No hay documentos que coincidan con los filtros aplicados
                                    </td>
                                </tr>
                            ) : (
                                filteredReceivables.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {doc.document_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {doc.document_type_label}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {formatDate(doc.issue_date)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {formatDate(doc.due_date)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                            {formatCurrency(doc.original_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {formatCurrency(doc.balance_amount)}
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleViewDocumentDetail(doc)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Ver detalle"
                                            >
                                                <Icon name="info" className="text-lg" />
                                            </button>
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

export default AccountsReceivableDetail;