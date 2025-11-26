// Dashboard.jsx
import './Dashboard.css'
import Header from './head/Header'
import DashboardPrincipal from './dashboard-principal/DashboardPrincipal'
import GestionProductos from './gestion-productos/GestionProductos'
import ControlInventario from './control-inventario/ControlInventario'
import PuntoVenta from './punto-venta/PuntoVenta'
import GestionClientes from './gestion-clientes/GestionClientes'
import CuentasPorCobrar from './cuentas-cobrar/CuentasPorCobrar'
import ControlCaja from './control-caja/ControlCaja'
import Devoluciones from './devoluciones/Devoluciones'
import DocumentacionComercial from './documentacion-comercial/DocumentacionComercial'
import ReporteriaAnalisis from './reporteria-analisis/ReporteriaAnalisis'
import CentroNotificaciones from './centro-notificaciones/CentroNotificaciones'

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Header />
      <DashboardPrincipal />
      <GestionProductos />
      <ControlInventario />
      <PuntoVenta />
      <GestionClientes />
      <CuentasPorCobrar />
      <ControlCaja />
      <Devoluciones />
      <DocumentacionComercial />
      <ReporteriaAnalisis />
      <CentroNotificaciones />
    </div>
  )
}

export default Dashboard