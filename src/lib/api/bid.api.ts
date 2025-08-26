import { http } from "@/lib/http/axios";
import { CardDto } from "../types";

export type BidStartSnapshot = {
  gameId: string;
  handNumber: number;
  dealerSeat: number;
  bidderSeat: number;
  bidderCards: CardDto[];
  floorFaceDown: number[];
  shuffleSeed: number;
  shuffleAttempt: number;
  salt: number;
  createdAt: string;
};

export type PlaceBidResult = {
  gameId: string;
  handNumber: number;
  dealerSeat: number;
  bidderSeat: number;
  value: number;
  placedAt: string;
  tableCards: CardDto[];
};

export const bidApi = {
  start: async (gameId: string, dealerSeat?: number): Promise<BidStartSnapshot> => {
    debugger
    const body = dealerSeat != null ? { dealerSeat } : {};
    const { data } = await http.post<BidStartSnapshot>(`/api/games/${gameId}/bid/start`, body);
    return data;
  },
  place: async (gameId: string, value: number): Promise<PlaceBidResult> => {
    const { data } = await http.post<PlaceBidResult>(`/api/games/${gameId}/bid/place`, { value });
    return data;
  },
  reshuffle: async (gameId: string): Promise<BidStartSnapshot> => {
    const { data } = await http.post<BidStartSnapshot>(`/api/games/${gameId}/bid/reshuffle`, {});
    return data;
  },
};
