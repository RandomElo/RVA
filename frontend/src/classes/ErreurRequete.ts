export default class ErreurRequete extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ErreurRequete";
        this.status = status;
    }
}
