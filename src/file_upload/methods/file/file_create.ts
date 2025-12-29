import { Logger } from '../../../logger';
import FileModel from '../../models/file.model';

export class FileCrate {
	/**
	 *
	 * @param url
	 * @param bucket_name
	 * @param user_id
	 * @param file_key
	 * @param size
	 * @param mim_type
	 */
	async save(
		url: string,
		bucket_name: string,
		user_id: string | null,
		file_key: string,
		size: string,
		mim_type: string
	): Promise<RestApi.ObjectResInterface> {
		try {
			const save = await FileModel.create({
				url: url,
				user_id: user_id,
				file_key: file_key,
				bucket_name: bucket_name,
				size: size,
				mim_type: mim_type
			});

			return {
				is_success: !!save
			};
		} catch (error) {
			Logger.error('Error in FileCrate:save ', {
				error: error instanceof Error ? error.message : String(error)
			});
			return {
				is_success: false
			};
		}
	}
}
