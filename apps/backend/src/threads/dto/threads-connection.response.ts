import type { ThreadsConnection } from '@prisma/client';

export interface ThreadsConnectionResponse {
  connected: boolean;
  username: string | null;
}

export function toThreadsConnectionResponse(
  connection: ThreadsConnection | null,
): ThreadsConnectionResponse {
  if (!connection) {
    return { connected: false, username: null };
  }

  return {
    connected: true,
    username: connection.username,
  };
}
