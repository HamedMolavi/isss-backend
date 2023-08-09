import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import { send_email } from "../../tools/sendEmail";

//create router for add to routes file
const router: Router = Router();

let limit_send_email: string[] = [];

//route for test send email
router.get("/:email", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let email: string = req.params.email;
    if (!email) {
      req.flash("error", "Please enter email");
      return next(new ApiError(400, "Please enter email"));
    }
    if (limit_send_email.includes(email)) {
      //send response
      return res.status(400).json({
        success: false,
        data: "sms already send",
      });
    }

    //send sms test
    let result = send_email(email, "تست ارسال ایمیل");
    if (result) {
      limit_send_email.push(email);
    }
    setTimeout(() => {
      limit_send_email = limit_send_email.filter((item) => {
        if (item != email) {
          return item;
        }
      });
    }, 120000);
    //send response
    return res.status(200).json({
      success: true,
      data: "email sended",
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

export default router;
