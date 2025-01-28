import React from "react";

const Logo = () => {
  return (
    <div className="flex items-center">
      <img
        src="/assets/logo.png"
        alt="Logo"
        className="h-12 w-auto border-4 bg-white border-primary dark:border-primary-dark rounded-lg shadow-md"
      />
    </div>
  );
};

export default Logo;
