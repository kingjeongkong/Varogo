import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdatePostDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  todayInput?: string;

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;
}
