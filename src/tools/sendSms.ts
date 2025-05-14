const TrezSmsClient = require('trez-sms-client');
const client = new TrezSmsClient('sasan11666', '890073570');

export function send_sms(phone_number: string, message: string): Boolean {
	let id: string = Math.round(Math.random() * 1000000000).toString();

	client
		.sendMessage('5000248725', phone_number, message, id)
		.then((receipt: any) => {
			console.log('Receipt: ' + receipt);
			return true;
		})
		.catch((error: any) => {
			// If there is an error, we'll catch that
			console.log(error.isHttpException, error.code, error.message);
			return false;
		});
	return true;
}
