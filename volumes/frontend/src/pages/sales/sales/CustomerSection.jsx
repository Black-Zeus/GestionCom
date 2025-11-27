import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import { formatRut, validateRut } from "@utils/rutUtils";

const CustomerSection = ({
  selectedCustomer,
  selectedBuyer,
  onSearchByRut,
  onOpenSearch,
  onOpenAuthorizedBuyer,
  authorizedBuyers,
  requireAuthorizedBuyer,
}) => {
  const [rutInput, setRutInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [rutError, setRutError] = useState("");

  // Sincronizar rutInput con selectedCustomer
  useEffect(() => {
    if (selectedCustomer) {
      // Cuando hay cliente seleccionado, actualizar el RUT formateado
      setRutInput(selectedCustomer.tax_id || "");
      setRutError("");
    } else {
      // Cuando se limpia el cliente, resetear todo
      setRutInput("");
      setRutError("");
      setIsExpanded(true); // Resetear toggle a expandido
      setIsMinimized(false);
    }
  }, [selectedCustomer]);

  const handleRutChange = (e) => {
    setRutInput(e.target.value);
  };

  const handleRutBlur = () => {
    if (rutInput.trim()) {
      const formatted = formatRut(rutInput.trim());
      const isValid = validateRut(rutInput.trim());

      if (!isValid) {
        setRutError("RUT inválido");
        return;
      }

      setRutError("");
      setRutInput(formatted);
      onSearchByRut(formatted);
    }
  };

  const handleRutKeyPress = (e) => {
    if (e.key === "Enter") {
      handleRutBlur();
    }
  };

  const showAuthorizedBuyerSection =
    selectedCustomer &&
    selectedCustomer.customer_type === "COMPANY" &&
    authorizedBuyers &&
    authorizedBuyers.length > 0;

  return (
    <div className="mb-8 p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="person" className="text-blue-600" />
          Cliente
        </h3>
        <div className="flex gap-2">
          {selectedCustomer && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              title={isMinimized ? "Expandir panel" : "Minimizar panel"}
            >
              <Icon
                name={isMinimized ? "unfoldMore" : "unfoldLess"}
                className="text-xl"
              />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title={isExpanded ? "Ocultar detalles" : "Mostrar detalles"}
          >
            <Icon
              name={isExpanded ? "expandLess" : "expandMore"}
              className="text-xl"
            />
          </button>
        </div>
      </div>

      {/* Vista Minimizada - Solo RUT, Nombre y Buscar */}
      {isMinimized && selectedCustomer ? (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <input
              type="text"
              value={rutInput}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-700"
            />
          </div>
          <div className="col-span-6">
            <input
              type="text"
              value={selectedCustomer?.legal_name || ""}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-700"
            />
          </div>
          <div className="col-span-2">
            <button
              onClick={onOpenSearch}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="search" className="text-lg" />
              Buscar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Búsqueda de Cliente - Siempre visible */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RUT Cliente
              </label>
              <input
                type="text"
                value={rutInput}
                onChange={handleRutChange}
                onBlur={handleRutBlur}
                onKeyPress={handleRutKeyPress}
                placeholder="12345678-9"
                className={`w-full px-4 py-3 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${rutError
                    ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                    : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
                  }`}
              />
              {rutError && (
                <p className="mt-1 text-xs text-red-600">{rutError}</p>
              )}
            </div>

            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón Social/Nombre
              </label>
              <input
                type="text"
                value={selectedCustomer?.legal_name || ""}
                readOnly
                placeholder="Nombre del cliente"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-700"
              />
            </div>

            <div className="col-span-2 flex items-end">
              <button
                onClick={onOpenSearch}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="search" className="text-lg" />
                Buscar
              </button>
            </div>
          </div>

          {/* Detalles del Cliente - Solo cuando está expandido y no minimizado */}
          {isExpanded && selectedCustomer && (
            <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-100">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Código</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCustomer.customer_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tipo</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCustomer.customer_type === "INDIVIDUAL"
                      ? "Individual"
                      : "Empresa"}
                  </p>
                </div>
                {selectedCustomer.commercial_name && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      Nombre Comercial
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedCustomer.commercial_name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 font-medium">Contacto</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCustomer.contact_person}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Email</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedCustomer.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Cliente Crédito
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${selectedCustomer.is_credit_customer
                          ? "bg-green-500"
                          : "bg-gray-400"
                        }`}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedCustomer.is_credit_customer ? "Sí" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de Persona Autorizada */}
              {showAuthorizedBuyerSection && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Persona que realiza la compra:
                    </label>
                    <button
                      onClick={onOpenAuthorizedBuyer}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Icon name="person" className="text-sm" />
                      Seleccionar Persona
                    </button>
                  </div>

                  {selectedBuyer ? (
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            {selectedBuyer.authorized_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            <strong>RUT:</strong>{" "}
                            {selectedBuyer.authorized_tax_id} •{" "}
                            <strong>Cargo:</strong> {selectedBuyer.position}
                          </p>
                          <p className="text-xs text-gray-600">
                            <strong>Email:</strong> {selectedBuyer.email} •{" "}
                            <strong>Nivel:</strong>{" "}
                            {selectedBuyer.authorization_level}
                          </p>
                          {selectedBuyer.max_purchase_amount && (
                            <p className="text-xs text-gray-600">
                              <strong>Límite de Compra:</strong> $
                              {selectedBuyer.max_purchase_amount.toLocaleString(
                                "es-CL"
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 text-center">
                      <p className="text-sm text-gray-500 italic">
                        {requireAuthorizedBuyer
                          ? "Debe seleccionar una persona autorizada para continuar"
                          : "Ninguna persona seleccionada"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerSection;