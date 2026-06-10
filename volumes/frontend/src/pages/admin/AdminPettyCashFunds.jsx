import AdminPettyCash from './AdminPettyCash';
import { useAuthStore } from '@/store/useAuthStore';

const MANAGE_FUND_PERMISSIONS = [
  'PETTY_CASH_FUNDS_MANAGE',
  'PETTY_CASH_MANAGE',
  'PETTY_CASH_APPROVE',
  'PETTY_CASH_REPLENISH',
];

const AdminPettyCashFunds = () => {
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const canManageFunds = hasAnyPermission(MANAGE_FUND_PERMISSIONS);

  return <AdminPettyCash scope="funds" readOnlyFunds={!canManageFunds} />;
};

export default AdminPettyCashFunds;
