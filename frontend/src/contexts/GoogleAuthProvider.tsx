import { lazy, Suspense, type ReactNode } from 'react';

const LazyGoogleProvider = lazy(() =>
    import('@react-oauth/google').then((module) => ({
        default: module.GoogleOAuthProvider,
    }))
);

interface Props {
    children: ReactNode;
}

export default function GoogleAuthProvider({ children }: Props) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
        return <>{children}</>;
    }

    return (
        <Suspense
            fallback={
                /* On réserve un espace vide identique au bloc du formulaire */
                <div className="w-full min-h-[420px] rounded-2xl bg-club-50/40 p-8 shadow-sm backdrop-blur-sm animate-pulse" />
            }
        >
            <LazyGoogleProvider clientId={clientId}>
                {children}
            </LazyGoogleProvider>
        </Suspense>
    );
}