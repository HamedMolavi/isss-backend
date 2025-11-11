import { Logger } from '../../../logger';
import FileModel from '../../models/file.model';

export class FileDestroy {
	/**
	 *
	 * @param url
	 * @param user_id
	 */
	async destroy(url: string, user_id: string): Promise<RestApi.ObjectResInterface> {
		try {
			const destroy = await FileModel.deleteOne({ where: { url: url, user_id: user_id } });

			return {
				is_success: (destroy.deletedCount ?? 0) > 0
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

	/**
	 *
	 * @param url
	 */
	async destroy_for_admin(url: string): Promise<RestApi.ObjectResInterface> {
		try {
			const destroy = await FileModel.deleteOne({ where: { url: url } });

			return {
				is_success: (destroy.deletedCount ?? 0) > 0
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
