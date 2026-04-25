export interface ThreadsVoiceUnit {
  id: string;
  text: string;
  timestamp: string;
  permalink: string | null;
  partCount: number;
}

export interface ThreadsApiPost {
  id: string;
  text?: string;
  timestamp: string;
  permalink?: string | null;
  from?: { id: string };
}
