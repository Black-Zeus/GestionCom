import Home from "../pages/Home";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Loren from "../pages/Loren";

const mainRoutes = [
    { path: "/", element: <Home /> },
    { path: "about", element: <About /> },
    { path: "contact", element: <Contact /> },
    { path: "loren", element: <Loren /> },
];

export default mainRoutes;
