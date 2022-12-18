"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.send_email = void 0;
const nodemailer = require("nodemailer");
function send_email(email, text) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "ariapanoandishan91@gmail.com",
            pass: "yyaiaclsoaqhljut",
        },
    });
    transporter
        .sendMail({
        from: "ariapanoandishan91@gmail.com",
        to: email,
        subject: "Alerting From ISSS",
        text: text, // plain text body
    })
        .then((info) => {
        console.log({ info });
        return true;
    })
        .catch((error) => {
        console.log(error);
        return false;
    });
    return true;
}
exports.send_email = send_email;
