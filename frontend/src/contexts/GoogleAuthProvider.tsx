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
        return null;
    }

    return (
        <Suspense fallback={<div className="h-10 w-full animate-pulse rounded-lg bg-club-100" />}>
            <LazyGoogleProvider clientId={clientId}>
                {children}
            </LazyGoogleProvider>
        </Suspense>
    );
}