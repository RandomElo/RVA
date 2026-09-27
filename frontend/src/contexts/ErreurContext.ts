import { createContext, useContext } from "react";
interface ErreurContextType {
    erreur: Error | null;
    setErreur: React.Dispatch<React.SetStateAction<Error | null>>;
}
export const ErreurContext = createContext<ErreurContextType | undefined>(undefined);

export function useErreur() {
    const context = useContext(ErreurContext);
    if (!context) {
        throw new Error("useErreur doit être utilisé dans un ErreurProvider");
    }
    return context;
}
