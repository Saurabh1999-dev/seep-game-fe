"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { http } from "@/lib/http/axios";

interface ScoreData {
  playerScores: Record<number, {    
    totalScore: number;
    cardPoints: number;
    sweepBonus: number;
    capturedCardCount: number;
    sweepCount: number;
  }>;
  partnershipScore: {
    team1Total: number; // Seats 0+2
    team2Total: number; // Seats 1+3
    winningTeam: number;
  };
}

interface CapturedCardsDisplay {
  spadeCards: any[];
  aceCards: any[];
  tenOfDiamondsCards: any[];
  totalCards: number;
}

export function LiveScorePanel({ 
  gameId, 
  show = true 
}: { 
  gameId?: string;
  show?: boolean;
}) {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Fetch score data every 2 seconds
  useEffect(() => {
    if (!show) return;

    const fetchScore = async () => {
      try {
        const response = await http.get(`/api/games/${gameId}/score`);
        setScoreData(response.data);
        setError(null);
      } catch (err: any) {
        console.log("Score fetch error (normal during early game):", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // fetchScore();
    // const interval = setInterval(fetchScore, 2000);
    // return () => clearInterval(interval);
  }, [gameId, show]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-4 right-4 z-40 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700"
      style={{ width: expanded ? 350 : 200 }}
    >
      <div 
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg cursor-pointer flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-bold text-sm">🏆 Live Score</h3>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          ▼
        </motion.div>
      </div>

      <div className="p-3">
        {loading && (
          <div className="text-center text-gray-400 text-xs">
            Loading scores...
          </div>
        )}

        {error && !scoreData && (
          <div className="text-center text-gray-500 text-xs">
            Game starting...
          </div>
        )}

        {scoreData && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-300">Partnerships</div>
              <motion.div
                className={`p-2 rounded ${scoreData.partnershipScore.winningTeam === 1 ? 
                  'bg-green-800/30 border border-green-600' : 'bg-gray-800'}`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-xs">
                    <div className="font-medium">You + Cautious Carl</div>
                    <div className="text-gray-400">Seats 0 & 2</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {scoreData.partnershipScore.team1Total}
                    </div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>
              </motion.div>

              {/* Team 2 (Annie + Bob) */}
              <motion.div
                className={`p-2 rounded ${scoreData.partnershipScore.winningTeam === 2 ? 
                  'bg-green-800/30 border border-green-600' : 'bg-gray-800'}`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex justify-between items-center">
                  <div className="text-xs">
                    <div className="font-medium">Aggressive Annie + Balanced Bob</div>
                    <div className="text-gray-400">Seats 1 & 3</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">
                      {scoreData.partnershipScore.team2Total}
                    </div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 border-t border-gray-700 pt-3"
                >
                  {/* Individual Player Scores */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-300">Individual Scores</div>
                    
                    {Object.entries(scoreData.playerScores).map(([seat, score]) => {
                      const seatNum = parseInt(seat);
                      const playerNames = ["You", "Aggressive Annie", "Cautious Carl", "Balanced Bob"];
                      
                      return (
                        <div key={seat} className="flex justify-between text-xs">
                          <span className="text-gray-300">{playerNames[seatNum]}</span>
                          <div className="text-right">
                            <div className="text-white font-medium">{score.totalScore} pts</div>
                            <div className="text-gray-500">
                              {score.capturedCardCount} cards, {score.sweepCount} sweeps
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Breakdown */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="font-semibold text-gray-300">Score Breakdown:</div>
                    <div>• All Spades: 1-13 points each</div>
                    <div>• Aces (♥♦♣): 1 point each</div>
                    <div>• Ten♦: 6 points</div>
                    <div>• Sweeps: 25-50 bonus points</div>
                    <div>• Majority: 3 points (27+ cards)</div>
                  </div>

                  {/* Win Condition */}
                  <div className="text-xs bg-blue-900/30 p-2 rounded">
                    <div className="font-semibold text-blue-300">Win Condition:</div>
                    <div className="text-gray-300">First team with 100+ point lead wins</div>
                    <div className="text-gray-400 mt-1">
                      Current lead: {Math.abs(scoreData.partnershipScore.team1Total - scoreData.partnershipScore.team2Total)} points
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
