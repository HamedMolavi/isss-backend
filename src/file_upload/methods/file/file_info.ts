import { Logger } from '../../../logger';
import FileModel from '../../models/file.model';

export class FileInfo {
	/**
	 *
	 * @param url
	 * @param user_id
	 */
	async get_by_url(url: string, user_id: string | null): Promise<RestApi.ObjectResInterface> {
		try {
			const file = await FileModel.findOne({
				where: {
					url: url,
					user_id: user_id
				}
			});

			return {
				is_success: true,
				data: file
			};
		} catch (error) {
			Logger.error('Error in FileInfo:get_by_url ', {
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				is_success: false
			};
		}
	}
}
