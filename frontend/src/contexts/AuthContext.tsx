import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Role } from "../constantes/types/auth";

interface AuthContextType {
    role: Role;
    estAuth: boolean;
    chargement: boolean;
    deconnexion: () => void;
    verificationConnexion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [chargement, setChargement] = useState(true);
    const [auth, setAuth] = useState(false);
    const [role, setRole] = useState<Role>(null);

    const verificationConnexion = async () => {
        const requete = await fetch("/utilisateurs/verification", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        const reponse = await requete.json();
        if (!reponse.etat) {
            setAuth(false);
            throw new Error(reponse.detail);
        } else {
            if (!reponse.detail) {
                setAuth(false);
            } else {
                setAuth(true);
                setRole(reponse.detail);
            }
        }

        setChargement(false);
    };

    const deconnexion = () => {
        setRole(null)
        setAuth(false);
    };
    useEffect(() => {
        verificationConnexion();

        // Interval
        const interval = setInterval(verificationConnexion, 30 * 1000);

        // Détection focus page
        const changementVisiblite = () => {
            if (document.visibilityState === "visible") verificationConnexion();
        };

        document.addEventListener("visibilitychange", changementVisiblite);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", changementVisiblite);
        };
    }, [verificationConnexion]);

    return <AuthContext.Provider value={{ estAuth: auth, role, chargement, verificationConnexion, deconnexion }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé dans un AuthProvider");
    }
    return context;
};
