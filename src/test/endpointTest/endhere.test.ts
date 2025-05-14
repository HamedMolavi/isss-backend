import { Request, Response, NextFunction } from 'express';

export function endHere(reqAttrToShow: string | Array<string> = '', showRes: boolean = false) {
	return function (req: Request, res: Response, _next: NextFunction) {
		console.log('endHere');
		if (reqAttrToShow) {
			// @ts-ignore
			if (typeof reqAttrToShow === 'object') reqAttrToShow.forEach((el) => console.log(el, req[el]));
			// @ts-ignore
			else console.log(req[reqAttrToShow]);
		} else console.log(req);

		if (showRes) console.log(res);
		return res.status(200).end();
	};
}

export function printMiddleware(reqAttrToShow: string | Array<string> = '', showRes: boolean = false) {
	return function (req: Request, res: Response, next: NextFunction) {
		console.log('Logging middleware');
		if (reqAttrToShow) {
			// @ts-ignore
			if (typeof reqAttrToShow === 'object') reqAttrToShow.forEach((el) => console.log(el, req[el]));
			// @ts-ignore
			else console.log(req[reqAttrToShow]);
		} else console.log(req);

		if (showRes) console.log(res);
		return next();
	};
}
