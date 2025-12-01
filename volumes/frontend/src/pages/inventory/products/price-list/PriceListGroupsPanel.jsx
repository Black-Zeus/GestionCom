import React from "react";

const PriceListGroupsPanel = ({ groups, selectedGroupId, onGroupSelect }) => {
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onGroupSelect(group.id)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
            selectedGroupId === group.id
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
          }`}
        >
          {group.group_name}
        </button>
      ))}
    </div>
  );
};

export default PriceListGroupsPanel;