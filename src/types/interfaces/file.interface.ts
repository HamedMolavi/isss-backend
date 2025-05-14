export interface IFileInRedis {
	id: string;
	full_frame: string;
	personnel_id: string;
	face: string;
	embedding: string | number[] | null;
	has_face: number;
	timestamp: Date;
}
