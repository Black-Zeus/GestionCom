import { create } from "zustand";
import { persist } from "zustand/middleware";

const useConfigStore = create(
    persist(
        (set) => ({
            environment: import.meta.env.VITE_FRONTEND_ENV || "Desconocido",
            appVersion: import.meta.env.VITE_FRONTEND_VERSION || "0.0.0",

            setEnvironment: (env) => set({ environment: env }),
            setAppVersion: (version) => set({ appVersion: version }),
        }),
        {
            name: "config-store", // Clave para el almacenamiento
            getStorage: () => localStorage, // Usar localStorage
        }
    )
);

export default useConfigStore;
