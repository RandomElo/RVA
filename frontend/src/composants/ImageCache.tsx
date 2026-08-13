import { useEffect, useState } from "react";
import { useCacheImage } from "../fonctions/useImagesBase";

export function ImageCache({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [sourceImage, setSourceImage] = useState<string>(src);
    const chargerImage = useCacheImage();

    useEffect(() => {
        chargerImage(src).then((urlBlob: string) => {
            setSourceImage(urlBlob);
        });
    }, [src]);

    return <img src={sourceImage} alt={alt} className={className} />;
}