import React, { useState } from "react";

const Accordion = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex((prevIndex) => (prevIndex === index ? null : index));
  };

  return (
    <div className="accordion">
      {items.map((item, index) => (
        <div key={index} className="accordion-item border border-gray-200 rounded-lg mb-2">
          <h2 className="accordion-header">
            <button
              type="button"
              className={`flex items-center justify-between w-full p-5 font-medium text-gray-500 border-b ${
                activeIndex === index ? "bg-gray-100" : "hover:bg-gray-100"
              } focus:ring-4 focus:ring-gray-200`}
              onClick={() => toggleAccordion(index)}
            >
              <span>{item.title}</span>
              <svg
                className={`w-3 h-3 transform ${activeIndex === index ? "rotate-180" : "rotate-0"}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 10 6"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5 5 1 1 5"
                />
              </svg>
            </button>
          </h2>
          <div
            className={`accordion-content ${
              activeIndex === index ? "block" : "hidden"
            } p-5 text-gray-500 border-t border-gray-200`}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Accordion;
