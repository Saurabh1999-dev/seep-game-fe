"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import type { CardDto, EnhancedBotMove, HandSnapshot } from "@/lib/types";
import GameTable from "@/components/GameTable";
import { cardKey, isRankCapture, normalizeCards } from "@/lib/ui/cards";
import { bidApi, BidStartSnapshot } from "@/lib/api/bid.api";
import { BidModal } from "@/components/BidModal";
import type { DealStep } from "@/components/DealAnimator";
import { handsApi } from "@/lib/api/hands.api";
import { actionsApi } from "@/lib/api/actions.api";
import { http } from "@/lib/http/axios";
import { LiveScorePanel } from "@/components/LiveScorePanel";

type SeatVis = "hidden" | "back" | "face";
type DragState = {
  active: boolean;
  card: CardDto | null;
  hoverTable: CardDto[];
  snapped?: CardDto | null;
};

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"bid" | "hand-partial" | "hand">("bid");

  const [bid, setBid] = useState<BidStartSnapshot | null>(null);
  const [animBidDeal, setAnimBidDeal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidValue, setBidValue] = useState<number | null>(null);

  const [handSnap, setHandSnap] = useState<HandSnapshot | null>(null);

  const [restSteps, setRestSteps] = useState<DealStep[] | null>(null);
  const [restActive, setRestActive] = useState(false);

  const [selectedHand, setSelectedHand] = useState<CardDto | null>(null);
  const [selectedTable, setSelectedTable] = useState<CardDto[]>([]);
  const selectedTableKeys = useMemo(() => selectedTable.map(cardKey), [selectedTable]);

  const [revealTable, setRevealTable] = useState<CardDto[] | null>(null);
  const [bidderSeat0Preview, setBidderSeat0Preview] = useState<CardDto[] | null>(null);
  const [thinkingBot, setThinkingBot] = useState<{ seat: number; name: string } | null>(null);
  const [phaseTransition, setPhaseTransition] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>({
    active: false,
    card: null,
    hoverTable: [],
    snapped: null
  });

  const [botVisual, setBotVisual] = useState<EnhancedBotMove | null>(null);
  useEffect(() => {
    return () => {
      setBotVisual(null);
      setDrag({ active: false, card: null, hoverTable: [], snapped: null });
    };
  }, []);
  const seatVisibility: Record<0 | 1 | 2 | 3, SeatVis> =
    phase === "bid"
      ? { 0: "face", 1: "back", 2: "back", 3: "back" }
      : phase === "hand-partial"
        ? { 0: "face", 1: "back", 2: "back", 3: "back" }
        : { 0: "face", 1: "back", 2: "back", 3: "back" };

  const placeholderSnap: HandSnapshot = useMemo(
    () => ({
      gameId,
      handNumber: 1,
      dealerSeat: 0,
      turnSeat: 0,
      hands: [[], [], [], []],
      floorLoose: [],
      houses: [],
      createdAt: new Date().toISOString(),
    }),
    [gameId]
  );

  // Animate deal of remaining cards from 4 to target (11)
  function buildDealRestStepsToTarget(snap: HandSnapshot, target: number): DealStep[] {
    const steps: DealStep[] = [];
    for (let r = 4; r < target; r++) {
      for (let seat = 0 as 0 | 1 | 2 | 3; seat <= 3; seat = ((seat + 1) as 0 | 1 | 2 | 3)) {
        const card = snap.hands?.[seat]?.[r];
        if (!card) continue;
        steps.push({ seat, index: r, card });
      }
    }
    return steps;
  }

  function diffBotMove(prev: HandSnapshot, next: HandSnapshot) {
    const actor = prev.turnSeat as 0 | 1 | 2 | 3;
    const prevHand = (prev.hands?.[actor] ?? []);
    const nextHand = (next.hands?.[actor] ?? []);
    const prevFloor = prev.floorLoose ?? [];
    const nextFloor = next.floorLoose ?? [];
    const prevH = prev.houses ?? [];
    const nextH = next.houses ?? [];

    const sameCard = (a: CardDto, b: CardDto) =>
      a.value === b.value &&
      a.rank?.toLowerCase() === b.rank?.toLowerCase() &&
      a.suit?.toLowerCase() === b.suit?.toLowerCase();

    // House
    if (nextH.length > prevH.length) {
      const handCard = prevHand.find(ph => !nextHand.some(nh => sameCard(nh, ph))) ?? null;
      const removedFromFloor = prevFloor.filter(pf => !nextFloor.some(nf => sameCard(nf, pf)));
      const newHouse = nextH.find(hn => !prevH.some(hp => hp.value === hn.value && (hp.cards?.length ?? 0) === (hn.cards?.length ?? 0)));
      return {
        type: "House" as const,
        seat: actor,
        handCard,
        tablePick: removedFromFloor,
        toast: `Seat ${actor} made a House${newHouse?.value ? ` of ${newHouse.value}` : ""}.`
      };
    }

    // Throw
    if (nextFloor.length === prevFloor.length + 1) {
      const added = nextFloor.find(nf => !prevFloor.some(pf => sameCard(pf, nf)));
      return {
        type: "Throw" as const,
        seat: actor,
        handCard: added ?? null,
        tablePick: null,
        toast: `Seat ${actor} threw ${added?.rank ?? ""}.`
      };
    }

    // Capture
    if (nextFloor.length < prevFloor.length) {
      const removed = prevFloor.filter(pf => !nextFloor.some(nf => sameCard(nf, pf)));
      const handCard = prevHand.find(ph => !nextHand.some(nh => sameCard(nh, ph))) ?? null;
      return {
        type: "Capture" as const,
        seat: actor,
        handCard,
        tablePick: removed,
        toast: `Seat ${actor} captured ${removed.map(r => r.rank).join(", ")}.`
      };
    }

    return null;
  }


  // Enhanced bot move toast messages
  function createEnhancedBotMoveToast(move: any, personality: any) {
    const botName = personality?.name || `Bot ${move.seat}`;
    const personalityHint = personality?.aggressiveness > 0.7 ? " (aggressive play)" :
      personality?.aggressiveness < 0.3 ? " (cautious play)" : "";

    switch (move.type) {
      case "House":
        return `${botName} built a strategic house${personalityHint}`;
      case "Capture":
        const cardCount = move.tablePick?.length || 0;
        const captureMsg = cardCount > 1 ? `captured ${cardCount} cards` : "captured a card";
        return `${botName} ${captureMsg}${personalityHint}`;
      case "Throw":
        return `${botName} threw ${move.handCard?.rank || 'a card'}${personalityHint}`;
      default:
        return `${botName} made a move${personalityHint}`;
    }
  }

  // Enhanced animation timing with personality factors
  function calculateEnhancedAnimationTime(move: any, personality: any) {
    let baseTime = 2500; // Increased from 1500 to 2500

    // Move complexity affects timing
    switch (move.type) {
      case "House":
        baseTime = 3500; // Increased from 2200 to 3500
        break;
      case "Capture":
        const cardCount = move.tablePick?.length || 1;
        baseTime = 2000 + (cardCount * 600); // Increased base and per-card time
        break;
      case "Throw":
        baseTime = 1800; // Increased from 1000 to 1800
        break;
    }

    // Personality-based timing adjustments
    if (personality?.aggressiveness > 0.7) {
      baseTime *= 0.9; // Even aggressive bots are slower now
    } else if (personality?.aggressiveness < 0.3) {
      baseTime *= 1.6; // Cautious bots take even more time
    }
    if (move.type === "House" && personality?.houseFocus > 0.7) {
      baseTime *= 1.3;
    }
    return Math.max(1500, Math.min(5000, baseTime)); // 1.5-5 seconds range
  }


  async function runBotsUntilHumanTurn(gameId: string, startSnap: HandSnapshot) {
    let snap = startSnap;
    let loops = 0;
    const MAX_BOT_LOOPS = 6;

    while (loops++ < MAX_BOT_LOOPS) {
      const isBotArr = snap.isBot ?? [false, false, false, false];

      if (!isBotArr[snap.turnSeat]) {
        console.log(`Turn reached human player at seat ${snap.turnSeat}`);
        break;
      }

      try {
        const botPersonality = await getBotPersonality(gameId, snap.turnSeat);
        const botName = botPersonality?.name || `Bot ${snap.turnSeat}`;

        setThinkingBot({ seat: snap.turnSeat, name: botName });
        const thinkingTime = botPersonality?.aggressiveness > 0.7 ? 1200 :
          botPersonality?.aggressiveness < 0.3 ? 2000 :  
            1600;
        await new Promise(resolve => setTimeout(resolve, thinkingTime));

        console.log(`${botName} taking turn...`);

        const beforeBotMove = performance.now();
        const afterResp = await http.post(`/api/games/${gameId}/bots/act`, {});
        const botActionTime = performance.now() - beforeBotMove;

        const after = afterResp.data as HandSnapshot;
        const mv = diffBotMove(snap, after);
        if (mv) {
          const enhancedMove = {
            ...mv,
            botName,
            personality: botPersonality,
            actionTime: Math.round(botActionTime),
            toast: createEnhancedBotMoveToast(mv, botPersonality)
          };

          setBotVisual(enhancedMove);
          const animationTime = calculateEnhancedAnimationTime(mv, botPersonality);
          await new Promise(resolve => setTimeout(resolve, animationTime));

          setBotVisual(null);
        }

        setThinkingBot(null);
        setHandSnap(after);
        snap = after;
        if (after.handPhase === 2) {
          console.log("Hand phase is Full, stopping bot loop");
          break;
        }
debugger
        if (after.handPhase === 1 && isChaalPhaseComplete(after)) {
          console.log("Chaal phase complete, triggering completion");

          // Show phase transition message
          setPhaseTransition("Dealing remaining cards...");

          try {
            const completedResp = await http.post(`/api/games/${gameId}/hands/complete-after-chaal`, {});
            const completedSnap = completedResp.data as HandSnapshot;
            setHandSnap(completedSnap);

            if (completedSnap.handPhase === 2) {
              const steps = buildDealRestStepsToTarget(completedSnap, 11);
              setRestSteps(steps);
              setRestActive(true);
              setPhase("hand");
            }
          } catch (error) {
            console.error("Failed to complete chaal phase:", error);
          }

          setPhaseTransition(null);
          break;
        }

      } catch (error) {
        console.error(`Bot ${snap.turnSeat} action failed:`, error);
        setThinkingBot(null); // Clear thinking indicator on error
        setError(`Bot ${snap.turnSeat} encountered an error. Please refresh the page.`);
        break;
      }
    }

    if (loops >= MAX_BOT_LOOPS) {
      console.warn("Bot loop reached maximum iterations, stopping");
      setThinkingBot(null);
      setError("Bot actions took too long. Please refresh the page.");
    }
  }


  // Helper function to get bot personality
  async function getBotPersonality(gameId: string, seat: number) {
    try {
      const response = await http.get(`/api/games/${gameId}/bots/personality/${seat}`);
      return response.data;
    } catch (error) {
      console.log(`Could not get personality for bot ${seat}:`, error);
      return null;
    }
  }

  // Create contextual toast messages
  function createBotMoveToast(move: any, personality: any) {
    const botName = personality?.name || `Bot ${move.seat}`;

    switch (move.type) {
      case "House":
        return `${botName} built a house${move.houseValue ? ` of ${move.houseValue}` : ''}`;
      case "Capture":
        const cardCount = move.tablePick?.length || 0;
        return `${botName} captured ${cardCount} card${cardCount !== 1 ? 's' : ''}`;
      case "Throw":
        return `${botName} threw ${move.handCard?.rank || 'a card'}`;
      default:
        return `${botName} made a move`;
    }
  }

  // Calculate appropriate animation timing
  function calculateAnimationTime(move: any, personality: any) {
    let baseTime = 1000; // Base 1 second

    // Adjust based on move complexity
    switch (move.type) {
      case "House":
        baseTime = 1500; // Houses take longer to visualize
        break;
      case "Capture":
        const cardCount = move.tablePick?.length || 1;
        baseTime = 800 + (cardCount * 200); // More cards = longer animation
        break;
      case "Throw":
        baseTime = 600; // Throws are quick
        break;
    }

    // Personality adjustments
    if (personality?.aggressiveness > 0.7) {
      baseTime *= 0.8; // Aggressive bots move faster
    } else if (personality?.aggressiveness < 0.3) {
      baseTime *= 1.2; // Cautious bots take more time
    }

    return Math.max(500, Math.min(2000, baseTime)); // Clamp between 0.5-2 seconds
  }

  function isChaalPhaseComplete(snapshot: HandSnapshot) {
    return (snapshot.chaalCount ?? []).length === 4 &&
      (snapshot.chaalCount ?? []).every((c: number) => c === 1);
  }

  // DRAG + PLAY HANDLERS

  const onDropOnTableCard = async (tableCard: CardDto) => {
    if (!drag.active || !drag.card) return;

    try {
      setError(null);
      const handCard = drag.card;
      const isHouse = bidValue != null && (handCard.value + tableCard.value === bidValue);
      const isRankCap = (handCard.rank?.toLowerCase() === tableCard.rank?.toLowerCase()) ||
        (handCard.value === tableCard.value);

      let res;
      if (isHouse) {
        res = await actionsApi.play(gameId, {
          type: "House",
          seat: 0,
          card: handCard,
          tablePick: [tableCard],
        });
      } else if (isRankCap) {
        res = await actionsApi.play(gameId, {
          type: "Capture",
          seat: 0,
          card: handCard,
          tablePick: [tableCard],
        });
      } else {
        res = await actionsApi.play(gameId, {
          type: "Throw",
          seat: 0,
          card: handCard,
        });
      }

      setHandSnap(res.snapshot);
      await runBotsUntilHumanTurn(gameId, res.snapshot);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Action failed");
    } finally {
      setDrag({ active: false, card: null, hoverTable: [], snapped: null });
      setSelectedHand(null);
      setSelectedTable([]);
    }
  };


  const onDragStartHand = useCallback((card: CardDto) => {
    if (phase === "bid") return;
    if (seatVisibility[0] !== "face") return;
    setDrag({ active: true, card, hoverTable: [], snapped: null });
  }, [phase, seatVisibility]);

  const onHoverToggleTable = (tableCard: CardDto) => {
    setDrag((prev) => {
      if (!prev.active || !prev.card || !tableCard) return prev;

      const canHouseSnap =
        bidValue != null && (prev.card.value + tableCard.value === bidValue);
      const canRankSnap = isRankCapture(prev.card, tableCard);
      const ok = canHouseSnap || canRankSnap;

      return {
        ...prev,
        snapped: ok ? tableCard : null,
        hoverTable: ok ? [tableCard] : [],
      };
    });
  };

  const onDropToTable = async () => {
    if (!drag.active || !drag.card) return;
    try {
      setError(null);
      const handCard = drag.card;
      const pick = drag.hoverTable; // CardDto[]
      const hasPick = pick.length === 1;
      const tableCard: CardDto | null = hasPick ? pick[0] : null; // FIX: pick, not pick

      let res;
      if (
        bidValue != null &&
        hasPick &&
        tableCard &&
        handCard.value + tableCard.value === bidValue
      ) {
        res = await actionsApi.play(gameId, {
          type: "House",
          seat: 0,
          card: handCard,
          tablePick: [tableCard], // FIX: CardDto[], not CardDto[][]
        });
      } else if (
        hasPick &&
        tableCard &&
        (
          (handCard.rank?.toLowerCase() === tableCard.rank?.toLowerCase()) ||
          (handCard.value === tableCard.value)
        )
      ) {
        res = await actionsApi.play(gameId, {
          type: "Capture",
          seat: 0,
          card: handCard,
          tablePick: [tableCard], // FIX
        });
      } else {
        res = await actionsApi.play(gameId, {
          type: "Throw",
          seat: 0,
          card: handCard,
        });
      }

      setHandSnap(res.snapshot);

      // Kick bot loop
      await runBotsUntilHumanTurn(gameId, res.snapshot);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Action failed");
    } finally {
      setDrag({ active: false, card: null, hoverTable: [], snapped: null });
      setSelectedHand(null);
      setSelectedTable([]);
    }
  };


  // BID

  const bidPhaseSnap: HandSnapshot | null = useMemo(() => {
    if (!bid) return null;
    return {
      gameId,
      handNumber: bid.handNumber ?? 1,
      dealerSeat: bid.dealerSeat ?? 0,
      turnSeat: 0,
      hands: [
        bidderSeat0Preview ?? [],
        [],
        [],
        [],
      ],
      floorLoose: [],
      houses: [],
      createdAt: new Date().toISOString(),
    };
  }, [bid, bidderSeat0Preview, gameId]);

  useEffect(() => {
    async function start() {
      try {
        setError(null);
        setPhase("bid");
        const b = await bidApi.start(gameId, 1);
        setBid(b);

        const seat0 = normalizeCards(b.bidderCards);
        setBidderSeat0Preview(seat0);

        setAnimBidDeal(true);
        setShowBidModal(b.bidderSeat === 0);

        setRevealTable(null);
        setBidValue(null);
        setSelectedHand(null);
        setSelectedTable([]);
        setHandSnap(null);
      } catch (e: any) {
        setError(e?.message ?? "Failed to start bid");
      }
    }
    start();
  }, [gameId]);

  function onSelectCard(seat: number, card: CardDto) {
    if (phase === "bid") return;
    if (seat !== 0) return;
    if (seatVisibility[0] !== "face") return;
    setSelectedHand(card);
    setSelectedTable([]);
  }

  function onToggleTableCard(card: CardDto) {
    if (!card) return;
    setSelectedTable((prev) => {
      const k = cardKey(card);
      const exists = prev.find((c) => cardKey(c) === k);
      if (exists) return prev.filter((c) => cardKey(c) !== k);
      return [...prev, card];
    });
  }

  const selectedHandKey = selectedHand ? cardKey(selectedHand) : null;

  const canSayNone =
    !!bid && bid.bidderSeat === 0
      ? !((bid.bidderCards ?? []).some((c) => c.value >= 9))
      : false;

  function buildDealRestSteps(snap: HandSnapshot): DealStep[] {
    const steps: DealStep[] = [];
    for (let r = 4; r < 12; r++) {
      for (let seat = 0 as 0 | 1 | 2 | 3; seat <= 3; seat = ((seat + 1) as 0 | 1 | 2 | 3)) {
        const card: CardDto | undefined = snap.hands?.[seat]?.[r];
        if (!card) continue;
        steps.push({ seat, index: r, card });
      }
    }
    return steps;
  }

  async function handleBid(value: number | "none") {
    try {
      setError(null);

      if (value === "none") {
        let tries = 0;
        setShowBidModal(false);
        while (true) {
          const b = await bidApi.reshuffle(gameId);
          setBid(b);
          setBidderSeat0Preview(normalizeCards(b.bidderCards));
          setAnimBidDeal(true);
          const youAreBidder = b.bidderSeat === 0;
          const canBidNow = youAreBidder && (b.bidderCards ?? []).some((c) => c.value >= 9);
          if (youAreBidder) setShowBidModal(true);
          if (canBidNow) break;
          tries++;
          if (tries > 20) break;
        }
        return;
      }

      // 1. Place the bid
      const placed = await bidApi.place(gameId, value);
      setBidValue(value);
      setShowBidModal(false);

      // 2. START THE HAND (this creates the HandSnapshot)
      const handStartResp = await http.post(`/api/games/${gameId}/hands/start-after-bid`, {});
      const handSnapshot = handStartResp.data as HandSnapshot;

      // 3. Now we can use the created hand
      setRevealTable(normalizeCards(placed.tableCards));
      handSnapshot.hands = (handSnapshot.hands ?? []).map(h => normalizeCards(h));
      handSnapshot.floorLoose = normalizeCards(handSnapshot.floorLoose);
      setHandSnap(handSnapshot);
      setBidderSeat0Preview(null);
      setPhase("hand-partial");

      // 4. Start bot loop with the new hand
      await runBotsUntilHumanTurn(gameId, handSnapshot);

    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to place bid");
      setShowBidModal(true);
    }
  }


  // Enable footer buttons when appropriate
  const sumSelectedTable = useMemo(
    () => selectedTable.reduce((acc, c) => acc + (c?.value ?? 0), 0),
    [selectedTable]
  );

  const canHouse =
    (phase === "hand" || phase === "hand-partial") &&
    seatVisibility[0] === "face" &&
    !!selectedHand &&
    selectedTable.length > 0 &&
    bidValue != null &&
    selectedHand.value + sumSelectedTable === bidValue;

  const canCapture =
    (phase === "hand" || phase === "hand-partial") &&
    !!selectedHand &&
    selectedTable.length > 0 &&
    sumSelectedTable === (selectedHand?.value ?? 0);

  const canThrow =
    (phase === "hand" || phase === "hand-partial") &&
    !!selectedHand &&
    selectedTable.length === 0;

  async function doHouse() {
    if (!handSnap || !selectedHand || selectedTable.length === 0 || bidValue == null) return;
    try {
      setError(null);

      // Check if a house with bidValue already exists
      const hasHouse = (handSnap.houses ?? []).some(h => h.value === bidValue);

      if (hasHouse) {
        // For add-to-house, the hand card itself must equal the house value (not sum with table)
        if (selectedHand.value !== bidValue) {
          setError(`House ${bidValue} already exists. Need a ${bidValue} card in hand to add to it.`);
          return;
        }

        const res = await actionsApi.play(gameId, {
          type: "House",
          seat: 0,
          card: selectedHand,
          tablePick: [] // not needed for add
        });

        setHandSnap(res.snapshot);
        setSelectedHand(null);
        setSelectedTable([]);
        await runBotsUntilHumanTurn(gameId, res.snapshot);
        return;
      }

      // Normal house creation path (no existing house of this value)
      const res = await actionsApi.play(gameId, {
        type: "House",
        seat: 0,
        card: selectedHand,
        tablePick: selectedTable,
      });
      setHandSnap(res.snapshot);
      setSelectedHand(null);
      setSelectedTable([]);
      await runBotsUntilHumanTurn(gameId, res.snapshot);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "House creation failed");
    }
  }

  async function doThrow() {
    if (!handSnap || !selectedHand) return;
    try {
      setError(null);
      const res = await actionsApi.play(gameId, {
        type: "Throw",
        seat: 0,
        card: selectedHand,
      });
      setHandSnap(res.snapshot);
      setSelectedHand(null);
      setSelectedTable([]);

      await runBotsUntilHumanTurn(gameId, res.snapshot);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Throw failed");
    }
  }


  async function doCapture() {
    if (!handSnap || !selectedHand || selectedTable.length === 0) return;
    try {
      setError(null);
      const res = await actionsApi.play(gameId, {
        type: "Capture",
        seat: 0,
        card: selectedHand,
        tablePick: selectedTable,
      });
      setHandSnap(res.snapshot);
      setSelectedHand(null);
      setSelectedTable([]);

      await runBotsUntilHumanTurn(gameId, res.snapshot);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Capture failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#063826] text-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Seep Table</h1>
        </header>

        <div className="text-sm opacity-80 flex items-center gap-3">
          <span>
            {phase === "bid"
              ? "Hand #1 | Bid Phase"
              : phase === "hand-partial"
                ? `Hand #${handSnap?.handNumber ?? 1} | Play (partial)`
                : `Hand #${handSnap?.handNumber ?? 1} | Play`}
          </span>
          {bidValue != null && (
            <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-xs">Bid: {bidValue}</span>
          )}
        </div>

        {error && <p className="text-red-300">{error}</p>}

        <GameTable
          snap={phase === "bid" ? (bidPhaseSnap ?? placeholderSnap) : (handSnap ?? placeholderSnap)}
          bid={bid}
          animateBidDeal={animBidDeal}
          onBidDealComplete={() => setAnimBidDeal(false)}
          restSteps={phase !== "bid" ? restSteps : null}
          restActive={restActive}
          onRestComplete={() => {
            setRestActive(false);
            setRestSteps(null);
            setPhase("hand");
          }}
          onSelectCard={onSelectCard}
          selectedCardKey={selectedHandKey}
          revealTable={phase === "hand-partial" ? revealTable : null}
          seatVisibility={seatVisibility}
          onDragStartHand={onDragStartHand}
          onHoverToggleTable={onHoverToggleTable}
          onDropToTable={onDropToTable}
          dragState={drag}
          bidValue={bidValue ?? null}
          onDropOnTableCard={onDropOnTableCard}
          botVisual={botVisual}
        />

        {/* Footer controls */}
        <div className="mt-4 flex items-center gap-3">
          <div className="text-sm opacity-90">Selected hand:</div>
          <div className="text-sm">
            {selectedHand ? `${selectedHand.rank} of ${selectedHand.suit}` : "None"}
          </div>

          <button
            className="ml-auto px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
            disabled={!canHouse}
            onClick={doHouse}
          >
            House ({bidValue ?? "-"})
          </button>

          <button
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            disabled={!canCapture}
            onClick={doCapture}
          >
            Capture ({sumSelectedTable})
          </button>

          <button
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50"
            disabled={!canThrow}
            onClick={doThrow}
          >
            Throw
          </button>
        </div>
      </div>

      {/* Bid modal */}
      <BidModal
        open={showBidModal}
        onClose={() => setShowBidModal(false)}
        onBid={handleBid}
        min={9}
        max={13}
        canSayNone={!!bid && bid.bidderSeat === 0 ? !((bid.bidderCards ?? []).some((c) => c.value >= 9)) : false}
      />
      <LiveScorePanel gameId={gameId} />
    </main>
  );
}
