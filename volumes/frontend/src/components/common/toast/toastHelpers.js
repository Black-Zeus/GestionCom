// src/components/toast/toastHelpers.js
import toast from "react-hot-toast";
import ToastMessage from "./ToastMessage";

const showToast = (type, message, title = null, opts = {}) => {
    return toast.custom(
        (t) => <ToastMessage t={t} type={type} message={message} title={title} />,
        { duration: 4000, ...opts }
    );
};

export const showErrorToast = (message, title = "Error", opts) => showToast("error", message, title, opts);
export const showSuccessToast = (message, title = "Éxito", opts) => showToast("success", message, title, opts);
export const showInfoToast = (message, title = "Información", opts) => showToast("info", message, title, opts);
export const showWarningToast = (message, title = "Advertencia", opts) => showToast("warning", message, title, opts);
