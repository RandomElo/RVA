import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { Role } from "../constantes/types/auth";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [chargement, setChargement] = useState(true);
    const [auth, setAuth] = useState(false);
    const [role, setRole] = useState<Role>(null);

    const verificationConnexion = useCallback(async () => {
        try {
            const requete = await fetch("/utilisateurs/verification", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });

            const reponse = await requete.json();
            if (!reponse.etat || !reponse.detail) {
                setAuth(false);
                setRole(null);
            } else {
                setAuth(true);
                setRole(reponse.detail);
            }
        } catch (erreur) {
            console.warn("Vérification de connexion échouée :", erreur);
            setAuth(false);
            setRole(null);
        } finally {
            setChargement(false);
        }
    }, []);

    const deconnexion = useCallback(() => {
        setRole(null)
        setAuth(false);
    }, []);
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

    const valeur = useMemo(
        () => ({ estAuth: auth, role, chargement, verificationConnexion, deconnexion }),
        [auth, role, chargement, verificationConnexion, deconnexion],
    );

    return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
};
