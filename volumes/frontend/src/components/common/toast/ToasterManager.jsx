import { Toaster } from "react-hot-toast";

/**
 * ToasterManager
 * Monta el <Toaster/> con configuración global, z-index alto
 * y clases por defecto coherentes con tu paleta y dark mode.
 */
export default function ToasterManager() {
    return (
        <Toaster
            position="booton-right"
            gutter={8}
            containerStyle={{ zIndex: 1100 }} // por encima de popovers/tooltips
            toastOptions={{
                duration: 4000,
                // Para toasts “built-in” (no custom)
                className:
                    // base neutra + animaciones de tu Tailwind
                    "animate-toast-enter data-[swipe=end]:animate-toast-leave " +
                    "bg-surface-light dark:bg-surface-dark " +
                    "text-secondary-900 dark:text-secondary-50 " +
                    "border border-border-light dark:border-border-dark " +
                    "shadow-lg rounded-card",
                // Variantes built-in (success/error/loading) por si en algún punto las usas
                success: {
                    className:
                        "animate-toast-enter data-[swipe=end]:animate-toast-leave " +
                        "bg-success-50 dark:bg-success-900/20 " +
                        "text-success-700 dark:text-success-200 " +
                        "border border-success-300 dark:border-success-700 " +
                        "shadow-lg rounded-card",
                },
                error: {
                    className:
                        "animate-toast-enter data-[swipe=end]:animate-toast-leave " +
                        "bg-danger-50 dark:bg-danger-900/20 " +
                        "text-danger-700 dark:text-danger-200 " +
                        "border border-danger-300 dark:border-danger-700 " +
                        "shadow-lg rounded-card",
                },
                loading: {
                    className:
                        "animate-toast-enter data-[swipe=end]:animate-toast-leave " +
                        "bg-info-50 dark:bg-info-900/20 " +
                        "text-info-700 dark:text-info-200 " +
                        "border border-info-300 dark:border-info-700 " +
                        "shadow-lg rounded-card",
                },
                // Accesibilidad
                ariaProps: { role: "status", "aria-live": "polite" },
            }}
        />
    );
}
