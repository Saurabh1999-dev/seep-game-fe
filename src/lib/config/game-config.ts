// New file: src/lib/config/game-config.ts

export interface SeepGameConfig {
  defaultBotSeats: boolean[];
  animationDuration: {
    cardDeal: number;
    botMove: number;
    shuffle: number;
  };
  rules: {
    minBid: number;
    maxBid: number;
    winningPointLead: number;
  };
}

export const DEFAULT_GAME_CONFIG: SeepGameConfig = {
  defaultBotSeats: [false, false, false, false], // All human by default
  animationDuration: {
    cardDeal: 140,
    botMove: 800,
    shuffle: 1200,
  },
  rules: {
    minBid: 9,
    maxBid: 13,
    winningPointLead: 100,
  },
};

export function createBotConfig(humanSeat: number = 0): boolean[] {
  const config = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    if (i !== humanSeat) {
      config[i] = true;
    }
  }
  return config;
}
