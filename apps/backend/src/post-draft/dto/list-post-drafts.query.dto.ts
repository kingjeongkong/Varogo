import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class ListPostDraftsQueryDto {
  @IsUUID()
  productId!: string;

  @IsIn(['draft', 'published'])
  status!: 'draft' | 'published';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
