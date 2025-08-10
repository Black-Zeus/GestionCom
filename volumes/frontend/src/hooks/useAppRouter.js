// useAppRouter.js - Hook personalizado que wrappea React Router
// API consistente y funciones adicionales

import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export const useAppRouter = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // Convertir searchParams a objeto
    const query = useMemo(() => {
        const queryObj = {};
        for (const [key, value] of searchParams) {
            queryObj[key] = value;
        }
        return queryObj;
    }, [searchParams]);

    // Funciones de navegación mejoradas
    const goTo = (path, options = {}) => {
        navigate(path, options);
    };

    const goBack = () => {
        navigate(-1);
    };

    const goForward = () => {
        navigate(1);
    };

    const replace = (path, options = {}) => {
        navigate(path, { ...options, replace: true });
    };

    // Funciones de query params
    const setQuery = (newQuery) => {
        setSearchParams(newQuery);
    };

    const addQuery = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set(key, value);
        setSearchParams(newParams);
    };

    const removeQuery = (key) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(key);
        setSearchParams(newParams);
    };

    // Utilidades
    const isActive = (path) => {
        return location.pathname === path;
    };

    const matches = (pattern) => {
        return location.pathname.startsWith(pattern);
    };

    return {
        // Estado actual
        location,
        params,
        query,
        pathname: location.pathname,

        // Navegación
        goTo,
        goBack,
        goForward,
        replace,
        navigate, // React Router original

        // Query params
        setQuery,
        addQuery,
        removeQuery,

        // Utilidades
        isActive,
        matches
    };
};

// Hooks específicos simplificados
export const useAppParams = () => {
    const { params } = useAppRouter();
    return params;
};

export const useAppQuery = () => {
    const { query, setQuery, addQuery, removeQuery } = useAppRouter();
    return { query, setQuery, addQuery, removeQuery };
};

export const useAppNavigation = () => {
    const { goTo, goBack, goForward, replace } = useAppRouter();
    return { goTo, goBack, goForward, replace };
};

export default useAppRouter;