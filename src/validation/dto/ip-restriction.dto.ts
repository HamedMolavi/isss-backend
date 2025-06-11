import { IsNotEmpty } from 'class-validator';

export class IPAddressDto {
	@IsNotEmpty({ message: 'IP address is required' })
	ip: string = '';
}
