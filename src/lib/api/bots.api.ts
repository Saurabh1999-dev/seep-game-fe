// File: seep-fe/src/lib/api/bots.api.ts
import { http } from "@/lib/http/axios";

export const botsApi = {
  act: (gameId: string) => http.post(`/api/games/${gameId}/bots/act`, {}).then(r => r.data),
};
