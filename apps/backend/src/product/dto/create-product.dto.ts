import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}
