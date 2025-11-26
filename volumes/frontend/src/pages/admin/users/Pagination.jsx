import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex justify-center items-center gap-4">
      <button
        onClick={handlePrevPage}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-white text-gray-900 border-2 border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all flex items-center gap-2"
      >
        <Icon name="chevronLeft" className="text-sm" />
        Anterior
      </button>

      <span className="text-gray-900 font-medium">
        Página {currentPage} de {totalPages}
      </span>

      <button
        onClick={handleNextPage}
        disabled={currentPage === totalPages || totalPages === 0}
        className="px-4 py-2 bg-white text-gray-900 border-2 border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all flex items-center gap-2"
      >
        Siguiente
        <Icon name="chevronRight" className="text-sm" />
      </button>
    </div>
  );
};

export default Pagination;
