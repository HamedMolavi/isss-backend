const nodemailer = require("nodemailer");

export function send_email(email: string, text: string): Boolean {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "ariapanoandishan91@gmail.com",
      pass: "yyaiaclsoaqhljut",
    },
  });

  transporter
    .sendMail({
      from: "ariapanoandishan91@gmail.com", // sender address
      to: email, // list of receivers
      subject: "Alerting From ISSS", // Subject line
      text: text, // plain text body
    })
    .then((info: any) => {
      console.log({ info });
      return true;
    })
    .catch((error: any) => {
      console.log(error);
      return false;
    });
    return true;
}
