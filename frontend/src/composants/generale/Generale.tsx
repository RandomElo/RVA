import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import "../../styles/Generale.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { NotificationsProvider } from "../../contexts/NotificationsContext";
import Notifications from "./Notifications";
import AffichageErreur from "../erreur/AffichageErreur";
import { useSuiviPage } from "../../fonctions/suivi/useSuiviPage";
import { useErreur } from "../../contexts/ErreurContext";

export default function Generale({ children }: { children?: ReactNode }) {
    const location = useLocation();
    const { setErreur } = useErreur()
    useSuiviPage()

    useEffect(() => {
        function suppressionErreur() {
            setErreur(null);
        }
        suppressionErreur()
    }, [location.pathname, location.search, location.hash]);
    
    return (
        <>
            <NotificationsProvider>
                <Navbar />
                <AffichageErreur>
                    <main className="flex flex-1">{children || <Outlet />}</main>
                </AffichageErreur>
                <Footer />
                <Notifications />
            </NotificationsProvider>
        </>
    );
}
