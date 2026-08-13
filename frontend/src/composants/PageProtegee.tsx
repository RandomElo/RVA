import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Ton hook d'auth

// Spinner unique réutilisé
const LoaderGénéral = () => (
    <div className="flex min-h-[60vh] items-center justify-center mx-auto">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
    </div>
);

interface PageProtegeeProps {
    roleRequis?: string;
}

export function PageProtegee({ roleRequis }: PageProtegeeProps) {
    const { estAuth, role, chargement } = useAuth();

    // 1. Si l'auth vérifie encore le token/session localement : loader unique !
    if (chargement) {
        return <LoaderGénéral />;
    }

    // 2. Si non connecté ou mauvais rôle -> Redirection
    if (!estAuth) {
        return <Navigate to="/connexion" replace />;
    }

    if (roleRequis && role !== roleRequis) {
        return <Navigate to="/" replace />;
    }

    // 3. Si tout est OK, on encapsule l'Outlet (qui va charger le chunk lazy) dans Suspense
    return (
        <Suspense fallback={<LoaderGénéral />}>
            <Outlet />
        </Suspense>
    );
}