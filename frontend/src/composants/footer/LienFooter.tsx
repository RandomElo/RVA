import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

interface Props {
    chemin: string;
    texte: string;
}
export default function LienFooter({ chemin, texte }: Props) {
    const [changementPage, setChangementPage] = useState<boolean>(false)

    const localisation = useLocation()
    useEffect(() => {
        function verification() {
            if (changementPage) setChangementPage(false)
        }
        verification()
    }, [localisation]);

    return <NavLink
        to={chemin}
        onClick={() => setChangementPage(true)}
        className={({ isActive }) =>
            `transition hover:text-white ${isActive ? "underline" : ""}`
        }
    >
        {changementPage ? <Loader2 className="animate-spin text-white" size={15} /> : texte}
    </NavLink>
}