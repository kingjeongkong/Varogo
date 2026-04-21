import { IsString, Length } from 'class-validator';

export class PublishPostDraftDto {
  @IsString()
  @Length(1, 500)
  body!: string;
}
