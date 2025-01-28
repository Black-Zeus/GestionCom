import React from "react";

const Button = ({
  text,
  onClick,
  type = "button",
  textColor = "text-white",
  bgColor = "bg-blue-500 hover:bg-blue-600",
  disabled = false,
  size = "md", // Valores posibles: "sm", "md", "lg"
  icon = null, // Puede ser un componente React o una cadena para un ícono
}) => {
  // Mapear tamaños a clases Tailwind
  const sizeClasses = {
    sm: "py-1 px-2 text-sm",
    md: "py-2 px-4 text-base",
    lg: "py-3 px-6 text-lg",
  };

  return (
    <button
      type={type}
      className={`flex items-center justify-center font-bold rounded ${sizeClasses[size]} ${textColor} ${bgColor} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {text}
    </button>
  );
};

export default Button;
