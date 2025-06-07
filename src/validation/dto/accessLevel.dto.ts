import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateAccessLevelBody {
	@IsString()
	public name?: string;
	@IsOptional()
	@IsObject()
	public camera?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public car?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public color?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public brand?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public section?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public department?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public job?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public personnel?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public schedule?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public user?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public typeName?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public systemLog?: { create: boolean; read: boolean; update: boolean; delete: boolean };
	@IsOptional()
	@IsObject()
	public logs?: { create: boolean; read: boolean; update: boolean; delete: boolean };
}
