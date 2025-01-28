import { create } from "zustand";
import { persist } from "zustand/middleware";

const useBranchStore = create(
  persist(
    (set) => ({
      activeBranch: {
        id: 1,
        name: "Sucursal Central",
        address: "Av. Principal 123",
      }, // Estado inicial

      setActiveBranch: (branch) =>
        set(() => ({
          activeBranch: branch,
        })),
    }),
    {
      name: "branch-store", // Nombre del almacenamiento en localStorage
      getStorage: () => localStorage, // Usar localStorage para la persistencia
    }
  )
);

export default useBranchStore;
