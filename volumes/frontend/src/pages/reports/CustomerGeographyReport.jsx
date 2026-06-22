import { MapPinned } from 'lucide-react';
import CustomerReportBase from './CustomerReportBase';

const GROUP_OPTIONS = [
  { value: 'region', label: 'Por región' },
  { value: 'city', label: 'Por ciudad' },
  { value: 'type', label: 'Por tipo' },
  { value: 'status', label: 'Por estado' },
];

const config = {
  title: 'Clientes - clientes por zona',
  endpoint: '/reports/customers/geography/data',
  pdfEndpoint: '/reports/customers/geography/pdf',
  chartId: 'customers-geography-chart',
  icon: MapPinned,
  color: '#0d9488',
  groupLabel: 'Por dimensión',
  tableDetail: 'Detalle de clientes',
  tableGrouped: 'Clientes agrupados',
  csvBase: 'clientes-zona',
  xlsxSheet: 'Clientes zona',
  filterKey: 'groupBy',
  filterParam: 'group_by',
  filterPdf: 'group_by',
  filterLabel: 'Agrupar',
  filterOptions: GROUP_OPTIONS,
  kpis: (totals) => [
    { id: 'count', label: 'Clientes', value: Number(totals.count || 0).toLocaleString('es-CL'), hint: 'registrados' },
    { id: 'companies', label: 'Empresas', value: Number(totals.companies || 0).toLocaleString('es-CL'), hint: 'tipo empresa' },
    { id: 'credit', label: 'Clientes crédito', value: Number(totals.credit_customers || 0).toLocaleString('es-CL'), hint: 'habilitados' },
  ],
  chart: { title: 'Distribución de clientes', subtitle: 'Cantidad de clientes según agrupación seleccionada', labelKey: 'dimension', valueKey: 'count' },
  detailColumns: [
    ['registration_date', 'Registro'], ['customer_code', 'Código'], ['customer_name', 'Cliente'], ['tax_id', 'RUT'], ['region', 'Región'], ['city', 'Ciudad'], ['customer_type', 'Tipo'], ['status_label', 'Estado'], ['is_credit_customer', 'Crédito', 'bool'],
  ],
  groupedColumns: [
    ['dimension', 'Dimensión'], ['count', 'Clientes', 'number', true], ['companies', 'Empresas', 'number', true], ['individuals', 'Personas', 'number', true], ['credit_customers', 'Crédito', 'number', true],
  ],
};

const CustomerGeographyReport = () => <CustomerReportBase config={config} />;

export default CustomerGeographyReport;
