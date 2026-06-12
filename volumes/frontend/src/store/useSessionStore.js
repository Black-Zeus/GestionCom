import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appConfig } from '@/config/appConfig';

const defaultLocations = [
  { id: 'casa-matriz', warehouse_id: 'casa-matriz', warehouse_code: 'CM', warehouse_name: 'Casa Matriz', label: 'CM - Casa Matriz' },
  { id: 'sucursal-centro', warehouse_id: 'sucursal-centro', warehouse_code: 'SC', warehouse_name: 'Sucursal Centro', label: 'SC - Sucursal Centro' },
  { id: 'sucursal-online', warehouse_id: 'sucursal-online', warehouse_code: 'WEB', warehouse_name: 'Sucursal Online', label: 'WEB - Sucursal Online' },
];
const defaultCashRegisters = [
  { id: 'caja-principal', register_code: 'C1', register_name: 'Caja Principal', warehouse_id: 'casa-matriz', label: 'C1 - Caja Principal' },
  { id: 'caja-2', register_code: 'C2', register_name: 'Caja 2', warehouse_id: 'sucursal-centro', label: 'C2 - Caja 2' },
  { id: 'caja-web', register_code: 'WEB', register_name: 'Caja Web', warehouse_id: 'sucursal-online', label: 'WEB - Caja Web' },
];
const defaultSalesPoints = [
  { id: 'pv-principal', sales_point_code: 'PV1', sales_point_name: 'Punto venta principal', warehouse_id: 'casa-matriz', label: 'PV1 - Punto venta principal' },
  { id: 'pv-centro', sales_point_code: 'PV2', sales_point_name: 'Punto venta centro', warehouse_id: 'sucursal-centro', label: 'PV2 - Punto venta centro' },
  { id: 'pv-web', sales_point_code: 'WEB', sales_point_name: 'Punto venta web', warehouse_id: 'sucursal-online', label: 'WEB - Punto venta web' },
];

const resolveLocationId = (item) => String(item?.id ?? item?.warehouse_id ?? item?.value ?? item?.warehouse_code ?? item?.warehouse_name ?? item?.name ?? item ?? '');

const resolveLocationLabel = (item) => {
  if (typeof item === 'string') return item;
  if (item?.label) return item.label;
  const code = item?.warehouse_code || item?.code;
  const name = item?.warehouse_name || item?.name || item?.location_name;
  return [code, name].filter(Boolean).join(' - ') || resolveLocationId(item);
};

const resolveCashRegisterId = (item) => String(item?.id ?? item?.cash_register_id ?? item?.value ?? item?.register_code ?? item?.register_name ?? item?.name ?? item ?? '');

const resolveCashRegisterLabel = (item) => {
  if (typeof item === 'string') return item;
  if (item?.label) return item.label;
  const code = item?.register_code || item?.cash_register_code || item?.code;
  const name = item?.register_name || item?.cash_register_name || item?.name;
  return [code, name].filter(Boolean).join(' - ') || resolveCashRegisterId(item);
};

const resolveSalesPointId = (item) => String(item?.id ?? item?.sales_point_id ?? item?.value ?? item?.sales_point_code ?? item?.sales_point_name ?? item?.name ?? item ?? '');

const resolveSalesPointLabel = (item) => {
  if (typeof item === 'string') return item;
  if (item?.label) return item.label;
  const code = item?.sales_point_code || item?.code;
  const name = item?.sales_point_name || item?.name;
  return [code, name].filter(Boolean).join(' - ') || resolveSalesPointId(item);
};

const normalizeLocation = (item) => {
  const id = resolveLocationId(item);
  return {
    ...(typeof item === 'object' && item ? item : {}),
    id,
    warehouse_id: String(item?.warehouse_id ?? item?.id ?? id),
    label: resolveLocationLabel(item),
  };
};

const normalizeCashRegister = (item) => {
  const id = resolveCashRegisterId(item);
  return {
    ...(typeof item === 'object' && item ? item : {}),
    id,
    warehouse_id: item?.warehouse_id != null ? String(item.warehouse_id) : null,
    label: resolveCashRegisterLabel(item),
  };
};

const normalizeSalesPoint = (item) => {
  const id = resolveSalesPointId(item);
  return {
    ...(typeof item === 'object' && item ? item : {}),
    id,
    warehouse_id: item?.warehouse_id != null ? String(item.warehouse_id) : null,
    label: resolveSalesPointLabel(item),
  };
};

const normalizeLocations = (items) => (items?.length ? items : defaultLocations).map(normalizeLocation).filter((item) => item.id);
const normalizeCashRegisters = (items) => (items?.length ? items : defaultCashRegisters).map(normalizeCashRegister).filter((item) => item.id);
const normalizeSalesPoints = (items) => (items?.length ? items : defaultSalesPoints).map(normalizeSalesPoint).filter((item) => item.id);

const getLocationById = (locations, id) => locations.find((item) => String(item.id) === String(id)) || null;
const getCashRegistersForLocation = (cashRegisters, location) => {
  if (!location) return [];
  return cashRegisters.filter((cashRegister) => (
    !cashRegister.warehouse_id || String(cashRegister.warehouse_id) === String(location.warehouse_id || location.id)
  ));
};
const getSalesPointsForLocation = (salesPoints, location) => {
  if (!location) return [];
  return salesPoints.filter((salesPoint) => (
    !salesPoint.warehouse_id || String(salesPoint.warehouse_id) === String(location.warehouse_id || location.id)
  ));
};

export const useSessionStore = create(
  persist(
    (set, get) => ({
      locations: normalizeLocations(defaultLocations),
      salesPoints: normalizeSalesPoints(defaultSalesPoints),
      cashRegisters: normalizeCashRegisters(defaultCashRegisters),
      activeLocation: defaultLocations[0].id,
      activeSalesPoint: defaultSalesPoints[0].id,
      activeCashRegister: defaultCashRegisters[0].id,
      preferredLocation: null,
      preferredSalesPoint: null,
      preferredCashRegister: null,
      _sessionContextReady: false,

      markSessionContextReady() {
        set({ _sessionContextReady: true });
      },

      initializeFromUser(user) {
        // If setOperationalContext already ran (real API data), don't clobber with mock defaults.
        if (get()._sessionContextReady) return;

        const locations = normalizeLocations(user?.authorizedLocations || user?.authorizedWarehouses || user?.warehouses);
        const salesPoints = normalizeSalesPoints(user?.authorizedSalesPoints || user?.salesPoints);
        const cashRegisters = normalizeCashRegisters(user?.authorizedCashRegisters || user?.cashRegisters);
        const currentState = get();
        const activeLocation = locations.some((item) => String(item.id) === String(currentState.activeLocation))
          ? currentState.activeLocation
          : locations[0]?.id || '';
        const location = getLocationById(locations, activeLocation);
        const availableSalesPoints = getSalesPointsForLocation(salesPoints, location);
        const availableCashRegisters = getCashRegistersForLocation(cashRegisters, location);
        const activeSalesPoint = availableSalesPoints.some((item) => String(item.id) === String(currentState.activeSalesPoint))
          ? currentState.activeSalesPoint
          : availableSalesPoints[0]?.id || '';
        const activeCashRegister = availableCashRegisters.some((item) => String(item.id) === String(currentState.activeCashRegister))
          ? currentState.activeCashRegister
          : availableCashRegisters[0]?.id || '';

        set({
          locations,
          salesPoints,
          cashRegisters,
          activeLocation,
          activeSalesPoint,
          activeCashRegister,
        });
      },

      setOperationalContext(context = {}) {
        const locations = (context.locations || []).map(normalizeLocation).filter((item) => item.id);
        const salesPoints = (context.sales_points || context.salesPoints || []).map(normalizeSalesPoint).filter((item) => item.id);
        const cashRegisters = (context.cash_registers || context.cashRegisters || []).map(normalizeCashRegister).filter((item) => item.id);
        const currentState = get();
        // Prefer the user's explicit selection (preferredLocation) over currentState.activeLocation
        // which may have been overwritten by initializeFromUser with mock defaults.
        const preferredLoc = currentState.preferredLocation || currentState.activeLocation;
        const activeLocation = locations.some((item) => String(item.id) === String(preferredLoc))
          ? preferredLoc
          : locations[0]?.id || '';
        const location = getLocationById(locations, activeLocation);
        const availableSalesPoints = getSalesPointsForLocation(salesPoints, location);
        const availableCashRegisters = getCashRegistersForLocation(cashRegisters, location);
        const preferredSp = currentState.preferredSalesPoint || currentState.activeSalesPoint;
        const activeSalesPoint = availableSalesPoints.some((item) => String(item.id) === String(preferredSp))
          ? preferredSp
          : availableSalesPoints[0]?.id || '';
        const preferredCr = currentState.preferredCashRegister || currentState.activeCashRegister;
        const activeCashRegister = availableCashRegisters.some((item) => String(item.id) === String(preferredCr))
          ? preferredCr
          : availableCashRegisters[0]?.id || '';

        set({
          locations,
          salesPoints,
          cashRegisters,
          activeLocation,
          activeSalesPoint,
          activeCashRegister,
          _sessionContextReady: true,
        });
      },

      setActiveLocation(activeLocation) {
        const location = getLocationById(get().locations, activeLocation);
        const salesPoints = getSalesPointsForLocation(get().salesPoints, location);
        const cashRegisters = getCashRegistersForLocation(get().cashRegisters, location);
        set({
          activeLocation,
          preferredLocation: activeLocation,
          activeSalesPoint: salesPoints.some((item) => String(item.id) === String(get().activeSalesPoint))
            ? get().activeSalesPoint
            : salesPoints[0]?.id || '',
          activeCashRegister: cashRegisters.some((item) => String(item.id) === String(get().activeCashRegister))
            ? get().activeCashRegister
            : cashRegisters[0]?.id || '',
        });
      },

      setActiveCashRegister(activeCashRegister) {
        set({ activeCashRegister, preferredCashRegister: activeCashRegister });
      },

      setActiveSalesPoint(activeSalesPoint) {
        set({ activeSalesPoint, preferredSalesPoint: activeSalesPoint });
      },

      getActiveLocation() {
        return getLocationById(get().locations, get().activeLocation);
      },

      getActiveCashRegister() {
        return get().cashRegisters.find((item) => String(item.id) === String(get().activeCashRegister)) || null;
      },

      getActiveSalesPoint() {
        return get().salesPoints.find((item) => String(item.id) === String(get().activeSalesPoint)) || null;
      },

      getCashRegistersForActiveLocation() {
        return getCashRegistersForLocation(get().cashRegisters, get().getActiveLocation());
      },

      getSalesPointsForActiveLocation() {
        return getSalesPointsForLocation(get().salesPoints, get().getActiveLocation());
      },
    }),
    {
      name: appConfig.storageKey('session'),
      partialize: (state) => ({
        locations: state.locations,
        salesPoints: state.salesPoints,
        cashRegisters: state.cashRegisters,
        activeLocation: state.activeLocation,
        activeSalesPoint: state.activeSalesPoint,
        activeCashRegister: state.activeCashRegister,
        preferredLocation: state.preferredLocation,
        preferredSalesPoint: state.preferredSalesPoint,
        preferredCashRegister: state.preferredCashRegister,
      }),
    }
  )
);
