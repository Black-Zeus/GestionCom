// src/hooks/useDocumentTitle.js
import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    // Limpieza: restaurar el título anterior si se desmonta el componente
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
