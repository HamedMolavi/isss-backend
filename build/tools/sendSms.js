"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.send_sms = void 0;
const TrezSmsClient = require("trez-sms-client");
const client = new TrezSmsClient("sasan11666", "890073570");
function send_sms(phone_number, message) {
    let id = Math.round(Math.random() * 1000000000).toString();
    client
        .sendMessage("5000248725", phone_number, message, id)
        .then((receipt) => {
        console.log("Receipt: " + receipt);
        return true;
    })
        .catch((error) => {
        // If there is an error, we'll catch that
        console.log(error.isHttpException, error.code, error.message);
        return false;
    });
    return true;
}
exports.send_sms = send_sms;
