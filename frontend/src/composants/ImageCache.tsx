import { useEffect, useState } from "react";
import { useCacheImage } from "../fonctions/useImagesBase";

// ImageCache.tsx
interface ImageCacheProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
}

export function ImageCache({ src, alt, className, width, height }: ImageCacheProps) {
    const [sourceImage, setSourceImage] = useState<string>(src);
    const chargerImage = useCacheImage();

    useEffect(() => {
        let annule = false;
        chargerImage(src).then((urlBlob: string) => {
            if (!annule) setSourceImage(urlBlob);
        });
        return () => { annule = true; };
    }, [src]);

    return <img src={sourceImage} alt={alt} className={className} width={width} height={height} />;
}