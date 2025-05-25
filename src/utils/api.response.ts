import { Response } from 'express';
import { HttpStatus } from '../types/http_status';
import { ResInterface } from '../types/api.types';

const statusMessages: Record<number, string> = {
	[HttpStatus.OK]: 'Request Found!',
	[HttpStatus.CREATED]: 'Request Found And Content Ready!',
	[HttpStatus.ACCEPTED]: 'Request Accepted This Action takes a long time to process!',
	[HttpStatus.NO_CONTENT]: 'Request Accepted but No Content Here!',
	[HttpStatus.BAD_REQUEST]: 'Bad Request!',
	[HttpStatus.UNAUTHORIZED]: 'Authorization Required!',
	[HttpStatus.FORBIDDEN]: 'Request Forbidden!',
	[HttpStatus.NOT_FOUND]: 'Request Not Found!',
	[HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed!',
	[HttpStatus.NOT_ACCEPTABLE]: 'Not Acceptable!',
	[HttpStatus.PRECONDITION_FAILED]: 'Precondition Failed!',
	[HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error!'
};

export const ApiRes = (res: Response, result: ResInterface): Response => {
	const { status, msg, data } = result;

	return res.status(status).json({
		status,
		msg: msg ?? statusMessages[status] ?? `Status ${status} Happened!`,
		data: data ?? undefined
	});
};
