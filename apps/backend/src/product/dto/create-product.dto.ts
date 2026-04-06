import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalInfo?: string;
}
