// ====================================
// FOOTER MODULE - BARREL EXPORT
// Exportaciones centralizadas del módulo Footer
// ====================================

// Componente principal
export { default as Footer } from './Footer';

// Componentes de información con iconos
export {
    default as InfoGroupWithIcon,
    BranchInfoGroup,
    CashInfoGroup,
    UserInfoGroup,
    ShiftInfoGroup
} from './InfoGroupWithIcon';

// Selectores
export { default as BranchSelector, useBranchSelector } from './BranchSelector';
export { default as CashSelector, useCashSelector } from './CashSelector';

// Hook principal
export {
    default as useFooterSelectors,
    useBranchSelector as useFooterBranchSelector,
    useCashSelector as useFooterCashSelector,
    useUserSelector,
    useShiftSelector
} from '@/hooks/useFooterSelectors';

// Re-export por defecto del componente principal
export default Footer;