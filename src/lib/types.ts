export type CreateGameResponse = {
  gameId: string;
  seed: number;
  rulesVersion: number;
  createdAt?: string;
};

export type CardDto = { suit: string; rank: string; value: number };
export type HouseDto = { value: number; cemented?: boolean; owners?: string[]; cards: CardDto[] };
export interface EnhancedBotMove {
  type: "Throw" | "Capture" | "House";
  seat: 0 | 1 | 2 | 3;
  handCard?: CardDto | null;
  tablePick?: CardDto[] | null;
  botName?: string;
  personality?: {
    name: string;
    aggressiveness: number;
    riskTolerance: number;
    houseFocus: number;
  };
  actionTime?: number;
  toast?: string;
}
export interface HandSnapshot {
  gameId: string;
  handNumber: number;
  dealerSeat: number;
  turnSeat: number;
  hands: CardDto[][];
  floorLoose: CardDto[];
  houses: HouseDto[];
  createdAt: string;
  handPhase?: 0 | 1 | 2;
  dealingCompleted?: boolean;
  chaalCount?: number[];
  isBot?: boolean[]; // Make this required, not optional
  chaalPhaseComplete?: boolean;
}

export interface CardFlyAnimation {
  id: string;
  card: CardDto;
  from: { x: number; y: number };
  to: { x: number; y: number };
  duration: number;
  delay: number;
  onComplete?: () => void;
  type: "deal" | "throw" | "capture" | "house";
}
export interface ThinkingState {
  show: boolean;
  playerSeat: number;
  playerName: string;
}
export interface ActionAnnouncement {
  id: string;
  playerSeat: number;
  playerName: string;
  actionType: "throw" | "capture" | "house" | "sweep";
  message: string;
  cards?: { handCard?: any; capturedCards?: any[] };
  duration?: number;
}

export interface GameConfig {
  botSeats: boolean[];
  difficulty?: 'easy' | 'medium' | 'hard';
  rulesVersion?: number;
}

export interface BotMove {
  type: "Throw" | "Capture" | "House";
  seat: 0 | 1 | 2 | 3;
  handCard?: CardDto | null;
  tablePick?: CardDto[] | null;
  toast?: string;
}

export interface DragState {
  active: boolean;
  card: CardDto | null;
  hoverTable: CardDto[];
  snapped?: CardDto | null;
}

export interface GameError {
  message: string;
  code?: string;
  retryable?: boolean;
}
