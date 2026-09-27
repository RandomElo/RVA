import { createContext, useContext } from "react";

export const ResponsiveContext = createContext({
    estMobile: false,
    estTablette: false,
    estOrdinateur: true,
});

export function useResponsive() {
    return useContext(ResponsiveContext);
}
