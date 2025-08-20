import { http } from "@/lib/http/axios";
import type { HandSnapshot } from "@/lib/types";

export const handsApi = {
  startAfterBid: async (gameId: string): Promise<HandSnapshot> => {
    const { data } = await http.post<HandSnapshot>(`/api/games/${gameId}/hands/start-after-bid`, {});
    return data;
  },
  latest: async (gameId: string): Promise<HandSnapshot> => {
    const { data } = await http.get<HandSnapshot>(`/api/games/${gameId}/hands/latest`);
    return data;
  },
};
