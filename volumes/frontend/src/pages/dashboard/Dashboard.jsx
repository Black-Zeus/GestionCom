// Dashboard.jsx

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
    <div className="min-h-screen pt-2 -mt-10">
      <div className="max-w-[100%] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
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
    </div>
  )
}

export default Dashboard