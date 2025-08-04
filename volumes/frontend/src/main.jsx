/* ./src/main.jsx */
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import getAppRoutes from "./routes/treeRoutes";

const router = createBrowserRouter(getAppRoutes(), {
  future: {
    v7_startTransition: true,
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);
