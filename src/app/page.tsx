"use client";

import { useState } from "react";
import type { CreateGameResponse, HandSnapshot } from "@/lib/types";
import Link from "next/link";
import { gamesApi } from "@/lib/games.api";
import { handsApi } from "@/lib/api/hands.api";
import { BotConfigPanel } from "@/components/BotConfigPanel";
import { LiveScorePanel } from "@/components/LiveScorePanel";

export default function HomePage() {
  const [game, setGame] = useState<CreateGameResponse | null>(null);
  const [hand, setHand] = useState<HandSnapshot | null>(null);
  const [loading, setLoading] = useState<{ create?: boolean; start?: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  async function onCreateGame() {
    try {
      setError(null);
      setLoading((s) => ({ ...s, create: true }));
      const g = await gamesApi.create();
      setGame(g);
      setHand(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create game");
    } finally {
      setLoading((s) => ({ ...s, create: false }));
    }
  }

  return (
    <main className="min-h-screen p-6 bg-[#0b3d2e] text-slate-50">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Seep — Dev Console</h1>
        <p className="opacity-80">Create a game, start a hand, then open the table.</p>

        <div className="flex gap-3">
          <button
            onClick={onCreateGame}
            disabled={loading.create}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading.create ? "Creating..." : "Create Game"}
          </button>

          {game && (
            <Link
              href={`/game/${game.gameId}`}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500"
            >
              Open Table
            </Link>
          )}
        </div>

        {error && <div className="text-red-300">{error}</div>}

        {game && (
          <section className="rounded-lg border border-emerald-700/40 bg-emerald-800/20 p-4">
            <h2 className="font-semibold mb-2">Game</h2>
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(game, null, 2)}</pre>
          </section>
        )}

        {hand && (
          <section className="rounded-lg border border-indigo-700/40 bg-indigo-800/20 p-4">
            <h2 className="font-semibold mb-2">Hand Snapshot</h2>
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(hand, null, 2)}</pre>
          </section>
        )}
      </div>
      <div className="fixed top-4 right-4 z-40">
        <BotConfigPanel gameId={game?.gameId || ""} />
      </div>
    </main>
  );
}
