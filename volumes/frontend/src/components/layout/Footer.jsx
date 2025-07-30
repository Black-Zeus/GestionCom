import { useSidebar } from '@/store/sidebarStore';

function Footer() {
  const { sessionInfo } = useSidebar();

  return (
    <footer className="col-start-2 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-sm">
      
      <div className="text-gray-600">
        © 2025 Sistema de Inventario
      </div>

      <div className="flex items-center gap-6 text-gray-600">
        <span>Sucursal: <strong>{sessionInfo.branch}</strong></span>
        <span>Caja: <strong>{sessionInfo.cashRegister}</strong></span>
        <span>Turno: <strong>{sessionInfo.shift}</strong></span>
      </div>
    </footer>
  );
}

export default Footer;