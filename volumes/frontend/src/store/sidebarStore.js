import { create } from "zustand";
import { persist } from "zustand/middleware";

const useSidebarStore = create(
    persist(
      (set, get) => ({
        isOpen: false, // Estado para móviles
        isCollapsed: false, // Estado para pantallas grandes
        expandedMenu: null, // Submenús expandidos
        darkMode: false, // Estado inicial (por defecto claro)
        menuItems: [], // Almacén de menús dinámicos
  
        // Acciones
        toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
        toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
        toggleSubMenu: (menu) =>
          set((state) => ({
            expandedMenu: state.expandedMenu === menu ? null : menu,
          })),
        toggleDarkMode: () =>
          set((state) => {
            const newMode = !state.darkMode;
            localStorage.setItem("theme", newMode ? "dark" : "light");
            document.documentElement.classList.toggle("dark", newMode);
            return { darkMode: newMode };
          }),
        setMenuItems: (menuItems) => set({ menuItems }), // Setter para menús dinámicos
  
        // Cargar Estado Persistente al Iniciar
        initializeTheme: () => {
          const storedTheme = get().darkMode; // Obtener estado persistido
          if (storedTheme) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        },
      }),
      {
        name: "sidebar-store", // Nombre en LocalStorage
        getStorage: () => localStorage, // Usar localStorage
      }
    )
  );
  
  export default useSidebarStore;
  