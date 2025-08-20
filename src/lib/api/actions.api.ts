import { http } from "@/lib/http/axios";
import type { HandSnapshot } from "@/lib/types";

export type CardDto = { suit: string; rank: string; value: number };

export type PlayActionRequest = {
  type: "House" | "Throw" | "Capture";
  seat: number;
  card: CardDto;
  tablePick?: CardDto[];
};

export type PlayActionResult = {
  snapshot: HandSnapshot;
  message: string;
};

export const actionsApi = {
  play: async (gameId: string, req: PlayActionRequest): Promise<PlayActionResult> => {
    const { data } = await http.post<PlayActionResult>(`/api/games/${gameId}/actions`, req);
    return data;
  },
};
