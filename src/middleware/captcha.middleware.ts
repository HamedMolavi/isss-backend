import { Request, Response, NextFunction } from 'express';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import CaptchaService from '../services/captcha.service';

export async function generateLoginCaptcha(req: Request, res: Response): Promise<Response | void> {
	try {
		const captcha = await CaptchaService.createCaptcha();
		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				captcha_id: captcha.id,
				captcha_svg: captcha.svg
			}
		});
	} catch (error) {
		console.error('Failed to create captcha', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Unable to create captcha'
		});
	}
}

export async function validateLoginCaptcha(
	req: Request,
	res: Response,
	next: NextFunction
): Promise<Response | void> {
	const { captcha_id, captcha_value } = req.body ?? {};

	if (!captcha_value || !captcha_id) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Captcha value is required'
		});
	}

	try {
		const result = await CaptchaService.consumeCaptcha(captcha_id, captcha_value);

		if (result === 'ok') {
			return next();
		}

		if (result === 'expired') {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Captcha expired'
			});
		}

		if (result === 'missing') {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Captcha is required'
			});
		}

		// invalid
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'Invalid captcha'
		});
	} catch (error) {
		console.error('Failed to validate captcha in redis', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Session error'
		});
	}
}
