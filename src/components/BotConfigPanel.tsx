"use client";

import { useState, useEffect } from "react";
import { http } from "@/lib/http/axios";

interface BotPersonality {
  name: string;
  aggressiveness: number;
  riskTolerance: number;
  houseFocus: number;
}

export function BotConfigPanel({ gameId }: { gameId: string }) {
  const [personalities, setPersonalities] = useState<{[seat: number]: BotPersonality}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBotPersonalities();
  }, [gameId]);

  const loadBotPersonalities = async () => {
    try {
      const promises = [1, 2, 3].map(seat => 
        http.get(`/api/games/${gameId}/bots/personality/${seat}`)
      );
      const responses = await Promise.all(promises);
      
      const personalityMap: {[seat: number]: BotPersonality} = {};
      responses.forEach((resp, index) => {
        personalityMap[index + 1] = resp.data;
      });
      
      setPersonalities(personalityMap);
    } catch (error) {
      console.error("Failed to load bot personalities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="text-sm text-gray-600">Loading bot info...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="font-bold text-sm mb-3">🤖 Bot Players</h3>
      <div className="space-y-2">
        {Object.entries(personalities).map(([seat, personality]) => (
          <div key={seat} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                {seat}
              </span>
              <span className="font-medium">{personality.name}</span>
            </div>
            <div className="flex space-x-1">
              <div className="bg-red-200 px-2 py-1 rounded text-xs">
                Aggr: {Math.round(personality.aggressiveness * 100)}%
              </div>
              <div className="bg-blue-200 px-2 py-1 rounded text-xs">
                House: {Math.round(personality.houseFocus * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}