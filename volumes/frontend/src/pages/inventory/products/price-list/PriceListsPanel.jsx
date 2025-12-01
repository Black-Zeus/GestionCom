import React from "react";
import { Icon } from "@components/ui/icon/iconManager";

const PriceListsPanel = ({
  lists,
  selectedListId,
  onListSelect,
  selectedGroupId,
}) => {
  if (!selectedGroupId) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Icon name="folder" className="text-3xl mb-2 block" />
        <p className="text-sm">Selecciona un grupo</p>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Icon name="inbox" className="text-3xl mb-2 block" />
        <p className="text-sm">Sin listas en este grupo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
      {lists.map((list) => (
        <div
          key={list.id}
          onClick={() => onListSelect(list.id)}
          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
            selectedListId === list.id
              ? "border-blue-400 bg-blue-50 shadow-sm"
              : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm hover:-translate-y-0.5"
          }`}
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {list.price_list_name}
          </h4>
          <p className="text-xs text-gray-500">
            {list.price_list_code} • {list.currency} • {list.status}
          </p>
        </div>
      ))}
    </div>
  );
};

export default PriceListsPanel;