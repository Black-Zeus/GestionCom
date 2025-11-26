// TareasTable.jsx
import React from 'react';

const TareasTable = ({ tareas }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Actividades Programadas</div>
      {tareas.map((tarea, index) => (
        <div key={index} className="table-row">
          <span>{tarea.descripcion}</span>
          <span>{tarea.plazo}</span>
        </div>
      ))}
    </div>
  );
};

export default TareasTable;