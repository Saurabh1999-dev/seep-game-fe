// Shared DTOs used by frontend

export type CreateGameResponse = {
  gameId: string;
  seed: number;
  rulesVersion: number;
  createdAt?: string;
};

export type CardDto = { suit: string; rank: string; value: number };
export type HouseDto = { value: number; cemented: boolean; owners: string[]; cards: CardDto[] };

export type HandSnapshot = {
  gameId: string;
  handNumber: number;
  dealerSeat: number;
  turnSeat: number;
  hands: CardDto[][];
  floorLoose: CardDto[];
  houses: HouseDto[];
  createdAt: string;
};
