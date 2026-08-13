import { createContext, useContext, useState, type ReactNode } from "react";
interface ErreurContextType {
    erreur: Error | null;
    setErreur: React.Dispatch<React.SetStateAction<Error | null>>;
}
const ErreurContext = createContext<ErreurContextType | undefined>(undefined);

export const ErreurProvider = ({ children }: { children: ReactNode }) => {
    const [erreur, setErreur] = useState<Error | null>(null);

    return <ErreurContext.Provider value={{ erreur, setErreur }}>{children}</ErreurContext.Provider>;
};

export function useErreur() {
    const context = useContext(ErreurContext);
    if (!context) {
        throw new Error("useErreur doit être utilisé dans un ErreurProvider");
    }
    return context;
}
