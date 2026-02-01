import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ModuleRouteProps {
    module: string;
    children: React.ReactNode;
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ module, children }) => {
    const { user } = useAuth();

    // If user is superadmin, allow everything
    if (user?.role === 'superadmin') {
        return <>{children}</>;
    }

    // Legacy support: if no modules defined (old session), allow access
    // Ideally, valid sessions should have modules. You might want to force logout here if strictness is required.
    // Core modules are always allowed
    if (module === 'core') {
        return <>{children}</>;
    }

    // Legacy support: if modules UNDEFINED (old session), allow access
    if (!user?.modules) {
        return <>{children}</>;
    }

    // If modules is empty array (explicitly no modules), deny access
    if (user.modules.length === 0) {
        return <Navigate to="/dashboard" replace />;
    }

    if (user.modules.includes(module)) {
        return <>{children}</>;
    }

    // Redirect to dashboard if module not enabled
    return <Navigate to="/dashboard" replace />;
};
