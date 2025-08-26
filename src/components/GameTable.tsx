"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { HandSnapshot, CardDto, HouseDto, EnhancedBotMove, ActionAnnouncement, CardFlyAnimation } from "@/lib/types";
import { canSnapTo, cardKey, isRankCapture } from "@/lib/ui/cards";
import { PlayingCard } from "@/components/PlayingCard";
import { DealAnimator, DealStep } from "@/components/DealAnimator";
import { ShuffleOverlay } from "@/components/ShuffleOverlay";
import type { BidStartSnapshot } from "@/lib/api/bid.api";
import { AnimatePresence, motion } from "framer-motion";
import { ActionAnnouncements } from "./ActionAnnouncement";
import { TurnIndicator, CardFlyAnimations, CaptureParticles } from "./CardAnimations";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { TableCombinationAnimation } from "./TableCombinationAnimation";
import { ErrorPopup } from "./ErrorPopup";

type SeatVis = "hidden" | "back" | "face";

type Props = {
  snap: HandSnapshot;
  onSelectCard?: (seat: number, card: CardDto) => void;
  selectedCardKey?: string | null;

  bid?: BidStartSnapshot | null;
  animateBidDeal?: boolean;
  onBidDealComplete?: () => void;

  restSteps?: DealStep[] | null;
  restActive?: boolean;
  onRestComplete?: () => void;

  revealTable?: CardDto[] | null;

  seatVisibility?: Record<0 | 1 | 2 | 3, SeatVis>;

  // Drag & drop from hand (existing play pipeline)
  onDragStartHand?: (card: CardDto) => void;
  onHoverToggleTable?: (card: CardDto) => void;
  onDropToTable?: () => void;

  dragState?: {
    active: boolean;
    card: CardDto | null;
    hoverTable: CardDto[];
    snapped?: CardDto | null;
  };

  bidValue?: number | null;
  onDropOnTableCard?: (tableCard: CardDto) => void;

  // Optional: external visual trigger for bot move
  botVisual?: EnhancedBotMove | null;
};

export default memo(function GameTable(props: Props) {
  const {
    snap: snapIn,
    onSelectCard,
    selectedCardKey,
    bid,
    animateBidDeal,
    onBidDealComplete,
    restSteps,
    restActive,
    onRestComplete,
    revealTable,
    seatVisibility,

    onDragStartHand,
    onHoverToggleTable,
    onDropToTable,
    dragState,
    onDropOnTableCard,
    botVisual,
  } = props;

  const snap: HandSnapshot =
    snapIn ?? {
      gameId: "",
      handNumber: 0,
      dealerSeat: 0,
      turnSeat: 0,
      hands: [[], [], [], []],
      floorLoose: [],
      houses: [],
      createdAt: new Date().toISOString(),
    };

  // UI/Animation
  const [combineTarget, setCombineTarget] = useState<{
    active: boolean;
    anchor: { x: number; y: number } | null;
    required: number | null;
    type: "house" | "capture" | null;
    cards: CardDto[];
  }>({ active: false, anchor: null, required: null, type: null, cards: [] });

  const [combineFX, setCombineFX] = useState<{
    play: boolean;
    cards: CardDto[];
    target: { x: number; y: number } | null;
  }>({ play: false, cards: [], target: null });

  const [combinationAnimation, setCombinationAnimation] = useState<any>(null);
  const [errorPopup, setErrorPopup] = useState<{ show: boolean; message: string; type?: "error" | "warning" | "info" }>({
    show: false,
    message: "",
  });
  const [flyingCards, setFlyingCards] = useState<CardFlyAnimation[]>([]);
  const [showParticles, setShowParticles] = useState<{ show: boolean; center: { x: number; y: number }; type: "capture" | "sweep" | "house" } | null>(null);
  const [announcements, setAnnouncements] = useState<ActionAnnouncement[]>([]);
  const [thinkingBot, setThinkingBot] = useState<{ seat: number; name: string } | null>(null);

  function playCombineFX(cards: CardDto[]) {
    const center = targets.center;
    setCombineFX({ play: true, cards, target: { x: center.x, y: center.y - 50 } });
    setTimeout(() => setCombineFX((s) => ({ ...s, play: false })), 1200);
  }

  // DnD combine (table-to-table)
  const [draggingTableCard, setDraggingTableCard] = useState<CardDto | null>(null);
  const [combineState, setCombineState] = useState<{
    active: boolean;
    sum: number;
    cards: CardDto[];
    anchorKey: string | null;
  }>({ active: false, sum: 0, cards: [], anchorKey: null });

  const handNo = snap?.handNumber ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [showShuffle, setShowShuffle] = useState(true);

  useEffect(() => {
    setShowShuffle(true);
    const t = setTimeout(() => setShowShuffle(false), 1200);
    return () => clearTimeout(t);
  }, [handNo, bid?.dealerSeat ?? -1, bid?.bidderSeat ?? -1]);

  function rel(x: number, y: number) {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rc = el.getBoundingClientRect();
    return { x: x - rc.left, y: y - rc.top };
  }

  const targets = useMemo(() => {
    const el = containerRef.current;
    if (!el) {
      return {
        deck: { x: 0, y: 0 },
        seat: { 0: { x: 0, y: 0 }, 1: { x: 0, y: 0 }, 2: { x: 0, y: 0 }, 3: { x: 0, y: 0 } } as Record<0 | 1 | 2 | 3, { x: number; y: number }>,
        center: { x: 0, y: 0 },
      };
    }
    const rect = el.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;

    const deck = rel(midX, midY);
    const center = deck;
    const margin = 90;
    const sideOffset = 120;
    const seat = {
      0: rel(midX, rect.bottom - margin),
      1: rel(rect.left + sideOffset, midY),
      2: rel(midX, rect.top + margin),
      3: rel(rect.right - sideOffset, midY),
    } as Record<0 | 1 | 2 | 3, { x: number; y: number }>;

    return { deck, seat, center };
  }, [containerRef.current, handNo]);

  const fallbackSeat0First4 = useMemo(() => (snap?.hands?.[0] ?? []).slice(0, 4), [snap?.hands]);

  const dealSteps: DealStep[] = useMemo(() => {
    if (bid && Array.isArray((bid as any).bidderCards) && (bid as any).bidderCards.length > 0) {
      const arr = (bid as any).bidderCards as CardDto[];
      return arr.filter(Boolean).map((card, index) => ({
        seat: (bid.bidderSeat ?? 0) as 0 | 1 | 2 | 3,
        index,
        card,
      }));
    }
    return fallbackSeat0First4.filter(Boolean).map((card, index) => ({
      seat: 0,
      index,
      card,
    }));
  }, [bid, fallbackSeat0First4]);

  const runDeal = !!animateBidDeal;
  const dealerSeat = typeof bid?.dealerSeat === "number" ? bid!.dealerSeat : undefined;
  const bidderSeat = typeof bid?.bidderSeat === "number" ? bid!.bidderSeat : undefined;

  const faceDownCount = revealTable && revealTable.length > 0 ? 0 : Array.isArray(bid?.floorFaceDown) ? bid!.floorFaceDown.length : 0;

  // Bot visual effects (unchanged core, slower)
  useEffect(() => {
    if (!botVisual) {
      setFlyingCards([]);
      return;
    }
    const seatPos = targets.seat[botVisual.seat];
    const centerPos = targets.center;

    setFlyingCards([]);
    setShowParticles(null);

    const targetPos = botVisual.type === "Throw" ? { x: centerPos.x - 140, y: centerPos.y - 40 } : { x: centerPos.x, y: centerPos.y - 20 };
    const flyAnimation: CardFlyAnimation = {
      id: `bot-${botVisual.seat}-${Date.now()}`,
      card: botVisual.handCard!,
      from: seatPos,
      to: targetPos,
      duration: 1.8,
      delay: 0,
      type: botVisual.type.toLowerCase() as "deal" | "throw" | "capture" | "house",
      onComplete: () => {
        if (botVisual.type !== "Throw") {
          setShowParticles({ show: true, center: centerPos, type: botVisual.type === "House" ? "house" : "capture" });
          setTimeout(() => setShowParticles(null), 1500);
        }
        setTimeout(() => setFlyingCards([]), 500);
      },
    };
    setFlyingCards([flyAnimation]);

    const announcement: ActionAnnouncement = {
      id: `announcement-${Date.now()}`,
      playerSeat: botVisual.seat,
      playerName: botVisual.botName || `Bot ${botVisual.seat}`,
      actionType: botVisual.type.toLowerCase() as "throw" | "capture" | "house" | "sweep",
      message: botVisual.toast || "Made a move",
      duration: 3000,
    };
    setAnnouncements((prev) => [...prev, announcement]);
    const t = setTimeout(() => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
    }, 3500);
    return () => clearTimeout(t);
  }, [botVisual, targets]);

  // Helpers
  const showError = (message: string) => {
    setErrorPopup({ show: true, message, type: "error" });
    setTimeout(() => setErrorPopup({ show: false, message: "" }), 3500);
  };
  const showInfo = (message: string) => {
    setErrorPopup({ show: true, message, type: "info" });
    setTimeout(() => setErrorPopup({ show: false, message: "" }), 2500);
  };

  const playerHasValue = (val: number) => (snap.hands?.[0] ?? []).some((c) => (c?.value ?? 0) === val);

  // Combine logic
  function startCombineWith(card: CardDto) {
    setCombineState({ active: true, sum: card.value, cards: [card], anchorKey: `${card.suit}-${card.rank}` });
  }
  function tryAddToCombine(target: CardDto) {
    setCombineState((s) => {
      if (!s.active) return { active: true, sum: target.value, cards: [target], anchorKey: `${target.suit}-${target.rank}` };
      const already = s.cards.some((c) => c.suit === target.suit && c.rank === target.rank);
      if (already) return s;
      const newCards = [...s.cards, target];
      const sum = newCards.reduce((acc, c) => acc + (c?.value ?? 0), 0);
      return { ...s, cards: newCards, sum };
    });
  }
  function clearCombine() {
    setCombineState({ active: false, sum: 0, cards: [], anchorKey: null });
    setCombineTarget({ active: false, anchor: null, required: null, type: null, cards: [] });
  }
  function getCombinePrompt(): null | { type: "house" | "capture"; valid: boolean; required?: number; message: string } {
    if (!combineState.active || combineState.sum <= 0) return null;
    if (props.bidValue != null) {
      const need = props.bidValue - combineState.sum;
      if (need <= 0) {
        return { type: "house", valid: false, message: `Sum ${combineState.sum} >= bid ${props.bidValue}. Remove some cards.` };
      }
      return { type: "house", valid: true, required: need, message: `House target ${props.bidValue}. Need ${need} in hand.` };
    }
    const need = combineState.sum;
    return { type: "capture", valid: true, required: need, message: `Capture target ${need}. Need ${need} in hand.` };
  }

  // Validation and execution handler
  async function handleValidateAndExecute(required: number, type: "house" | "capture", pileCards: CardDto[]) {
    try {
      const hand = snap.hands?.[0] ?? [];
      const playCard = hand.find((c) => c.value === required);
      if (!playCard) {
        showError(`Required ${required} not found in your hand.`);
        return;
      }

      showInfo(`Move validated. Playing ${playCard.rank} of ${playCard.suit}.`);

      // Reset target and combine
      setCombineTarget({ active: false, anchor: null, required: null, type: null, cards: [] });
      setCombineState({ active: false, sum: 0, cards: [], anchorKey: null });

    } catch (e: any) {
      showError(e?.response?.data?.message ?? e?.message ?? "Execution failed");
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto rounded-full bg-[#0c3a2f] border border-emerald-900/60 shadow-inner" style={{ width: "100%", maxWidth: 1080, height: 620 }}>
      {/* Felt gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.06), rgba(0,0,0,0))" }} />

      {/* Shuffle overlay and deals */}
      <ShuffleOverlay show={showShuffle} />
      <DealAnimator active={!!animateBidDeal} steps={dealSteps} deckCenter={targets.deck} seatTargets={targets.seat} onComplete={() => onBidDealComplete?.()} />
      {restActive && restSteps && restSteps.length > 0 && (
        <DealAnimator
          active={restActive}
          steps={restSteps.map((s, i) => ({ ...s, delay: (s.seat * 0.08) + (i * 0.03) }))}
          deckCenter={targets.deck}
          seatTargets={targets.seat}
          onComplete={() => {
            onRestComplete?.();
          }}
        />
      )}


      {/* Seats */}
      <Seat title="Top" pos="top" seatIndex={2} dealerSeat={bid?.dealerSeat} bidderSeat={bid?.bidderSeat} cards={(snap.hands?.[2] ?? []).filter(Boolean)} onSelect={(c) => onSelectCard?.(2, c)} selectedCardKey={selectedCardKey} compact seatVisibility={seatVisibility} />
      <Seat title="Left" pos="left" seatIndex={1} dealerSeat={bid?.dealerSeat} bidderSeat={bid?.bidderSeat} cards={(snap.hands?.[1] ?? []).filter(Boolean)} onSelect={(c) => onSelectCard?.(1, c)} selectedCardKey={selectedCardKey} compact seatVisibility={seatVisibility} />
      <Seat title="Right" pos="right" seatIndex={3} dealerSeat={bid?.dealerSeat} bidderSeat={bid?.bidderSeat} cards={(snap.hands?.[3] ?? []).filter(Boolean)} onSelect={(c) => onSelectCard?.(3, c)} selectedCardKey={selectedCardKey} compact seatVisibility={seatVisibility} />

      {/* Center */}
      <CenterTable
        floorLoose={snap.floorLoose ?? []}
        houses={snap.houses ?? []}
        faceDownCount={faceDownCount}
        dragActive={!!dragState?.active}
        dragHoverTable={dragState?.hoverTable ?? []}
        bidValue={props.bidValue ?? null}
        dragSnapped={(dragState?.snapped ?? null) as CardDto | null}
        draggingHand={dragState?.card ?? null}
        onDropToTable={onDropToTable}
        onHoverToggleTable={onHoverToggleTable}
        onDropOnTableCard={onDropOnTableCard}
        startCombineWith={startCombineWith}
        tryAddToCombine={tryAddToCombine}
        setDraggingTableCard={setDraggingTableCard}
        draggingTableCard={draggingTableCard}
        combineState={combineState}
        clearCombine={clearCombine}
        getCombinePrompt={getCombinePrompt}
        playerHasValue={playerHasValue}
        showError={showError}
        showInfo={showInfo}
        combineTarget={combineTarget}
        setCombineTarget={setCombineTarget}
        combineFX={combineFX}
        playCombineFX={playCombineFX}
        onValidateAndExecute={handleValidateAndExecute}
        targets={targets}
      />

      <Seat title="Bottom" pos="bottom" seatIndex={0} dealerSeat={bid?.dealerSeat} bidderSeat={bid?.bidderSeat} cards={(snap.hands?.[0] ?? []).filter(Boolean)} onSelect={(c) => onSelectCard?.(0, c)} selectedCardKey={selectedCardKey} seatVisibility={seatVisibility} onDragStartHand={onDragStartHand} />

      {/* Indicators and FX */}
      <AnimatePresence>
        <TurnIndicator currentSeat={snap.turnSeat} seatPositions={targets.seat} playerNames={["You", "Aggressive Annie", "Cautious Carl", "Balanced Bob"]} />
      </AnimatePresence>
      {thinkingBot && <ThinkingIndicator show={true} playerSeat={thinkingBot.seat} playerName={thinkingBot.name} position={targets.seat[thinkingBot.seat]} />}
      <CardFlyAnimations animations={flyingCards} />
      <TableCombinationAnimation animation={combinationAnimation} />
      {showParticles && <CaptureParticles show={showParticles.show} center={showParticles.center} type={showParticles.type} />}
      <ActionAnnouncements announcements={announcements} />
      <ErrorPopup show={errorPopup.show} message={errorPopup.message} type={errorPopup.type} onClose={() => setErrorPopup({ show: false, message: "" })} />
    </div>
  );
});

function Seat({
  title,
  pos,
  seatIndex,
  dealerSeat,
  bidderSeat,
  cards,
  onSelect,
  compact,
  selectedCardKey,
  seatVisibility,
  onDragStartHand,
}: {
  title: string;
  pos: "top" | "left" | "right" | "bottom";
  seatIndex: 0 | 1 | 2 | 3;
  dealerSeat?: number;
  bidderSeat?: number;
  cards: CardDto[];
  onSelect?: (card: CardDto) => void;
  compact?: boolean;
  selectedCardKey?: string | null;
  seatVisibility?: Record<0 | 1 | 2 | 3, SeatVis>;
  onDragStartHand?: (card: CardDto) => void;
}) {
  const style =
    pos === "top"
      ? { top: 16, left: "50%", transform: "translateX(-50%)", width: "72%" }
      : pos === "bottom"
        ? { bottom: 22, left: "50%", transform: "translateX(-50%)", width: "82%" }
        : pos === "left"
          ? { top: "50%", left: 24, transform: "translateY(-50%)", width: "30%" }
          : { top: "50%", right: 24, transform: "translateY(-50%)", width: "30%" };

  const vis: SeatVis = seatVisibility?.[seatIndex] ?? "face";
  if (vis === "hidden") return null;
  const showFaces = vis === "face";

  const isDealer = dealerSeat === seatIndex;
  const isBidder = bidderSeat === seatIndex;

  return (
    <div className="absolute" style={style as any}>
      <div className={`text-[11px] mb-1 opacity-80 ${pos === "left" ? "text-left" : pos === "right" ? "text-right" : "text-center"}`}>
        <span className="text-slate-200/80">{title}</span>
        {isDealer && (
          <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-amber-400 text-black">
            D
          </span>
        )}
        {isBidder && (
          <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-sky-400 text-black">
            Bid
          </span>
        )}
      </div>

      <Fan cards={cards} onSelect={onSelect} selectedCardKey={selectedCardKey} showFaces={showFaces} draggable={seatIndex === 0 && showFaces} onDragStart={(c: CardDto) => onDragStartHand?.(c)} />
    </div>
  );
}

function Fan({
  cards,
  compact,
  onSelect,
  selectedCardKey,
  showFaces = true,
  draggable = false,
  onDragStart,
}: {
  cards: CardDto[];
  compact?: boolean;
  onSelect?: (card: CardDto) => void;
  selectedCardKey?: string | null;
  showFaces?: boolean;
  draggable?: boolean;
  onDragStart?: (card: CardDto) => void;
}) {
  const safeCards = (cards ?? []).filter(Boolean);
  const width = compact ? 42 : 54;

  // Layout: overlap horizontally, slight arc and tilt
  const overlap = compact ? 18 : 24;            // smaller = more overlap
  const maxFanAngle = 10;                       // total tilt span (deg)
  const baseLift = showFaces && draggable ? 2 : 0; // subtle arc when it's the bottom seat (draggable)

  // Precompute positions
  const n = safeCards.length;
  const centerIndex = (n - 1) / 2;

  return (
    <div className="relative w-full flex flex-row justify-center">
      <div className="relative" style={{ height: showFaces ? width * 1.6 : width * 1.4 }}>
        {safeCards.map((c: CardDto, i: number) => {
          if (!showFaces) {
            // Face down stack; still overlap so the row height is small
            const x = (i - centerIndex) * overlap;
            const rot = ((i - centerIndex) / centerIndex) * (maxFanAngle / 2) || 0;
            return (
              <div
                key={`back-${i}`}
                className="absolute"
                style={{
                  transform: `translate(${x}px, ${-Math.abs(i - centerIndex) * baseLift}px) rotate(${rot}deg)`,
                  zIndex: i + 1,
                }}
              >
                <CardBack width={width} />
              </div>
            );
          }

          const k = cardKey(c);
          const selected = selectedCardKey === k;

          // Centered offset and tilt
          const x = (i - centerIndex) * overlap;
          const rot = ((i - centerIndex) / Math.max(1, centerIndex)) * maxFanAngle;
          const y = -Math.pow(Math.abs(i - centerIndex), 1.15) * baseLift;

          return (
            <div
              key={k}
              className={`absolute transition-transform`}
              style={{
                transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
                zIndex: i + 1,
              }}
              draggable={draggable}
              onDragStart={() => {
                if (draggable) onDragStart?.(c);
              }}
              onClick={() => onSelect?.(c)}
            >
              <PlayingCard
                card={c}
                width={width}
                selected={selected}
                className="shadow-md"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}


function CardBack({ width = 52 }: { width?: number }) {
  const aspect = 1.4;
  const height = Math.round(width * aspect);
  return (
    <div
      className="rounded-md border"
      style={{
        width,
        height,
        background: "repeating-linear-gradient(45deg, #1b2631 0 8px, #0f1620 8px 16px)",
        borderColor: "rgba(0,0,0,0.35)",
      }}
      title="Face-down card"
    />
  );
}

function CenterTable({
  floorLoose,
  houses,
  faceDownCount = 0,
  dragActive,
  dragHoverTable,
  bidValue,
  dragSnapped,
  draggingHand,
  onDropToTable,
  onHoverToggleTable,
  onDropOnTableCard,
  startCombineWith,
  tryAddToCombine,
  setDraggingTableCard,
  draggingTableCard,
  combineState,
  clearCombine,
  getCombinePrompt,
  playerHasValue,
  showError,
  showInfo,
  combineTarget,
  setCombineTarget,
  combineFX,
  playCombineFX,
  onValidateAndExecute,
  targets,
}: {
  floorLoose: CardDto[];
  houses: HouseDto[];
  faceDownCount?: number;
  dragActive?: boolean;
  dragHoverTable?: CardDto[];
  bidValue?: number | null;
  dragSnapped?: CardDto | null;
  draggingHand?: CardDto | null;
  onDropToTable?: () => void;
  onHoverToggleTable?: (card: CardDto) => void;
  onDropOnTableCard?: (tableCard: CardDto) => void;
  startCombineWith: (card: CardDto) => void;
  tryAddToCombine: (target: CardDto) => void;
  setDraggingTableCard: (c: CardDto | null) => void;
  draggingTableCard: CardDto | null;
  combineState: { active: boolean; sum: number; cards: CardDto[]; anchorKey: string | null };
  clearCombine: () => void;
  getCombinePrompt: () => { type: "house" | "capture"; valid: boolean; required?: number; message: string } | null;
  playerHasValue: (v: number) => boolean;
  showError: (m: string) => void;
  showInfo: (m: string) => void;
  combineTarget: { active: boolean; anchor: { x: number; y: number } | null; required: number | null; type: "house" | "capture" | null; cards: CardDto[] };
  setCombineTarget: (s: { active: boolean; anchor: { x: number; y: number } | null; required: number | null; type: "house" | "capture" | null; cards: CardDto[] }) => void;
  combineFX: { play: boolean; cards: CardDto[]; target: { x: number; y: number } | null };
  playCombineFX: (cards: CardDto[]) => void;
  onValidateAndExecute: (required: number, type: "house" | "capture", pileCards: CardDto[]) => Promise<void>;
  targets: { center: { x: number; y: number } };
}) {
  const safeLoose = (floorLoose ?? []).filter(Boolean);
  const looseCardW = 56;

  const liveSel = new Set((dragHoverTable ?? []).map(cardKey));
  const isHoverSelected = (c: CardDto) => liveSel.has(cardKey(c));

  function handleDragStartTable(card: CardDto, e: React.DragEvent) {
    setDraggingTableCard(card);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDropOnTableCardForCombine(target: CardDto, e: React.DragEvent) {
    e.preventDefault();
    if (!draggingTableCard) return;
    if (draggingTableCard.suit === target.suit && draggingTableCard.rank === target.rank) return;
    if (!combineState.active) startCombineWith(draggingTableCard);
    tryAddToCombine(target);
    setDraggingTableCard(null);
  }
  function handleDropFromHandOnTableCard(target: CardDto, e: React.DragEvent) {
    if (!dragActive || !draggingHand) return;
    e.preventDefault();
    onDropOnTableCard?.(target);
  }

  return (
<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[52%] w-[78%] max-w-[900px] h-[20vh]">
      {/* Combine FX: stack cards into center with overlap */}
      {combineFX.play && combineFX.target && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {combineFX.cards.map((c, i) => (
            <motion.div
              key={`${c.suit}-${c.rank}-${i}`}
              initial={{ x: 0, y: 0, scale: 1, opacity: 0 }}
              animate={{
                x: combineFX.target!.x + i * 14 - 28,
                y: combineFX.target!.y + i * 8 - 16,
                scale: 0.95,
                opacity: 1,
                rotateZ: i % 2 === 0 ? -5 : 4,
              }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.25, 0.8, 0.25, 1] }}
              className="absolute"
            >
              <PlayingCard card={c} width={56} className="border-2 border-purple-400 shadow-lg" />
            </motion.div>
          ))}
        </div>
      )}

      {/* DROP ZONE for hand-to-table */}
      <div
        className="absolute inset-x-[6%] top-0 bottom-0 rounded-xl"
        onDragOver={(e) => {
          if (dragActive) e.preventDefault();
        }}
        onDrop={(e) => {
          if (dragActive) {
            e.preventDefault();
            onDropToTable?.();
          }
        }}
      />

      {/* Face-down row */}
      {faceDownCount > 0 && (
        <>
          <div className="text-[11px] text-slate-200/80 text-center mb-1">Face-down</div>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {Array.from({ length: faceDownCount }).map((_, i) => (
              <div
                key={`fd-${i}`}
                className="rounded-md border"
                style={{
                  width: 52,
                  height: Math.round(52 * 1.4),
                  background: "repeating-linear-gradient(45deg, #1b2631 0 8px, #0f1620 8px 16px)",
                  borderColor: "rgba(0,0,0,0.35)",
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Live previews for hand drag */}
      {dragActive && draggingHand && dragSnapped && canSnapTo(draggingHand, dragSnapped, bidValue ?? null) && (
        <div className="flex justify-center mt-1 mb-2">
          <div className="relative inline-block">
            <div className="absolute left-4 top-2 rotate-6">
              <PlayingCard card={draggingHand} width={50} />
            </div>
            <div className="relative -rotate-6">
              <PlayingCard card={dragSnapped} width={50} />
            </div>
          </div>
        </div>
      )}

      {dragActive && draggingHand && dragSnapped && isRankCapture(draggingHand, dragSnapped) && (
        <div className="flex justify-center mb-2">
          <div className="text-[11px] px-2 py-1 rounded bg-sky-900/60 text-sky-200 border border-sky-700/70">Rank capture: {draggingHand.rank}</div>
        </div>
      )}

      {/* Loose cards with DnD combine */}
      <div className="text-[11px] text-slate-200/85 text-center mb-1">Loose Cards</div>
      <div className="mx-auto flex flex-wrap justify-center gap-3 p-2 rounded-xl bg-black/10 border border-white/5" style={{ maxWidth: 860 }}>
        {safeLoose.length === 0 && <div className="text-[12px] text-slate-300/70 italic py-3">No cards on table</div>}
        {safeLoose.map((c) => {
          const k = cardKey(c);
          const inCombine = combineState.cards.some((cc) => cc.suit === c.suit && cc.rank === c.rank);
          const hovering = isHoverSelected(c);
          const allowSnap =
            dragActive && !!draggingHand && ((bidValue != null && draggingHand.value + c.value === bidValue) || draggingHand.rank?.toLowerCase() === c.rank?.toLowerCase() || draggingHand.value === c.value);

          return (
            <div
              key={k}
              className={`rounded-md transition-all duration-200 relative ${hovering ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-emerald-950" : inCombine ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-purple-950 transform scale-105" : "ring-0"
                }`}
              draggable
              onDragStart={(e) => handleDragStartTable(c, e)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (dragActive && draggingHand) {
                  handleDropFromHandOnTableCard(c, e);
                } else {
                  handleDropOnTableCardForCombine(c, e);
                }
              }}
              style={{ cursor: "grab" }}
            >
              <PlayingCard card={c} width={looseCardW} className={`rounded transition-all duration-200 ${inCombine ? "border-2 border-purple-400 shadow-purple-400/50 shadow-lg" : ""}`} />
              {inCombine && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {(combineState.cards.findIndex((sc) => sc.suit === c.suit && sc.rank === c.rank) ?? -1) + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Target drop zone after Done */}
      {combineTarget.active && combineTarget.anchor && (
        <div
          className="absolute z-40"
          style={{
            left: combineTarget.anchor.x - 60,
            top: combineTarget.anchor.y - 80,
            width: 120,
            height: 110,
          }}
          onDragOver={(e) => {
            if (dragActive && draggingHand) e.preventDefault();
          }}
          onDrop={(e) => {
            if (!dragActive || !draggingHand) return;
            e.preventDefault();
            const needed = combineTarget.required!;
            const type = combineTarget.type!;
            const played = draggingHand.value;

            if (played !== needed) {
              showError(`You must drop a ${needed}. Dropped ${played}.`);
              return;
            }

            onValidateAndExecute(needed, type, combineTarget.cards);
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full rounded-xl border-2 border-purple-400/70 bg-purple-500/10 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-xs font-bold text-purple-200">Drop required: {combineTarget.required}</div>
          </motion.div>
        </div>
      )}

      {/* Combine control panel */}
      {combineState.active && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="text-xs text-purple-300">Combined: {combineState.cards.map((c) => c.rank).join(" + ")} = {combineState.sum}</div>
          {(() => {
            const prompt = getCombinePrompt();
            if (!prompt) return null;
            return (
              <div
                className={`text-xs px-2 py-1 rounded ${prompt.type === "house" ? "bg-purple-900/50 text-purple-200 border border-purple-700/50" : "bg-green-900/50 text-green-200 border border-green-700/50"
                  }`}
              >
                {prompt.message}
              </div>
            );
          })()}

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs" onClick={clearCombine}>
              Clear
            </button>
            <button
              className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs"
              onClick={() => {
                const prompt = getCombinePrompt();
                if (!prompt || !prompt.valid) {
                  showError("Cannot complete. Fix the combination and try again.");
                  return;
                }
                const need = prompt.required!;
                if (!playerHasValue(need)) {
                  showError(`Required ${need} in hand to complete. Not found in hand.`);
                  return;
                }

                // Play FX and activate target drop zone
                const anchor = { x: targets.center.x, y: targets.center.y - 20 };
                setCombineTarget({
                  active: true,
                  anchor,
                  required: need,
                  type: prompt.type,
                  cards: combineState.cards,
                });
                playCombineFX(combineState.cards);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
