import { createContext, useContext } from "react";
import type { Role } from "../constantes/types/auth";

interface AuthContextType {
    role: Role;
    estAuth: boolean;
    chargement: boolean;
    deconnexion: () => void;
    verificationConnexion: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé dans un AuthProvider");
    }
    return context;
};
