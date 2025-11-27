import React from 'react';
import { Icon } from "@components/ui/icon/iconManager";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 mt-6 py-4">
      <button
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg cursor-pointer transition-all text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handlePrevious}
        disabled={currentPage === 1}
      >
        <Icon name="chevronLeft" className="w-4 h-4" />
        Anterior
      </button>

      <div className="flex gap-1">
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            className={`min-w-[40px] h-10 px-3 py-2 border rounded-lg transition-all text-sm font-medium ${
              page === currentPage
                ? 'bg-blue-500 border-blue-500 text-white'
                : page === '...'
                ? 'border-none cursor-default'
                : 'border-gray-200 bg-white text-gray-700 cursor-pointer hover:bg-gray-50 hover:border-gray-300'
            }`}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg cursor-pointer transition-all text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleNext}
        disabled={currentPage === totalPages}
      >
        Siguiente
        <Icon name="chevronRight" className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;