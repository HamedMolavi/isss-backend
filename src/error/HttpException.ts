import httpCodeJson from "./httpCodeJson";

interface HttpExceptionInterface {
    status: number;
    message: string;
    name: string;
}

class HttpException extends Error {
    status: number;
    message: string;
    code: string;
    constructor(status: number, message: string, name: string) {
        super(message);
        this.status = status;
        this.code = `${name}/${httpCodeJson[status]}`;
        this.message = message;
    }
}

export default HttpException;