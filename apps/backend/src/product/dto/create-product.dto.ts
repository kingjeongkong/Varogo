import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalInfo?: string;
}
