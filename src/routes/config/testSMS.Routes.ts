import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/classes/error.class';
import { send_sms } from '../../tools/sendSms';

//create router for add to routes file
const router: Router = Router();

let limit_send_sms: string[] = [];

//route for test send sms
router.get('/:phone_number', async function (req: Request, res: Response, next: NextFunction) {
	try {
		//get id from url
		let phone_number: string = req.params.phone_number;
		if (!phone_number) {
			req.flash('error', 'Please enter phone number');
			return next(new ApiError(400, 'Please enter phone number'));
		}

		if (limit_send_sms.includes(phone_number)) {
			//send response
			return res.status(400).json({
				success: false,
				data: 'sms already sent'
			});
		}

		//send sms test
		let result = send_sms(phone_number, 'تست ارسال اس ام اس');
		if (result) {
			limit_send_sms.push(phone_number);
			setTimeout(() => {
				limit_send_sms = limit_send_sms.filter((item) => {
					if (item != phone_number) {
						return item;
					}
				});
			}, 120000);
		}
		//send response
		return res.status(200).json({
			success: true,
			data: 'sms sent'
		});
	} catch (err: any) {
		return next(new ApiError(500, 'internal server error , ' + err.message));
	}
});

export default router;
