import React from "react";
import PageTitle from "../features/PageTitle/PageTitle";

const About = () => {
  return (
    <div>
      <PageTitle title="Acerca de..." />
      <h1 className="text-2xl font-bold">About Page</h1>
      <p>Información acerca de nuestra aplicación.</p>
    </div>
  );
};

export default About;
