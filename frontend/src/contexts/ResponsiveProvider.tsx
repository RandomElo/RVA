import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ResponsiveContext } from "./ReponsiveContext";

export function ResponsiveProvider({ children }: { children: ReactNode }) {
    const [taille, setTaille] = useState(window.innerWidth);

    useEffect(() => {
        // Une seule mise à jour par frame, même si "resize" est émis en rafale
        let idFrame: number | null = null;
        const onResize = () => {
            if (idFrame !== null) return;
            idFrame = requestAnimationFrame(() => {
                idFrame = null;
                setTaille(window.innerWidth);
            });
        };

        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            if (idFrame !== null) cancelAnimationFrame(idFrame);
        };
    }, []);

    const value = useMemo(
        () => ({
            estMobile: taille <= 768,
            estTablette: taille > 768 && taille <= 1024,
            estOrdinateur: taille > 1024,
        }),
        [taille],
    );

    return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}
