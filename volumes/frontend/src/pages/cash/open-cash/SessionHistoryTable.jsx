import React from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatCurrency, formatDateTime } from "@/utils/formats";

/**
 * SessionHistoryTable
 * Tabla con el listado de sesiones de caja
 */
const SessionHistoryTable = ({ sessions, sessionStatuses, onViewDetail }) => {
    /**
     * Obtener badge de estado con semáforo
     */
    const getStatusBadge = (statusCode) => {
        const status = sessionStatuses.find((s) => s.code === statusCode);
        if (!status) return null;

        const dotColors = {
            OPEN: "bg-green-600",
            CLOSED: "bg-blue-600",
            RECONCILED: "bg-yellow-600",
        };

        return (
            <span className="inline-flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColors[statusCode]}`}></span>
                <span className="text-sm text-gray-900">{status.label}</span>
            </span>
        );
    };

    /**
     * Obtener indicador de diferencia con flecha
     */
    const getDifferenceIndicator = (amount) => {
        if (amount === null) {
            return (
                <span className="flex items-center justify-end gap-1 text-gray-400">
                    <Icon name="FaMinus" className="text-xs" />
                    <span>—</span>
                </span>
            );
        }

        if (amount === 0) {
            return (
                <span className="flex items-center justify-end gap-1 text-gray-900">
                    <Icon name="FaEquals" className="text-xs" />
                    <span>{formatCurrency(amount)}</span>
                </span>
            );
        }

        if (amount > 0) {
            return (
                <span className="flex items-center justify-end gap-1 text-green-600">
                    <Icon name="FaArrowUp" className="text-xs" />
                    <span>{formatCurrency(amount)}</span>
                </span>
            );
        }

        return (
            <span className="flex items-center justify-end gap-1 text-red-600">
                <Icon name="FaArrowDown" className="text-xs" />
                <span>{formatCurrency(amount)}</span>
            </span>
        );
    };

    if (sessions.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">
                        Historial de aperturas de caja
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Listado de sesiones de caja asociadas al usuario, según los filtros
                        definidos.
                    </p>
                </div>
                <div className="px-6 py-12 text-center">
                    <Icon name="FaInbox" className="mx-auto text-4xl text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600">
                        No hay sesiones de caja para los filtros seleccionados.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                    Historial de aperturas de caja
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                    Listado de sesiones de caja asociadas al usuario, según los filtros
                    definidos.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Fecha
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Serie - Número
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Sucursal / Caja
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Monto apertura
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Monto cierre
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Diferencia
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sessions.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                                {/* Columna Fecha - Dos niveles */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-500 w-16">Apertura:</span>
                                        <span className="font-medium text-gray-900">{formatDateTime(session.opening_datetime).split(',')[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-16">Cierre:</span>
                                        <span className="font-medium text-gray-900">{session.closing_datetime
                                            ? formatDateTime(session.closing_datetime).split(',')[0]
                                            : " - "}</span>
                                    </div>
                                </td>

                                {/* Columna Serie - Número */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-blue-600">
                                        {session.session_code}
                                    </div>
                                </td>

                                {/* Columna Sucursal / Caja - Dos niveles */}
                                <td className="px-6 py-4 text-sm">
                                    <div className="font-medium text-gray-900">
                                        {session.branch_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {session.cash_register_name}
                                    </div>
                                </td>

                                {/* Columna Estado */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(session.status_code)}
                                </td>

                                {/* Columna Monto apertura */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                    {formatCurrency(session.opening_amount)}
                                </td>

                                {/* Columna Monto cierre */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                    {session.physical_amount !== null
                                        ? formatCurrency(session.physical_amount)
                                        : "—"}
                                </td>

                                {/* Columna Diferencia */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                                    {getDifferenceIndicator(session.difference_amount)}
                                </td>

                                {/* Columna Acciones */}
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onViewDetail(session)}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Ver detalle"
                                        >
                                            <Icon name="FaEye" className="text-base" />
                                        </button>
                                        <button
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Icon name="FaTrash" className="text-base" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SessionHistoryTable;