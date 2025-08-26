import { http } from "@/lib/http/axios";
import type { CardDto, HandSnapshot } from "@/lib/types";

export type PlayActionRequest = {
  type: "House" | "Throw" | "Capture";
  seat: number;
  card: CardDto;
  tablePick?: CardDto[];
};

export type MoveTraceDto = {
  seat: number;
  type: "House" | "Capture" | "Throw";
  handCard?: CardDto | null;
  tablePick?: CardDto[] | null;
  houseValue?: number | null;
};

export type PlayActionResultWithMoves = {
  snapshot: HandSnapshot;
  message: string;
  moves: MoveTraceDto[];
};

export const actionsApi = {
  play: async (gameId: string, req: PlayActionRequest): Promise<PlayActionResultWithMoves> => {
    const { data } = await http.post(`/api/games/${gameId}/actions`, req);
    return data;
  },
};
