import React from "react";
import { RiStore2Line } from "react-icons/ri";
import useBranchStore from "../../../store/branchStore";

const BranchSelector = ({ activeMenu, toggleMenu }) => {
    const { activeBranch, setActiveBranch } = useBranchStore();
    const branches = [
        { id: 1, name: "Sucursal Central", address: "Av. Principal 123" },
        { id: 2, name: "Bodega Norte", address: "Calle 45, Zona Industrial" },
        { id: 3, name: "Tienda Sur", address: "Av. Sur 321, Centro" },
    ];

    return (
        <div className="relative">
            <button
                className="flex flex-col text-left px-4 py-2 rounded-md dark:border-gray-600 
            bg-background-light dark:bg-background-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                onClick={() => toggleMenu("branch")}
            >
                <span className="font-semibold">{activeBranch.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{activeBranch.address}</span>
            </button>
            {activeMenu === "branch" && (
                <div className="absolute z-50 right-0 mt-2 w-64 bg-background-light dark:bg-background-dark shadow-md rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    {branches.map((branch) => (
                        <div
                            key={branch.id}
                            className="grid grid-cols-[auto,1fr] gap-3 p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                            onClick={() => {
                                setActiveBranch(branch);
                                toggleMenu(null);
                            }}
                        >
                            {/* Icono centrado horizontal y verticalmente en su celda */}
                            <div className="flex items-center justify-center">
                                <RiStore2Line size={24} />
                            </div>

                            {/* Información de la sucursal (nombre y dirección) */}
                            <div className="col-span-1">
                                <p className="font-semibold">{branch.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{branch.address}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BranchSelector;
