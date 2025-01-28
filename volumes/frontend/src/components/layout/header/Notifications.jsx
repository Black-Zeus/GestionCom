import React from "react";
import { RiNotification3Line } from "react-icons/ri";

const Notifications = ({ activeMenu, toggleMenu }) => {
  const notifications = [
    { id: 1, title: "Actualización del Sistema", message: "Nueva versión disponible.", time: "12:45 PM - 2024-01-10" },
    { id: 2, title: "Tareas Pendientes", message: "Tienes 3 tareas sin completar.", time: "9:30 AM - 2024-01-10" },
  ];

  return (
    <div className="relative">
      <button
        className="relative p-2 bg-background-light dark:bg-background-dark rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        onClick={() => toggleMenu("notif")}
      >
        <RiNotification3Line size={24} className="text-primary" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </button>

      {activeMenu === "notif" && (
        <div className="absolute z-50 right-0 mt-2 w-72 bg-background-light dark:bg-background-dark shadow-md rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <ul className="text-sm">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer border-b border-gray-300 dark:border-gray-600"
              >
                <p className="font-bold text-primary">{notification.title}</p>
                <p className="text-gray-600 dark:text-gray-400">{notification.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{notification.time}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 pt-2 text-center">
            <button className="text-primary font-medium hover:underline">Ver todas</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
