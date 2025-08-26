"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { CardDto } from "@/lib/types";

interface CombinationGroup {
  id: string;
  cards: CardDto[];
  totalValue: number;
  position: { x: number; y: number };
}

export function TableCardCombiner({
  tableCards,
  onCombinationChange,
  onValidateCombination,
  dragState,
  centerPosition
}: {
  tableCards: CardDto[];
  onCombinationChange: (combinations: CombinationGroup[]) => void;
  onValidateCombination: (combination: CombinationGroup, handCard: CardDto) => { valid: boolean; error?: string };
  dragState: any;
  centerPosition: { x: number; y: number };
}) {
  const [combinations, setCombinations] = useState<CombinationGroup[]>([]);
  const [selectedCards, setSelectedCards] = useState<CardDto[]>([]);
  const [showCombineButton, setShowCombineButton] = useState(false);

  const handleCardSelect = (card: CardDto) => {
    const isSelected = selectedCards.some(c => 
      c.suit === card.suit && c.rank === card.rank
    );

    if (isSelected) {
      // Deselect
      setSelectedCards(prev => prev.filter(c => 
        !(c.suit === card.suit && c.rank === card.rank)
      ));
    } else {
      // Select
      setSelectedCards(prev => [...prev, card]);
    }

    setShowCombineButton(selectedCards.length >= 1); // Show if 2+ cards will be selected
  };

  const createCombination = async () => {
    if (selectedCards.length < 2) return;

    const totalValue = selectedCards.reduce((sum, card) => sum + card.value, 0);
    const newCombination: CombinationGroup = {
      id: `combo-${Date.now()}`,
      cards: [...selectedCards],
      totalValue,
      position: {
        x: centerPosition.x + (combinations.length * 80),
        y: centerPosition.y + 40
      }
    };

    // Animate cards combining
    await animateCardCombination(selectedCards, newCombination.position);

    setCombinations(prev => [...prev, newCombination]);
    setSelectedCards([]);
    setShowCombineButton(false);
    onCombinationChange([...combinations, newCombination]);
  };

  const animateCardCombination = async (cards: CardDto[], targetPosition: { x: number; y: number }) => {
    // This will trigger the combination animation
    return new Promise(resolve => {
      // Animation logic will be handled by parent component
      setTimeout(resolve, 1500); // Wait for animation to complete
    });
  };

  return (
    <div className="relative">
      {/* Combination Groups Display */}
      <AnimatePresence>
        {combinations.map((combo) => (
          <motion.div
            key={combo.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute pointer-events-none z-30"
            style={{
              left: combo.position.x,
              top: combo.position.y
            }}
          >
            <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              Combined: {combo.totalValue}
            </div>
            <div className="flex -space-x-2 mt-1">
              {combo.cards.map((card, index) => (
                <div
                  key={`${card.suit}-${card.rank}-${index}`}
                  style={{ transform: `rotate(${(index - 1) * 10}deg)` }}
                >
                  <PlayingCard card={card} width={30} />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Combine Button */}
      <AnimatePresence>
        {showCombineButton && selectedCards.length >= 2 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={createCombination}
            className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg"
          >
            Combine {selectedCards.length} cards (Total: {selectedCards.reduce((sum, card) => sum + card.value, 0)})
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
