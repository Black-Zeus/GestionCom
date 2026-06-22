import { ShieldCheck } from 'lucide-react';
import CustomerReportBase from './CustomerReportBase';

const ALL_VALUE = 'all';

const ACTIVE_OPTIONS = [
  { value: ALL_VALUE, label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const config = {
  title: 'Clientes - compradores autorizados',
  endpoint: '/reports/customers/authorized-buyers/data',
  pdfEndpoint: '/reports/customers/authorized-buyers/pdf',
  chartId: 'customers-authorized-chart',
  icon: ShieldCheck,
  color: '#7c3aed',
  groupLabel: 'Por nivel',
  tableDetail: 'Detalle de autorizados',
  tableGrouped: 'Autorizados por nivel',
  csvBase: 'clientes-autorizados',
  xlsxSheet: 'Autorizados',
  filterKey: 'active',
  filterParam: 'active',
  filterPdf: 'active',
  filterLabel: 'Estado',
  filterOptions: ACTIVE_OPTIONS,
  kpis: (totals) => [
    { id: 'count', label: 'Autorizados', value: Number(totals.count || 0).toLocaleString('es-CL'), hint: 'personas' },
    { id: 'active', label: 'Activos', value: Number(totals.active || 0).toLocaleString('es-CL'), hint: 'habilitados' },
    { id: 'primary', label: 'Contactos principales', value: Number(totals.primary || 0).toLocaleString('es-CL'), hint: 'marcados' },
  ],
  chart: { title: 'Autorizados por nivel', subtitle: 'Cantidad de personas por nivel de autorización', labelKey: 'authorization_label', valueKey: 'count' },
  detailColumns: [
    ['customer_name', 'Cliente'], ['authorized_name', 'Autorizado'], ['authorized_tax_id', 'RUT'], ['authorization_label', 'Nivel'], ['position', 'Cargo'], ['phone', 'Teléfono'], ['max_purchase_amount', 'Límite', 'money', true], ['is_active', 'Activo', 'bool'],
  ],
  groupedColumns: [
    ['authorization_label', 'Nivel'], ['count', 'Personas', 'number', true], ['active', 'Activas', 'number', true], ['max_purchase_amount', 'Límite total', 'money', true],
  ],
};

const CustomerAuthorizedBuyersReport = () => <CustomerReportBase config={config} />;

export default CustomerAuthorizedBuyersReport;
