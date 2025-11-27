import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const PettyCashTable = ({
    funds,
    onEdit,
    onViewExpenses,
    onReplenish,
    onToggleStatus,
    onClose,
}) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusDotColor = (status) => {
        switch (status) {
            case "ACTIVE":
                return "bg-green-500";
            case "SUSPENDED":
                return "bg-yellow-500";
            case "CLOSED":
                return "bg-red-500";
            case "PENDING_ACCEPTANCE":
                return "bg-blue-500";
            default:
                return "bg-gray-400";
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "ACTIVE":
                return "Activo";
            case "SUSPENDED":
                return "Suspendido";
            case "CLOSED":
                return "Cerrado";
            case "PENDING_ACCEPTANCE":
                return "Pendiente de aceptación";
            default:
                return status;
        }
    };

    const getToggleTitle = (status) => {
        switch (status) {
            case "ACTIVE":
                return "Suspender fondo";
            case "SUSPENDED":
                return "Activar fondo";
            case "PENDING_ACCEPTANCE":
                return "Activar fondo (aceptación manual)";
            case "CLOSED":
                return "Cambiar estado";
            default:
                return "Cambiar estado";
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Código
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Responsable
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Bodega
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Saldo Inicial
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Saldo Actual
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Total Gastado
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {funds.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="8"
                                    className="px-6 py-12 text-center text-gray-500 text-sm"
                                >
                                    No hay fondos registrados
                                </td>
                            </tr>
                        ) : (
                            funds.map((fund) => (
                                <tr key={fund.id} className="hover:bg-gray-50 transition-colors">
                                    {/* Código: azul */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-semibold text-blue-600">
                                            {fund.fund_code}
                                        </span>
                                    </td>

                                    {/* Texto neutro para el resto */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {fund.responsible_user_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {fund.warehouse_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(fund.initial_amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm  text-gray-900">
                                            {formatCurrency(fund.current_balance)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm  text-gray-900">
                                            {formatCurrency(fund.total_expenses)}
                                        </span>
                                    </td>

                                    {/* Estado: punto + texto */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${getStatusDotColor(
                                                    fund.fund_status
                                                )}`}
                                            />
                                            <span className="text-sm text-gray-700">
                                                {getStatusText(fund.fund_status)}
                                            </span>
                                        </div>
                                    </td>
                                    {/* Acciones: todos los iconos SIEMPRE visibles y activos */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Editar */}
                                            <button
                                                type="button"
                                                onClick={() => onEdit(fund)}
                                                title="Editar fondo"
                                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            >
                                                <Icon name="edit" className="text-sm" />
                                            </button>

                                            {/* Ver gastos */}
                                            <button
                                                type="button"
                                                onClick={() => onViewExpenses(fund)}
                                                title="Ver gastos"
                                                className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                                            >
                                                <Icon name="list" className="text-sm" />
                                            </button>

                                            {/* Reponer */}
                                            <button
                                                type="button"
                                                onClick={() => onReplenish(fund)}
                                                title="Reponer fondo"
                                                className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                                            >
                                                <Icon name="cash" className="text-sm" />
                                            </button>

                                            {/* Cambiar estado (activar / suspender / etc.) */}
                                            <button
                                                type="button"
                                                onClick={() => onToggleStatus(fund)}
                                                title={getToggleTitle(fund.fund_status)}
                                                className={`p-2 rounded-lg transition-all ${fund.fund_status === "SUSPENDED"
                                                        ? "text-gray-400 hover:text-green-600 hover:bg-green-50" // activar
                                                        : "text-gray-400 hover:text-yellow-600 hover:bg-yellow-50" // suspender
                                                    }`}
                                            >
                                                <Icon
                                                    name={fund.fund_status === "SUSPENDED" ? "checkCircle" : "ban"}
                                                    className="text-sm"
                                                />
                                            </button>

                                            {/* Cerrar */}
                                            <button
                                                type="button"
                                                onClick={() => onClose(fund)}
                                                title="Cerrar fondo"
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                            >
                                                <Icon name="close" className="text-sm" />
                                            </button>
                                        </div>
                                    </td>

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PettyCashTable;
