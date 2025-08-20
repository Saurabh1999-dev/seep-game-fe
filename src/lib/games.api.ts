import { http } from "@/lib/http/axios";
import type { CreateGameResponse } from "@/lib/types";

export const gamesApi = {
  create: async (): Promise<CreateGameResponse> => {
    const { data } = await http.post<CreateGameResponse>("/api/games", {});
    return data;
  },
  getById: async (id: string): Promise<CreateGameResponse> => {
    const { data } = await http.get<CreateGameResponse>(`/api/games/${id}`);
    return data;
  },
  list: async (skip = 0, take = 20) => {
    const { data } = await http.get(`/api/games`, { params: { skip, take } });
    return data as { total: number; skip: number; take: number; items: CreateGameResponse[] };
    // matches your backend ListGames response
  },
  remove: async (id: string): Promise<void> => {
    await http.delete(`/api/games/${id}`);
  }
};
