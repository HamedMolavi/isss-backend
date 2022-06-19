
class HttpCode {
    [key: number]: string;
    getJson() {
        return JSON.stringify(this);
    }
}

const httpCode = new HttpCode();
httpCode[400] = 'Bad Request';
httpCode[401] = 'Unauthorized';
httpCode[403] = 'Forbidden';
httpCode[404] = 'Not Found';
httpCode[405] = 'Method Not Allowed';
httpCode[200] = 'OK';
httpCode[201] = 'Created';
httpCode[202] = 'Accepted';
httpCode[203] = 'Non-Authoritative Information';
httpCode[204] = 'No Content';
httpCode[205] = 'Reset Content';
httpCode[206] = 'Partial Content';

const httpCodeJson = JSON.parse(httpCode.getJson());

export default httpCodeJson;