import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const ResponsiveContext = createContext({
    estMobile: false,
    estTablette: false,
    estOrdinateur: true,
});

export function ResponsiveProvider({ children }: { children: ReactNode }) {
    const [taille, setTaille] = useState(window.innerWidth);

    useEffect(() => {
        const onResize = () => {
            setTaille(window.innerWidth);
        };

        window.addEventListener("resize", onResize);

        return () => window.removeEventListener("resize", onResize);
    }, []);

    const value = {
        estMobile: taille <= 768,
        estTablette: taille > 768 && taille <= 1024,
        estOrdinateur: taille > 1024,
    };

    return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}

export function useResponsive() {
    return useContext(ResponsiveContext);
}
