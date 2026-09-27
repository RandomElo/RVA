import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
interface ErreurContextType {
    erreur: Error | null;
    setErreur: React.Dispatch<React.SetStateAction<Error | null>>;
}
const ErreurContext = createContext<ErreurContextType | undefined>(undefined);

export const ErreurProvider = ({ children }: { children: ReactNode }) => {
    const [erreur, setErreur] = useState<Error | null>(null);

    const valeur = useMemo(() => ({ erreur, setErreur }), [erreur]);

    return <ErreurContext.Provider value={valeur}>{children}</ErreurContext.Provider>;
};

export function useErreur() {
    const context = useContext(ErreurContext);
    if (!context) {
        throw new Error("useErreur doit être utilisé dans un ErreurProvider");
    }
    return context;
}
