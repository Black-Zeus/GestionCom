import React from "react";

const GeneralDataTab = ({
  formData,
  errors,
  priceLists,
  users,
  statuses,
  onChange,
}) => {
  return (
    <div className="space-y-8">
      {/* Sección: Identificación */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Identificación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Cliente
            </label>
            <input
              type="text"
              value={formData.customer_code}
              disabled
              placeholder="Auto-generado"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Cliente *
            </label>
            <select
              value={formData.customer_type}
              onChange={(e) => onChange("customer_type", e.target.value)}
              className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
                errors.customer_type
                  ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
              }`}
            >
              <option value="COMPANY">Empresa</option>
              <option value="INDIVIDUAL">Persona</option>
            </select>
            {errors.customer_type && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RUT *
            </label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => onChange("tax_id", e.target.value)}
              placeholder="XX.XXX.XXX-X"
              className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
                errors.tax_id
                  ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
              }`}
            />
            {errors.tax_id && (
              <p className="text-red-500 text-xs mt-1">{errors.tax_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sección: Nombres */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Nombres
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón Social *
            </label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) => onChange("legal_name", e.target.value)}
              placeholder="Nombre legal de la empresa o persona"
              className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
                errors.legal_name
                  ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
              }`}
            />
            {errors.legal_name && (
              <p className="text-red-500 text-xs mt-1">{errors.legal_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Comercial
            </label>
            <input
              type="text"
              value={formData.commercial_name || ""}
              onChange={(e) => onChange("commercial_name", e.target.value)}
              placeholder="Nombre fantasía (opcional)"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Sección: Contacto */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Contacto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Persona de Contacto
            </label>
            <input
              type="text"
              value={formData.contact_person || ""}
              onChange={(e) => onChange("contact_person", e.target.value)}
              placeholder="Nombre del contacto principal"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="correo@ejemplo.cl"
              className={`w-full px-3 py-2.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-4 transition-all ${
                errors.email
                  ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                  : "border-gray-200 focus:border-blue-600 focus:ring-blue-100"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+56223456789"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Móvil
            </label>
            <input
              type="tel"
              value={formData.mobile || ""}
              onChange={(e) => onChange("mobile", e.target.value)}
              placeholder="+56912345678"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sitio Web
            </label>
            <input
              type="url"
              value={formData.website || ""}
              onChange={(e) => onChange("website", e.target.value)}
              placeholder="www.ejemplo.cl"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Sección: Dirección */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Dirección
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={formData.address || ""}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Calle, número, depto/oficina"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ciudad
            </label>
            <input
              type="text"
              value={formData.city || ""}
              onChange={(e) => onChange("city", e.target.value)}
              placeholder="Santiago"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Región
            </label>
            <input
              type="text"
              value={formData.region || ""}
              onChange={(e) => onChange("region", e.target.value)}
              placeholder="Región Metropolitana"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => onChange("country", e.target.value)}
              placeholder="Chile"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Postal
            </label>
            <input
              type="text"
              value={formData.postal_code || ""}
              onChange={(e) => onChange("postal_code", e.target.value)}
              placeholder="7550000"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Sección: Comercial */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Información Comercial
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lista de Precios
            </label>
            <select
              value={formData.price_list_id}
              onChange={(e) =>
                onChange("price_list_id", parseInt(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            >
              <option value="">Seleccione lista de precios</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.price_list_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendedor Asignado
            </label>
            <select
              value={formData.sales_rep_user_id}
              onChange={(e) =>
                onChange("sales_rep_user_id", parseInt(e.target.value))
              }
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            >
              <option value="">Seleccione vendedor</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={formData.status_id}
              onChange={(e) => onChange("status_id", parseInt(e.target.value))}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.status_display_es}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Registro
            </label>
            <input
              type="date"
              value={formData.registration_date}
              onChange={(e) => onChange("registration_date", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_credit_customer}
                onChange={(e) =>
                  onChange("is_credit_customer", e.target.checked)
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                ¿Es cliente de crédito?
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Sección: Notas */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Notas
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (visibles para el cliente)
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => onChange("notes", e.target.value)}
              rows={3}
              placeholder="Notas generales..."
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Internas (solo para uso interno)
            </label>
            <textarea
              value={formData.internal_notes || ""}
              onChange={(e) => onChange("internal_notes", e.target.value)}
              rows={3}
              placeholder="Notas internas confidenciales..."
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralDataTab;