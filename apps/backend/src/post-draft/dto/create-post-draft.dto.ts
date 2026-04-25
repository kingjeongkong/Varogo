import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePostDraftDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  todayInput?: string;
}
