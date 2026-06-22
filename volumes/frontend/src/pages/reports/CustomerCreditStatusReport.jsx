import { CreditCard } from 'lucide-react';
import CustomerReportBase from './CustomerReportBase';

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const CURRENCY_LABEL = 'Peso chileno (CLP)';
const ALL_VALUE = 'all';

const RISK_OPTIONS = [
  { value: ALL_VALUE, label: 'Todos los riesgos' },
  { value: 'LOW', label: 'Bajo' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'HIGH', label: 'Alto' },
];

const config = {
  title: 'Clientes - estado de crédito',
  endpoint: '/reports/customers/credit-status/data',
  pdfEndpoint: '/reports/customers/credit-status/pdf',
  chartId: 'customers-credit-chart',
  icon: CreditCard,
  color: '#2563eb',
  groupLabel: 'Por riesgo',
  tableDetail: 'Detalle de crédito',
  tableGrouped: 'Crédito por riesgo',
  csvBase: 'clientes-credito',
  xlsxSheet: 'Credito clientes',
  filterKey: 'riskLevel',
  filterParam: 'risk_level',
  filterPdf: 'risk_level',
  filterLabel: 'Riesgo',
  filterOptions: RISK_OPTIONS,
  kpis: (totals) => [
    { id: 'count', label: 'Clientes crédito', value: Number(totals.count || 0).toLocaleString('es-CL'), hint: 'configurados' },
    { id: 'used', label: 'Crédito usado', value: money(totals.used_credit), hint: CURRENCY_LABEL },
    { id: 'risk', label: 'Alto riesgo', value: Number(totals.high_risk || 0).toLocaleString('es-CL'), hint: 'clientes' },
  ],
  chart: { title: 'Crédito usado por riesgo', subtitle: 'Monto utilizado agrupado por nivel de riesgo', labelKey: 'risk_label', valueKey: 'used_credit', money: true },
  detailColumns: [
    ['customer_name', 'Cliente'], ['tax_id', 'RUT'], ['risk_label', 'Riesgo'], ['credit_limit', 'Límite', 'money', true], ['used_credit', 'Usado', 'money', true], ['available_credit', 'Disponible', 'money', true], ['usage_pct', 'Uso', 'pct', true], ['auto_block_on_overdue', 'Bloqueo auto.', 'bool'],
  ],
  groupedColumns: [
    ['risk_label', 'Riesgo'], ['count', 'Clientes', 'number', true], ['credit_limit', 'Límite', 'money', true], ['used_credit', 'Usado', 'money', true], ['available_credit', 'Disponible', 'money', true],
  ],
};

const CustomerCreditStatusReport = () => <CustomerReportBase config={config} />;

export default CustomerCreditStatusReport;
