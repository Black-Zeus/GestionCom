import { CreditCard } from 'lucide-react';
import CustomerReportBase from './CustomerReportBase';

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const CURRENCY_LABEL = 'Peso chileno (CLP)';

const config = {
  title: 'Clientes - historial de pagos',
  endpoint: '/reports/customers/payment-history/data',
  pdfEndpoint: '/reports/customers/payment-history/pdf',
  chartId: 'customers-payments-chart',
  icon: CreditCard,
  color: '#059669',
  groupLabel: 'Por método',
  tableDetail: 'Detalle de pagos',
  tableGrouped: 'Pagos por método',
  csvBase: 'clientes-pagos',
  xlsxSheet: 'Pagos clientes',
  filterKey: 'methodId',
  filterParam: 'method_id',
  filterPdf: 'method_id',
  filterLabel: 'Método',
  dynamicOptionsKey: 'method_options',
  kpis: (totals) => [
    { id: 'total', label: 'Total pagos', value: money(totals.total), hint: CURRENCY_LABEL },
    { id: 'count', label: 'Pagos', value: Number(totals.count || 0).toLocaleString('es-CL'), hint: 'recibidos' },
    { id: 'open', label: 'Sin aplicar', value: money(totals.unallocated), hint: 'saldo no asignado' },
  ],
  chart: { title: 'Pagos por método', subtitle: 'Total recibido por medio de pago', labelKey: 'payment_method_name', valueKey: 'total', money: true },
  detailColumns: [
    ['payment_date', 'Fecha'], ['payment_code', 'Código'], ['customer_name', 'Cliente'], ['tax_id', 'RUT'], ['payment_method_name', 'Método'], ['status_label', 'Estado'], ['payment_amount', 'Monto', 'money', true], ['allocated_amount', 'Aplicado', 'money', true], ['unallocated_amount', 'Sin aplicar', 'money', true],
  ],
  groupedColumns: [
    ['payment_method_name', 'Método'], ['count', 'Pagos', 'number', true], ['total', 'Total', 'money', true], ['allocated', 'Aplicado', 'money', true], ['unallocated', 'Sin aplicar', 'money', true],
  ],
};

const CustomerPaymentHistoryReport = () => <CustomerReportBase config={config} />;

export default CustomerPaymentHistoryReport;
