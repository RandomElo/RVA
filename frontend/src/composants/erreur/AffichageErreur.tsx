import type { ReactNode } from "react";
import { useErreur } from "../../contexts/ErreurContext";
import ErreurRequete from "../../classes/ErreurRequete";
import Erreur404 from "./Erreur404";
import Erreur500 from "./Erreur500";
import AccesRefuse from "./AccesRefuse";

export default function AffichageErreur({ children }: { children?: ReactNode }) {
    const { erreur } = useErreur();

    if (!erreur) return children;

    if (erreur instanceof ErreurRequete) {
        if (erreur.status === 404) return <Erreur404 />;
        if (erreur.status === 401 || erreur.status === 403) return <AccesRefuse />;
    }

    const messageDev = import.meta.env.DEV ? erreur.message : undefined;
    return <Erreur500 message={messageDev} />;
}
