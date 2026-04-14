export interface PublishThreadsDto {
  text: string;
}

export interface PublishThreadsResponse {
  threadsMediaId: string;
  permalink: string | null;
}
