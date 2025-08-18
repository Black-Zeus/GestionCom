// src/components/toast/ToastMessage.jsx
import React from "react";

/**
 * ToastMessage (para toast.custom)
 * type: "error" | "success" | "info" | "warning"
 */
export default function ToastMessage({ t, type = "info", message, title }) {
    const styles = {
        error: {
            bg:
                "bg-danger-50 dark:bg-danger-900/20 " +
                "border-danger-300 dark:border-danger-700 " +
                "text-danger-700 dark:text-danger-200",
            icon: (
                <svg className="h-6 w-6 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
            ),
        },
        success: {
            bg:
                "bg-success-50 dark:bg-success-900/20 " +
                "border-success-300 dark:border-success-700 " +
                "text-success-700 dark:text-success-200",
            icon: (
                <svg className="h-6 w-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ),
        },
        info: {
            bg:
                "bg-info-50 dark:bg-info-900/20 " +
                "border-info-300 dark:border-info-700 " +
                "text-info-700 dark:text-info-200",
            icon: (
                <svg className="h-6 w-6 text-info-600 dark:text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
            ),
        },
        warning: {
            bg:
                "bg-warning-50 dark:bg-warning-900/20 " +
                "border-warning-300 dark:border-warning-700 " +
                "text-warning-700 dark:text-warning-200",
            icon: (
                <svg className="h-6 w-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z" />
                </svg>
            ),
        },
    };

    const style = styles[type] || styles.info;

    return (
        <div
            className={`${t.visible ? "animate-toast-enter" : "animate-toast-leave"
                } max-w-md w-full ${style.bg} border shadow-lg rounded-card pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            role="alert"
            aria-live="assertive"
        >
            <div className="flex-1 w-0 p-card-padding">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">{style.icon}</div>
                    <div className="ml-3 flex-1">
                        {title && <p className="text-sm font-semibold leading-5">{title}</p>}
                        <p className="mt-1 text-sm leading-5 break-words">{message}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
