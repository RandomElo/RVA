export function genererChaine(taille) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < taille; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

export function genererNombre(taille) {
    const min = 10 ** (taille - 1);
    const max = 10 ** taille - 1;

    return Math.floor(Math.random() * (max - min + 1)) + min;
}