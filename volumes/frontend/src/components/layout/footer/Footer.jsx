import React from "react";
import CompanyName from "./CompanyName";
import Policy from "./Policy";
import EnvironmentVersion from "./EnvironmentVersion";

const Footer = () => (
    <footer className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark py-6 shadow-t-md">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-12 gap-4">
                <CompanyName />
                <Policy />
                <EnvironmentVersion />
            </div>
        </div>
    </footer>
);

export default Footer;
