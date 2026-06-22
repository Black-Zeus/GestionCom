import { Users } from 'lucide-react';
import CustomerReportBase from './CustomerReportBase';

const money = (value) => Number(value || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const CURRENCY_LABEL = 'Peso chileno (CLP)';

const config = {
  title: 'Clientes - ranking de clientes',
  endpoint: '/reports/customers/ranking/data',
  pdfEndpoint: '/reports/customers/ranking/pdf',
  chartId: 'customers-ranking-chart',
  icon: Users,
  color: '#e11d48',
  groupLabel: 'Por cliente',
  tableDetail: 'Detalle de ventas',
  tableGrouped: 'Ranking por cliente',
  csvBase: 'clientes-ranking',
  xlsxSheet: 'Ranking clientes',
  kpis: (totals, rows) => [
    { id: 'total', label: 'Total ventas', value: money(totals.total), hint: CURRENCY_LABEL },
    { id: 'clients', label: 'Clientes', value: Number(totals.client_count || rows.length || 0).toLocaleString('es-CL'), hint: 'con compras' },
    { id: 'txns', label: 'Transacciones', value: Number(totals.txn_count || 0).toLocaleString('es-CL'), hint: 'ventas cerradas' },
  ],
  chart: { title: 'Top clientes', subtitle: 'Monto vendido por cliente', labelKey: 'customer_name', valueKey: 'total', horizontal: true, money: true },
  detailColumns: [
    ['sale_date', 'Fecha'], ['folio', 'Folio'], ['customer_name', 'Cliente'], ['tax_id', 'RUT'], ['warehouse_name', 'Sucursal'], ['payment_method_name', 'Pago'], ['total', 'Total', 'money', true],
  ],
  groupedColumns: [
    ['customer_name', 'Cliente'], ['tax_id', 'RUT'], ['txn_count', 'Ventas', 'number', true], ['total', 'Total', 'money', true], ['pct', '% total', 'pct', true], ['avg_ticket', 'Ticket prom.', 'money', true],
  ],
};

const CustomerRankingReport = () => <CustomerReportBase config={config} />;

export default CustomerRankingReport;
