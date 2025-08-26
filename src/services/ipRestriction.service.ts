import { Request } from 'express';
import { IUserDocument } from '../types/interfaces/user.interface';
import User from '../db/mongo/models/user';
import { get_user_agent } from '../tools/user_agent.utility';

class IPRestrictionService {
	/**
	 * Adds an IP address to the user's allowed IPs
	 * @param {IUserDocument} user - The user to add the IP for
	 * @param {string} ip - The IP address to add
	 * @returns {Promise<boolean>} - True if successful
	 */
	static async addAllowedIP(user: IUserDocument, ip: string): Promise<boolean> {
		try {
			const result = await User.updateOne(
				{ _id: user._id },
				{
					$addToSet: { allowed_ips: ip }
				}
			);
			return result.modifiedCount > 0;
		} catch (error) {
			console.error('Error adding IP:', error);
			return false;
		}
	}

	/**
	 * Removes an IP address from the user's allowed IPs
	 * @param {IUserDocument} user - The user to remove the IP from
	 * @param {string} ip - The IP address to remove
	 * @returns {Promise<boolean>} - True if successful
	 */
	static async removeAllowedIP(user: IUserDocument, ip: string): Promise<boolean> {
		try {
			const result = await User.updateOne(
				{ _id: user._id },
				{
					$pull: { allowed_ips: ip }
				}
			);
			return result.modifiedCount > 0;
		} catch (error) {
			console.error('Error removing IP:', error);
			return false;
		}
	}

	/**
	 * Enables IP restriction for a user
	 * @param {IUserDocument} user - The user to enable IP restriction for
	 * @returns {Promise<boolean>} - True if successful
	 */
	static async enableIPRestriction(user: IUserDocument): Promise<boolean> {
		try {
			const result = await User.updateOne(
				{ _id: user._id },
				{
					$set: { ip_restricted: true }
				}
			);
			return result.modifiedCount > 0;
		} catch (error) {
			console.error('Error enabling IP restriction:', error);
			return false;
		}
	}

	/**
	 * Disables IP restriction for a user
	 * @param {IUserDocument} user - The user to disable IP restriction for
	 * @returns {Promise<boolean>} - True if successful
	 */
	static async disableIPRestriction(user: IUserDocument): Promise<boolean> {
		try {
			const result = await User.updateOne(
				{ _id: user._id },
				{
					$set: { ip_restricted: false }
				}
			);
			return result.modifiedCount > 0;
		} catch (error) {
			console.error('Error disabling IP restriction:', error);
			return false;
		}
	}

	/**
	 * Checks if an IP is allowed for a user
	 * @param {IUserDocument} user - The user to check
	 * @param {string} ip - The IP address to check
	 * @returns {boolean} - True if the IP is allowed
	 */
	static isIPAllowed(user: IUserDocument, ip: string): boolean {
		if (!user.ip_restricted) {
			return true;
		}

		if (!user.allowed_ips || user.allowed_ips.length === 0) {
			return false;
		}

		return user.allowed_ips.includes(ip);
	}

	/**
	 * Gets the client IP from the request
	 * @param {Request} req - The Express request object
	 * @returns {string} - The client IP address
	 */
	static getClientIP(req: Request): string {
		const user_agent = get_user_agent(req);
		const ip = user_agent?.ip as string;
		// Only return IPv4 format (e.g., 1.1.1.1)
		const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
		if (ip && ipv4Regex.test(ip)) {
			return ip;
		}
		return '';
	}
}

export default IPRestrictionService;
