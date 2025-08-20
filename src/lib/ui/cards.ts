// File: src/lib/ui/cards.ts
import type { CardDto } from "@/lib/types";

export function cardKey(c: CardDto | null | undefined) {
  if (!c) return "nil";
  return `${c.rank}-${c.suit}-${c.value}`;
}

// Optional: suitIcon remains as-is
export function suitIcon(suit: string) {
  switch (suit) {
    case "Spades": return "♠";
    case "Hearts": return "♥";
    case "Diamonds": return "♦";
    case "Clubs": return "♣";
    default: return "🂠";
  }
}
export function normalizeCard(c: any): CardDto {
  return {
    suit: c?.suit ?? c?.Suit ?? "",
    rank: c?.rank ?? c?.Rank ?? "",
    value: typeof c?.value === "number" ? c.value : (typeof c?.Value === "number" ? c.Value : 0),
  };
}
export function normalizeCards(arr: any[] | null | undefined): CardDto[] {
  return Array.isArray(arr) ? arr.map(normalizeCard).filter(Boolean) : [];
}

export function canSnapTo(hand: CardDto, tableCard: CardDto, bidValue: number | null | undefined) {
  if (bidValue == null) return false;
  return (hand?.value ?? 0) + (tableCard?.value ?? 0) === bidValue;
}

export function sumValues(cards: CardDto[]) {
  return cards.reduce((a, c) => a + (c?.value ?? 0), 0);
}

export function isRankCapture(hand: CardDto, tableCard: CardDto) {
  if (!hand || !tableCard) return false;
  return (hand.rank?.toLowerCase() === tableCard.rank?.toLowerCase()) || (hand.value === tableCard.value);
}