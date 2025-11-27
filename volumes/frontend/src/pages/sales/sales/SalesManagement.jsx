import React, { useState, useEffect } from "react";
import CustomerSection from "./CustomerSection";
import ProductEntry from "./ProductEntry";
import ItemsTable from "./ItemsTable";
import SummaryPanel from "./SummaryPanel";
import CustomerSearchModal from "./CustomerSearchModal";
import ProductSearchModal from "./ProductSearchModal";
import QuantityModal from "./QuantityModal";
import AuthorizedBuyerModal from "./AuthorizedBuyerModal";
import ModalManager from "@/components/ui/modal/ModalManager";
import salesData from "./data.json";
import { Icon } from "@components/ui/icon/iconManager";

const SalesManagement = () => {
  // Estados principales
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [documentDiscount, setDocumentDiscount] = useState(0);
  const [documentDiscountType, setDocumentDiscountType] = useState("percent"); // "percent" o "amount"
  const [productPreview, setProductPreview] = useState(null);

  // Datos del sistema
  const [customers] = useState(salesData.customers);
  const [products] = useState(salesData.products);
  const [categories] = useState(salesData.categories);
  const [authorizedBuyers] = useState(salesData.authorized_buyers);
  const [paymentMethods] = useState(salesData.payment_methods);
  const [systemConfig] = useState(salesData.system_config);

  // Fecha actual
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString("es-CL"));
  }, []);

  // ==========================================
  // FUNCIONES DE CLIENTE
  // ==========================================

  const handleSearchByRut = (rut) => {
    const customer = customers[rut];
    if (customer) {
      setSelectedCustomer(customer);
      setSelectedBuyer(null);
    } else {
      setSelectedCustomer(null);
      setSelectedBuyer(null);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSelectedBuyer(null);
    ModalManager.closeAll();
  };

  const handleOpenCustomerSearch = () => {
    ModalManager.custom({
      title: "Buscar Cliente",
      size: "fullscreenWide",
      content: (
        <CustomerSearchModal
          customers={Object.values(customers)}
          onSelect={handleSelectCustomer}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  // ==========================================
  // FUNCIONES DE PERSONA AUTORIZADA
  // ==========================================

  const handleOpenAuthorizedBuyerModal = () => {
    if (!selectedCustomer) return;

    const buyers = authorizedBuyers[selectedCustomer.tax_id] || [];

    ModalManager.custom({
      title: "Seleccionar Persona Autorizada",
      size: "fullscreenWide",
      content: (
        <AuthorizedBuyerModal
          customer={selectedCustomer}
          buyers={buyers}
          onSelect={(buyer) => {
            setSelectedBuyer(buyer);
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  // ==========================================
  // FUNCIONES DE PRODUCTOS
  // ==========================================

  const handleSearchProduct = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setProductPreview(null);
      return;
    }

    const term = searchTerm.toLowerCase();
    const product = Object.values(products).find(
      (p) =>
        p.variant_sku.toLowerCase() === term ||
        p.barcode === searchTerm ||
        p.product_name.toLowerCase().includes(term)
    );

    if (product) {
      setProductPreview(product);
    } else {
      setProductPreview(null);
      // Mostrar modal de producto no encontrado
      ModalManager.custom({
        title: "Producto No Encontrado",
        size: "medium",
        content: (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="warning" className="text-orange-600 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Producto No Encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              No se encontró ningún producto con el código{" "}
              <strong>"{searchTerm}"</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Verifique el código ingresado o utilice la búsqueda avanzada para
              encontrar el producto.
            </p>
            <button
              onClick={() => ModalManager.closeAll()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Entendido
            </button>
          </div>
        ),
      });
    }
  };

  const handleAddProductToCart = (product, quantity = 1) => {
    const existingItem = cartItems.find(
      (item) => item.variant_sku === product.variant_sku
    );

    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.variant_sku === product.variant_sku
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity,
          discount: 0,
          discountType: "percent", // "percent" o "amount"
        },
      ]);
    }

    setProductPreview(null);
  };

  const handleProductSelect = (product) => {
    ModalManager.custom({
      title: "Agregar Producto",
      size: "medium",
      content: (
        <QuantityModal
          product={product}
          onConfirm={(quantity) => {
            handleAddProductToCart(product, quantity);
            ModalManager.closeAll();
          }}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  const handleOpenProductSearch = () => {
    ModalManager.custom({
      title: "Búsqueda de Productos",
      size: "fullscreenWide",
      content: (
        <ProductSearchModal
          products={Object.values(products)}
          categories={Object.values(categories)}
          onSelect={handleProductSelect}
          onClose={() => ModalManager.closeAll()}
        />
      ),
    });
  };

  // ==========================================
  // FUNCIONES DE CARRITO
  // ==========================================

  const handleUpdateQuantity = (sku, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(sku);
      return;
    }

    setCartItems(
      cartItems.map((item) =>
        item.variant_sku === sku ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleUpdateDiscount = (sku, newDiscount, discountType) => {
    let discount = Math.max(0, newDiscount);

    if (discountType === "percent") {
      discount = Math.min(
        systemConfig.pos_settings.max_discount_percentage,
        discount
      );
    }

    setCartItems(
      cartItems.map((item) =>
        item.variant_sku === sku ? { ...item, discount, discountType } : item
      )
    );
  };

  const handleToggleDiscountType = (sku) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.variant_sku === sku) {
          const newType =
            item.discountType === "percent" ? "amount" : "percent";
          return {
            ...item,
            discountType: newType,
            discount: 0, // Reset al cambiar tipo
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (sku) => {
    setCartItems(cartItems.filter((item) => item.variant_sku !== sku));
  };

  const handleClearAll = () => {
    ModalManager.confirm({
      title: "Limpiar Todo",
      message: "¿Está seguro que desea limpiar toda la venta?",
      onConfirm: () => {
        setCartItems([]);
        setSelectedCustomer(null);
        setSelectedBuyer(null);
        setDocumentDiscount(0);
        setDocumentDiscountType("percent");
        setProductPreview(null);
      },
    });
  };

  // ==========================================
  // CÁLCULOS
  // ==========================================

  const calculateTotals = () => {
    const subtotal = Math.round(
      cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );

    const lineDiscount = Math.round(
      cartItems.reduce((sum, item) => {
        const itemSubtotal = item.price * item.quantity;
        const discount =
          item.discountType === "amount"
            ? item.discount
            : itemSubtotal * (item.discount / 100);
        return sum + discount;
      }, 0)
    );

    const subtotalAfterLineDiscount = subtotal - lineDiscount;

    // Calcular descuento del documento
    let docDiscountAmount = 0;
    if (documentDiscountType === "amount") {
      docDiscountAmount = Math.round(documentDiscount);
    } else {
      docDiscountAmount = Math.round(
        subtotalAfterLineDiscount * (documentDiscount / 100)
      );
    }

    const neto = Math.round(subtotalAfterLineDiscount - docDiscountAmount);
    const iva = Math.round(neto * systemConfig.tax_settings.iva_rate);
    const total = neto + iva;

    return {
      subtotal,
      lineDiscount,
      docDiscountAmount,
      neto,
      iva,
      total,
      totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  };

  const totals = calculateTotals();

  // ==========================================
  // FUNCIONES DE ACCIONES
  // ==========================================

  const handleSaveDraft = () => {
    console.log("Guardando borrador...", {
      customer: selectedCustomer,
      buyer: selectedBuyer,
      items: cartItems,
      documentDiscount,
      paymentMethod,
      totals,
    });
    // Aquí se implementaría la lógica de guardado
    alert("Borrador guardado correctamente");
  };

  const handleCompleteSale = () => {
    if (!selectedCustomer) {
      ModalManager.custom({
        title: "Cliente Requerido",
        size: "medium",
        content: (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="warning" className="text-orange-600 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Cliente Requerido
            </h3>
            <p className="text-gray-600 mb-6">
              Debe seleccionar un cliente para continuar con la venta.
            </p>
            <button
              onClick={() => ModalManager.closeAll()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Entendido
            </button>
          </div>
        ),
      });
      return;
    }

    if (
      selectedCustomer.customer_type === "COMPANY" &&
      !selectedBuyer &&
      systemConfig.pos_settings.require_authorized_buyer_for_companies
    ) {
      ModalManager.custom({
        title: "Persona Autorizada Requerida",
        size: "medium",
        content: (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="warning" className="text-orange-600 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Persona Autorizada Requerida
            </h3>
            <p className="text-gray-600 mb-6">
              Debe seleccionar una persona autorizada para ventas a empresas.
            </p>
            <button
              onClick={() => ModalManager.closeAll()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Entendido
            </button>
          </div>
        ),
      });
      return;
    }

    if (cartItems.length === 0) {
      ModalManager.custom({
        title: "Carrito Vacío",
        size: "medium",
        content: (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="warning" className="text-orange-600 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Carrito Vacío
            </h3>
            <p className="text-gray-600 mb-6">
              Debe agregar al menos un producto para completar la venta.
            </p>
            <button
              onClick={() => ModalManager.closeAll()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Entendido
            </button>
          </div>
        ),
      });
      return;
    }

    ModalManager.confirm({
      title: "Confirmar Venta",
      message: `¿Desea completar la venta por un total de $${totals.total.toLocaleString(
        "es-CL"
      )}?`,
      onConfirm: () => {
        // Generar folio aleatorio (simulado)
        const folio = Math.floor(100000 + Math.random() * 900000);

        // Simular guardado de venta
        console.log("Completando venta...", {
          folio,
          customer: selectedCustomer,
          buyer: selectedBuyer,
          items: cartItems,
          documentDiscount,
          totals,
        });

        // Cerrar modal de confirmación y mostrar modal de éxito
        ModalManager.closeAll();

        // Mostrar modal de venta exitosa con folio
        ModalManager.custom({
          title: "Venta Completada",
          size: "large",
          content: (
            <div className="text-center">
              {/* Ícono de éxito */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="checkCircle" className="text-green-600 text-5xl" />
              </div>

              {/* Folio */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Venta Registrada Exitosamente
              </h2>
              <p className="text-gray-600 mb-6">
                La venta ha sido procesada correctamente
              </p>

              <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200 mb-6">
                <p className="text-sm text-gray-600 mb-2">Folio de Venta</p>
                <p className="text-4xl font-bold text-blue-600">
                  #{folio.toString().padStart(6, "0")}
                </p>
              </div>

              {/* Resumen Rápido */}
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 mb-6 text-left">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  Resumen de Venta
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedCustomer.legal_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-semibold text-gray-900">
                      {totals.totalItems}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t-2 border-gray-200">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">
                      ${totals.total.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón ir a Caja */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    ModalManager.closeAll();
                    // Aquí se redirige al módulo de caja
                    console.log("Redirigiendo a módulo de caja...");
                    // window.location.href = '/cash/pos';
                  }}
                  className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-3"
                >
                  <Icon name="payments" className="text-2xl" />
                  Procesar Pago en Caja
                </button>

                <button
                  onClick={() => {
                    ModalManager.closeAll();
                    // Limpiar el carrito después de cerrar el modal
                    setCartItems([]);
                    setSelectedCustomer(null);
                    setSelectedBuyer(null);
                    setDocumentDiscount(0);
                    setDocumentDiscountType("percent");
                    setProductPreview(null);
                  }}
                  className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          ),
        });
      },
    });
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen p-8 -mt-10">
      <div className="max-w-[95%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Icon name="shoppingCart" className="text-blue-600 text-3xl" />
              Preparación de Venta
            </h1>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Área principal */}
          <div className="flex-1">
            {/* Sección Cliente */}
            <CustomerSection
              selectedCustomer={selectedCustomer}
              selectedBuyer={selectedBuyer}
              onSearchByRut={handleSearchByRut}
              onOpenSearch={handleOpenCustomerSearch}
              onOpenAuthorizedBuyer={handleOpenAuthorizedBuyerModal}
              authorizedBuyers={
                selectedCustomer
                  ? authorizedBuyers[selectedCustomer.tax_id]
                  : []
              }
              requireAuthorizedBuyer={
                systemConfig.pos_settings.require_authorized_buyer_for_companies
              }
            />

            {/* Ingreso de Productos */}
            <ProductEntry
              onSearch={handleSearchProduct}
              onOpenProductSearch={handleOpenProductSearch}
              productPreview={productPreview}
              onAddToCart={() => {
                if (productPreview) {
                  handleProductSelect(productPreview);
                }
              }}
            />

            {/* Tabla de Items */}
            <ItemsTable
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateDiscount={handleUpdateDiscount}
              onToggleDiscountType={handleToggleDiscountType}
              onRemoveItem={handleRemoveItem}
              maxDiscountPercentage={
                systemConfig.pos_settings.max_discount_percentage
              }
            />

            {/* Botones de Acción */}
            <div className="flex justify-between gap-4 mt-6">
              <button
                onClick={handleClearAll}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
              >
                <Icon name="delete" className="text-lg" />
                Limpiar Todo
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center gap-2"
              >
                <Icon name="save" className="text-lg" />
                Guardar Borrador
              </button>
            </div>
          </div>

          {/* Panel de Resumen */}
          <SummaryPanel
            totals={totals}
            documentDiscount={documentDiscount}
            documentDiscountType={documentDiscountType}
            onDocumentDiscountChange={setDocumentDiscount}
            onDocumentDiscountTypeChange={setDocumentDiscountType}
            onCompleteSale={handleCompleteSale}
            maxDiscountPercentage={
              systemConfig.pos_settings.max_discount_percentage
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SalesManagement;