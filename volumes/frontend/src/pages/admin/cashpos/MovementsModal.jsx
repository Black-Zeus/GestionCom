import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import cashPOSData from "./data.json";

const MovementsModal = ({ session, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    // Filtrar movimientos de la sesión actual
    const sessionMovements = cashPOSData.movements.filter(
      (m) => m.sessionId === session.id
    );
    setMovements(sessionMovements);

    // Calcular resumen
    calculateSummary(sessionMovements);
  }, [session.id]);

  const calculateSummary = (movementsData) => {
    const summaryByMethod = {};
    let totalIncome = 0;
    let totalExpense = 0;

    movementsData.forEach((movement) => {
      const amount = parseFloat(movement.amount);

      // Agrupar por método de pago
      if (!summaryByMethod[movement.paymentMethod]) {
        summaryByMethod[movement.paymentMethod] = {
          count: 0,
          total: 0,
        };
      }
      summaryByMethod[movement.paymentMethod].count += 1;
      summaryByMethod[movement.paymentMethod].total += amount;

      // Calcular ingresos y egresos
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpense += Math.abs(amount);
      }
    });

    setSummary({
      byMethod: summaryByMethod,
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      totalMovements: movementsData.length,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getMovementTypeLabel = (type) => {
    const types = {
      OPENING: "Apertura",
      SALE: "Venta",
      RETURN: "Devolución",
      PETTY_CASH: "Caja Chica",
      ADJUSTMENT: "Ajuste",
      CLOSING: "Cierre",
    };
    return types[type] || type;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">
          Movimientos de Sesión
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Sesión: {session.sessionCode} - Cajero: {session.cashierName}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-gray-600 mb-1">Total Movimientos</p>
          <p className="text-2xl font-bold text-blue-600">
            {summary.totalMovements || 0}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <p className="text-sm text-gray-600 mb-1">Total Ingresos</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalIncome || 0)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <p className="text-sm text-gray-600 mb-1">Total Egresos</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalExpense || 0)}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-gray-600 mb-1">Monto Neto</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(summary.netAmount || 0)}
          </p>
        </div>
      </div>

      {/* Resumen por Método de Pago */}
      {summary.byMethod && Object.keys(summary.byMethod).length > 0 && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Resumen por Método de Pago
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(summary.byMethod).map(([method, data]) => (
              <div
                key={method}
                className="bg-white rounded-lg p-3 border border-gray-200"
              >
                <p className="text-xs text-gray-600">{method}</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(data.total)}
                </p>
                <p className="text-xs text-gray-500">{data.count} operaciones</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de Movimientos */}
      {movements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Icon name="inbox" className="text-5xl text-gray-400 mb-3" />
          <p className="text-gray-500 text-lg">No hay movimientos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-96">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Fecha/Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Método Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Documento
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Monto
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Vuelto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700 font-mono">
                      {formatDate(movement.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          movement.movementType === "OPENING"
                            ? "bg-blue-500"
                            : movement.movementType === "SALE"
                            ? "bg-green-500"
                            : movement.movementType === "RETURN"
                            ? "bg-red-500"
                            : movement.movementType === "PETTY_CASH"
                            ? "bg-yellow-500"
                            : movement.movementType === "ADJUSTMENT"
                            ? "bg-purple-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        {getMovementTypeLabel(movement.movementType)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {movement.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700 font-mono">
                      {movement.documentReference || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        movement.amount >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(movement.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-700">
                      {movement.changeAmount
                        ? formatCurrency(movement.changeAmount)
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {movement.description || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            alert("Función de impresión de comprobante de sesión");
            // Aquí se implementará la lógica de impresión
          }}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Icon name="print" className="text-sm" />
          Imprimir Comprobante
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default MovementsModal;