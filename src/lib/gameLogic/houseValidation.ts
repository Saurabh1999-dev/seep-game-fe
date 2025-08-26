import type { CardDto } from "@/lib/types";

export interface CombinationValidation {
  valid: boolean;
  error?: string;
  requiredHandCard?: number;
  combinedValue?: number;
}

export function validateHouseCreation(
  handCards: CardDto[],
  tableCards: CardDto[],
  selectedTableCards: CardDto[],
  bidValue: number
): CombinationValidation {
  
  // Calculate combined table value
  const combinedTableValue = selectedTableCards.reduce((sum, card) => sum + card.value, 0);
  
  // Required hand card value to reach bid
  const requiredHandValue = bidValue - combinedTableValue;
  
  // Check if player has the required hand card
  const hasRequiredCard = handCards.some(card => card.value === requiredHandValue);
  
  if (requiredHandValue <= 0) {
    return {
      valid: false,
      error: `Table cards total ${combinedTableValue} is already >= bid value ${bidValue}. Cannot create house.`,
      combinedValue: combinedTableValue
    };
  }
  
  if (requiredHandValue > 13) {
    return {
      valid: false,
      error: `Need card value ${requiredHandValue} to complete house, but maximum card value is 13.`,
      requiredHandCard: requiredHandValue,
      combinedValue: combinedTableValue
    };
  }
  
  if (!hasRequiredCard) {
    return {
      valid: false,
      error: `You need a card with value ${requiredHandValue} to complete this house. Table cards: ${combinedTableValue}, Bid: ${bidValue}`,
      requiredHandCard: requiredHandValue,
      combinedValue: combinedTableValue
    };
  }
  
  return {
    valid: true,
    requiredHandCard: requiredHandValue,
    combinedValue: combinedTableValue
  };
}

export function validateCaptureCombination(
  handCards: CardDto[],
  selectedTableCards: CardDto[]
): CombinationValidation {
  
  const combinedTableValue = selectedTableCards.reduce((sum, card) => sum + card.value, 0);
  
  // Check if player has a card that matches the combined value
  const hasMatchingCard = handCards.some(card => card.value === combinedTableValue);
  
  if (!hasMatchingCard) {
    return {
      valid: false,
      error: `You need a card with value ${combinedTableValue} to capture these combined cards.`,
      requiredHandCard: combinedTableValue,
      combinedValue: combinedTableValue
    };
  }
  
  return {
    valid: true,
    requiredHandCard: combinedTableValue,
    combinedValue: combinedTableValue
  };
}
