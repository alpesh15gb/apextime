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
    if (!user?.modules || user.modules.length === 0) {
        return <>{children}</>;
    }

    // Core modules are always allowed
    if (module === 'core') {
        return <>{children}</>;
    }

    if (user.modules.includes(module)) {
        return <>{children}</>;
    }

    // Redirect to dashboard if module not enabled
    return <Navigate to="/dashboard" replace />;
};
