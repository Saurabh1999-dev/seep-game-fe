"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import type { CardDto, HandSnapshot } from "@/lib/types";
import GameTable from "@/components/GameTable";
import { canSnapTo, cardKey, isRankCapture, normalizeCards, sumValues } from "@/lib/ui/cards";
import { bidApi, BidStartSnapshot } from "@/lib/api/bid.api";
import { BidModal } from "@/components/BidModal";
import type { DealStep } from "@/components/DealAnimator";
import { handsApi } from "@/lib/api/hands.api";
import { actionsApi } from "@/lib/api/actions.api";
import { http } from "@/lib/http/axios";

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
  const [drag, setDrag] = useState<DragState>({ active: false, card: null, hoverTable: [] });
  const [botVisual, setBotVisual] = useState<null | {
    type: "Throw" | "Capture" | "House";
    seat: 0 | 1 | 2 | 3;
    handCard?: CardDto | null;
    tablePick?: CardDto[] | null;
    toast?: string;
  }>(null);
  const setBotVisualSafe = (v: typeof botVisual) => setBotVisual(v);
  // Visibility policy:
  // - bid: Seat 0 face (to let bidder see the 4 preview cards), opponents back
  // - hand-partial: everyone back (change 0:"face" if you want Seat0 visible here)
  // - hand: Seat 0 face, opponents back
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

  const onDropOnTableCard = async (tableCard: CardDto) => {
    if (!drag.active || !drag.card) return;
    try {
      const handCard = drag.card;

      const isHouse = bidValue != null && (handCard.value + tableCard.value === bidValue);
      const isRankCap = (handCard.rank?.toLowerCase() === tableCard.rank?.toLowerCase()) || (handCard.value === tableCard.value);

      if (isHouse) {
        const res = await actionsApi.play(gameId, {
          type: "House",
          seat: 0,
          card: handCard,
          tablePick: [tableCard],
        });
        setHandSnap(res.snapshot);
      } else if (isRankCap) {
        const res = await actionsApi.play(gameId, {
          type: "Capture",
          seat: 0,
          card: handCard,
          tablePick: [tableCard],
        });
        setHandSnap(res.snapshot);
      } else {
        // Not a valid target: fall back to Throw to the table center
        const res = await actionsApi.play(gameId, {
          type: "Throw",
          seat: 0,
          card: handCard,
        });
        setHandSnap(res.snapshot);
      }

      // if (phase === "hand-partial") {
      //   const full = await http.post(`/api/games/${gameId}/hands/complete-after-partial`, {});
      //   const data = full.data as HandSnapshot;
      //   data.hands = (data.hands ?? []).map(h => normalizeCards(h));
      //   data.floorLoose = normalizeCards(data.floorLoose);
      //   setHandSnap(data);
      //   const steps = buildDealRestSteps(data);
      //   setRestSteps(steps);
      //   setRestActive(true);
      // }
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
  }, [phase]);

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


  // File: src/app/game/[id]/page.tsx
  const onDropToTable = async () => {
    if (!drag.active || !drag.card) return;
    try {
      const handCard = drag.card;
      const pick = drag.hoverTable; // at most 1 due to snapped logic
      const hasPick = pick.length === 1;
      const tableCard = hasPick ? pick[0] : null;

      // 1) House (hand + pick = bid)
      const okHouse =
        bidValue != null &&
        hasPick &&
        tableCard != null &&
        handCard.value + tableCard.value === bidValue;

      if (okHouse) {
        const res = await actionsApi.play(gameId, {
          type: "House",
          seat: 0,
          card: handCard,
          tablePick: [tableCard], // tableCard is non-null here
        });
        setHandSnap(res.snapshot);
      } else if (hasPick && tableCard && isRankCapture(handCard, tableCard)) {
        const res = await actionsApi.play(gameId, {
          type: "Capture",
          seat: 0,
          card: handCard,
          tablePick: [tableCard],
        });
        setHandSnap(res.snapshot);
      } else {
        const res = await actionsApi.play(gameId, {
          type: "Throw",
          seat: 0,
          card: handCard,
        });
        setHandSnap(res.snapshot);
      }

      // if (phase === "hand-partial") {
      //   const full = await http.post(`/api/games/${gameId}/hands/complete-after-partial`, {});
      //   const data = full.data as HandSnapshot;
      //   data.hands = (data.hands ?? []).map(h => normalizeCards(h));
      //   data.floorLoose = normalizeCards(data.floorLoose);
      //   setHandSnap(data);
      //   const steps = buildDealRestSteps(data);
      //   setRestSteps(steps);
      //   setRestActive(true);
      // }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Action failed");
    } finally {
      setDrag({ active: false, card: null, hoverTable: [], snapped: null });
      setSelectedHand(null);
      setSelectedTable([]);
    }
  };


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

  // Start bid flow on mount
  useEffect(() => {
    async function start() {
      try {
        setError(null);
        setPhase("bid");
        const b = await bidApi.start(gameId);
        setBid(b);

        // Normalize Seat0 preview
        const seat0 = normalizeCards(b.bidderCards);
        setBidderSeat0Preview(seat0);

        setAnimBidDeal(true);
        setShowBidModal(b.bidderSeat === 0);

        // reset
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

  // Interaction: Seat 0 cards only if face-up and not during bid (optional guard)
  function onSelectCard(seat: number, card: CardDto) {
    if (phase === "bid") return; // prevent selecting during bid; remove if you allow it
    if (seat !== 0) return;
    if (seatVisibility[0] !== "face") return;
    setSelectedHand(card);
    setSelectedTable([]);
  }

  // Toggle table card (for capture/house subset selection)
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
  // Bid placement
  async function handleBid(value: number | "none") {
    try {
      setError(null);

      if (value === "none") {
        // Redeal until Seat 0 has a qualifying ≥9
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

      // Server: must hold exact V (in forehand 4) and floor can make V
      const placed = await bidApi.place(gameId, value);
      setBidValue(value);
      setShowBidModal(false);

      // Reveal floor and load partial snapshot (server stored it during place)
      setRevealTable(normalizeCards(placed.tableCards));
      const partial = await handsApi.latest(gameId);
      partial.hands = (partial.hands ?? []).map(h => normalizeCards(h));
      partial.floorLoose = normalizeCards(partial.floorLoose);
      setHandSnap(partial);
      setBidderSeat0Preview(null); // clear preview after partial snapshot is loaded
      setPhase("hand-partial");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to place bid");
      setShowBidModal(true);
    }
  }

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

  // Sums and button enabling
  const sumSelectedTable = useMemo(
    () => selectedTable.reduce((acc, c) => acc + (c?.value ?? 0), 0),
    [selectedTable]
  );

  function diffBotMove(prev: HandSnapshot, next: HandSnapshot) {
    const actor = prev.turnSeat as 0 | 1 | 2 | 3;
    const prevHand = (prev.hands?.[actor] ?? []);
    const nextHand = (next.hands?.[actor] ?? []);

    const prevFloor = prev.floorLoose ?? [];
    const nextFloor = next.floorLoose ?? [];

    // New house created?
    const prevH = prev.houses ?? [];
    const nextH = next.houses ?? [];
    if (nextH.length > prevH.length) {
      // Find the new house
      const newHouse = nextH.find(hn => !prevH.some(hp => hp.value === hn.value && (hp.cards?.length ?? 0) === (hn.cards?.length ?? 0)));
      // Find played card (missing from hand)
      const missing = prevHand.find(ph => !nextHand.some(nh => nh.suit === ph.suit && nh.rank === ph.rank && nh.value === ph.value));
      // The table picks removed:
      const removedFromFloor = prevFloor.filter(pf => !nextFloor.some(nf => nf.suit === pf.suit && nf.rank === pf.rank && nf.value === pf.value));
      return {
        type: "House" as const,
        seat: actor,
        handCard: missing ?? null,
        tablePick: removedFromFloor,
        toast: `Bot (Seat ${actor}) made a House of ${(newHouse?.value ?? "")}.`
      };
    }

    // Throw detected: floor gained exactly one card (and hand -1)
    if (nextFloor.length === prevFloor.length + 1) {
      const added = nextFloor.find(nf => !prevFloor.some(pf => pf.suit === nf.suit && pf.rank === nf.rank && pf.value === nf.value));
      return {
        type: "Throw" as const,
        seat: actor,
        handCard: added ?? null,
        tablePick: null,
        toast: `Bot (Seat ${actor}) threw ${added?.rank ?? ""}.`
      };
    }

    // Capture: floor lost >=1 and hand -1
    if (nextFloor.length < prevFloor.length) {
      const removed = prevFloor.filter(pf => !nextFloor.some(nf => nf.suit === pf.suit && nf.rank === pf.rank && nf.value === nf.value));
      const missing = prevHand.find(ph => !nextHand.some(nh => nh.suit === ph.suit && nh.rank === ph.rank && nh.value === ph.value));
      return {
        type: "Capture" as const,
        seat: actor,
        handCard: missing ?? null,
        tablePick: removed,
        toast: `Bot (Seat ${actor}) captured ${removed.map(r => r.rank).join(", ")}.`
      };
    }

    return null;
  }

  async function maybeBotActLoop(gameId: string) {
    let loops = 0;
    while (loops < 8) {
      const prev = await handsApi.latest(gameId);
      setHandSnap(prev);
      const isBotArr = (prev as any).isBot ?? [false, false, false, false];
      if (!isBotArr[prev.turnSeat]) break;

      const res = await http.post(`/api/games/${gameId}/bots/act`, {});
      const after = res.data as HandSnapshot;
      setHandSnap(after);

      // Visualize bot move
      const mv = diffBotMove(prev, after);
      if (mv) {
        setBotVisual(mv); // use local state here in page, pass to GameTable via prop
        await new Promise(r => setTimeout(r, 600));
        setBotVisual(null);
      }

      // If partial chaal phase complete, top up to 11
      const chaalDone = ((after as any).chaalCount ?? []).length === 4 && ((after as any).chaalCount ?? []).every((c: number) => c === 1);
      if ((after as any).handPhase === "Partial" && chaalDone) {
        const full = await http.post(`/api/games/${gameId}/hands/complete-after-chaal`, {});
        const fullSnap = full.data as HandSnapshot;
        setHandSnap(fullSnap);
        const steps = buildDealRestStepsToTarget(fullSnap, 11);
        setRestSteps(steps);
        setRestActive(true);
        setPhase("hand");
        break;
      }

      loops++;
    }
  }



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

  // Actions
  async function doHouse() {
    if (!handSnap || !selectedHand || selectedTable.length === 0 || bidValue == null) return;
    try {
      setError(null);
      const res = await actionsApi.play(gameId, {
        type: "House",
        seat: 0,
        card: selectedHand,
        tablePick: selectedTable,
      });
      setHandSnap(res.snapshot);
      setSelectedHand(null);
      setSelectedTable([]);

      // if (phase === "hand-partial") {
      //   const full = await http.post(`/api/games/${gameId}/hands/complete-after-partial`, {});
      //   setHandSnap(full.data);
      //   const steps = buildDealRestSteps(full.data);
      //   setRestSteps(steps);
      //   setRestActive(true);
      // }
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

      // if (phase === "hand-partial") {
      //   const full = await http.post<HandSnapshot>(`/api/games/${gameId}/hands/complete-after-partial`, {});
      //   setHandSnap(full.data);
      //   const steps = buildDealRestSteps(full.data);
      //   setRestSteps(steps);
      //   setRestActive(true);
      // }
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

      // if (phase === "hand-partial") {
      //   const full = await http.post<HandSnapshot>(`/api/games/${gameId}/hands/complete-after-partial`, {});
      //   setHandSnap(full.data);
      //   const steps = buildDealRestSteps(full.data);
      //   setRestSteps(steps);
      //   setRestActive(true);
      // }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Capture failed");
    }
  }
  debugger
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
          onToggleTableCard={onToggleTableCard}
          selectedTableKeys={selectedTableKeys}
          revealTable={phase === "hand-partial" ? revealTable : null}
          seatVisibility={seatVisibility}
          onDragStartHand={onDragStartHand}
          onHoverToggleTable={onHoverToggleTable}
          onDropToTable={onDropToTable}
          dragState={drag}
          bidValue={bidValue ?? null}
          onDropOnTableCard={onDropOnTableCard}
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
    </main>
  );
}
