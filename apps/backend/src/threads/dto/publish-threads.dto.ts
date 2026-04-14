import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const THREADS_MAX_LENGTH = 500;

export class PublishThreadsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(THREADS_MAX_LENGTH)
  text!: string;
}

export interface PublishThreadsResponse {
  threadsMediaId: string;
  permalink: string | null;
}
