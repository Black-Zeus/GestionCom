import React, { useState, useEffect } from "react";
import { Icon } from "@components/ui/icon/iconManager";
import GeneralDataTab from "./GeneralDataTab";
import AuthorizedUsersTab from "./AuthorizedUsersTab";
import CreditConfigTab from "./CreditConfigTab";
import PenaltiesTab from "./PenaltiesTab";
import ExceptionsTab from "./ExceptionsTab";

const CustomerModal = ({
  customer,
  priceLists,
  users,
  statuses,
  authorizedUsers,
  creditConfigs,
  penalties,
  exceptions,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    customer_code: "",
    customer_type: "COMPANY",
    tax_id: "",
    legal_name: "",
    commercial_name: "",
    contact_person: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    address: "",
    city: "",
    region: "",
    country: "Chile",
    postal_code: "",
    price_list_id: "",
    sales_rep_user_id: "",
    status_id: 1,
    is_credit_customer: false,
    registration_date: new Date().toISOString().split("T")[0],
    notes: "",
    internal_notes: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    }
  }, [customer]);

  const tabs = [
    { id: "general", label: "Datos Generales", icon: "file" },
    { id: "contacts", label: "Contactos", icon: "users" },
    { id: "credit", label: "Crédito", icon: "dollar" },
    { id: "penalties", label: "Penalidades", icon: "warning" },
    { id: "exceptions", label: "Excepciones", icon: "check" },
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_type) {
      newErrors.customer_type = "El tipo de cliente es requerido";
    }

    if (!formData.tax_id) {
      newErrors.tax_id = "El RUT es requerido";
    }

    if (!formData.legal_name) {
      newErrors.legal_name = "La razón social es requerida";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setActiveTab("general");
      return;
    }

    onSave(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Filtrar datos relacionados con este cliente
  const customerAuthorizedUsers = authorizedUsers.filter(
    (au) => au.customer_id === customer?.id
  );

  const customerCreditConfig = creditConfigs.find(
    (cc) => cc.customer_id === customer?.id
  );

  const customerPenalties = penalties.filter(
    (p) => p.customer_id === customer?.id
  );

  const customerExceptions = exceptions.filter(
    (e) => e.customer_id === customer?.id
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 px-6 pt-4">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Icon name={tab.icon} className="text-lg" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "general" && (
          <GeneralDataTab
            formData={formData}
            errors={errors}
            priceLists={priceLists}
            users={users}
            statuses={statuses}
            onChange={handleInputChange}
          />
        )}

        {activeTab === "contacts" && (
          <AuthorizedUsersTab
            customerId={customer?.id}
            authorizedUsers={customerAuthorizedUsers}
          />
        )}

        {activeTab === "credit" && (
          <CreditConfigTab
            customerId={customer?.id}
            creditConfig={customerCreditConfig}
            isNewCustomer={!customer}
          />
        )}

        {activeTab === "penalties" && (
          <PenaltiesTab penalties={customerPenalties} />
        )}

        {activeTab === "exceptions" && (
          <ExceptionsTab exceptions={customerExceptions} />
        )}
      </div>

      {/* Footer con botones */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Icon name="save" />
          Guardar Cliente
        </button>
      </div>
    </form>
  );
};

export default CustomerModal;