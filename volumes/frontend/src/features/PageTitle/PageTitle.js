import React, { useEffect } from "react";

const PageTitle = ({ title }) => {
    useEffect(() => {
        document.title = title; // Cambia el título de la página
    }, [title]); // Solo se ejecuta cuando el título cambia
};

export default PageTitle;
