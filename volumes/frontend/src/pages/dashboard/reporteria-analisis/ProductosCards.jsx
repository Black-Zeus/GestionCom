// ProductosCards.jsx
import React from 'react';

const ProductosCards = ({ topProductos, rezagados }) => {
  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="card-title">Top Productos</div>
        <div style={{ fontSize: '12px', marginTop: '10px' }}>
          {topProductos.map((producto, index) => (
            <div key={index}>{producto}</div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">Productos Rezagados</div>
        <div style={{ fontSize: '12px', marginTop: '10px' }}>
          {rezagados.map((producto, index) => (
            <div key={index}>{producto}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductosCards;