import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class CurrentTractionDto {
  @IsIn(['none', 'under-100', '100-1000', '1000-plus'])
  users!: string;

  @IsIn(['none', 'under-1k', '1k-10k', '10k-plus'])
  revenue!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialProof?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  oneLiner!: string;

  @IsIn(['pre-launch', 'just-launched', 'growing', 'established'])
  stage!: string;

  @ValidateNested()
  @Type(() => CurrentTractionDto)
  currentTraction!: CurrentTractionDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalInfo?: string;
}
