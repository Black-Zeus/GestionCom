import React, { useState } from "react";
import { RiSearchLine } from "react-icons/ri";

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState(""); // Estado para búsqueda

  return (
    <div className="relative w-96 hidden sm:block">
      <input
        type="text"
        placeholder="Buscar..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="px-4 py-2 w-full rounded-full border-none focus:ring-2 focus:ring-primary 
            bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
      />
      <RiSearchLine className="absolute right-3 top-3 text-gray-400 dark:text-gray-500" size={20} />
    </div>
  );
};

export default SearchBar;
