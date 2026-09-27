import { useMemo, useState, type ReactNode } from "react";
import { ErreurContext } from "./ErreurContext";

export const ErreurProvider = ({ children }: { children: ReactNode }) => {
    const [erreur, setErreur] = useState<Error | null>(null);

    const valeur = useMemo(() => ({ erreur, setErreur }), [erreur]);

    return <ErreurContext.Provider value={valeur}>{children}</ErreurContext.Provider>;
};
