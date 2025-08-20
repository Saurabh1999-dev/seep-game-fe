// File: src/components/GameTable.tsx
"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { HandSnapshot, CardDto, HouseDto } from "@/lib/types";
import { canSnapTo, cardKey, isRankCapture } from "@/lib/ui/cards";
import { PlayingCard } from "@/components/PlayingCard";
import { DealAnimator, DealStep } from "@/components/DealAnimator";
import { ShuffleOverlay } from "@/components/ShuffleOverlay";
import type { BidStartSnapshot } from "@/lib/api/bid.api";
import { AnimatePresence, motion } from "framer-motion";
import { ActionToast } from "./ActionToast";

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
  onToggleTableCard?: (card: CardDto) => void;
  selectedTableKeys?: string[];

  seatVisibility?: Record<0 | 1 | 2 | 3, SeatVis>;

  // Drag & drop
  onDragStartHand?: (card: CardDto) => void;
  onHoverToggleTable?: (card: CardDto) => void;
  onDropToTable?: () => void;

  // Include snapped here
  dragState?: {
    active: boolean;
    card: CardDto | null;
    hoverTable: CardDto[];
    snapped?: CardDto | null;
  };

  // Announced bid value
  bidValue?: number | null;
  onDropOnTableCard?: (tableCard: CardDto) => void;
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
    onToggleTableCard,
    selectedTableKeys,
    seatVisibility,

    // Drag & drop
    onDragStartHand,
    onHoverToggleTable,
    onDropToTable,
    dragState,
    onDropOnTableCard,
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

  const [botMove, setBotMove] = useState<null | {
    type: "Throw" | "Capture" | "House";
    seat: 0 | 1 | 2 | 3;
    handCard?: CardDto | null;
    tablePick?: CardDto[] | null;
    toast?: string;
  }>(null);

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


  const fallbackSeat0First4 = useMemo(
    () => (snap?.hands?.[0] ?? []).slice(0, 4),
    [snap?.hands]
  );

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

  const faceDownCount =
    revealTable && revealTable.length > 0
      ? 0
      : Array.isArray(bid?.floorFaceDown)
        ? bid!.floorFaceDown.length
        : 0;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto rounded-full bg-[#0c3a2f] border border-emerald-900/60 shadow-inner"
      style={{ width: "100%", maxWidth: 1080, height: 620 }}
    >
      {/* Felt gradient */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.06), rgba(0,0,0,0))",
        }}
      />

      {/* Shuffle overlay */}
      <ShuffleOverlay show={showShuffle} />

      {/* Bid cinematic */}
      <DealAnimator
        active={runDeal}
        steps={dealSteps}
        deckCenter={targets.deck}
        seatTargets={targets.seat}
        onComplete={() => onBidDealComplete?.()}
      />

      {/* Deal rest animation */}
      {restActive && restSteps && restSteps.length > 0 && (
        <DealAnimator
          active={restActive}
          steps={restSteps}
          deckCenter={targets.deck}
          seatTargets={targets.seat}
          onComplete={() => {
            onRestComplete?.();
          }}
        />
      )}

      <AnimatePresence>
        {botMove && (
          <motion.div
            key="bot-move-layer"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Toast */}
            <ActionToast
              show={!!botMove.toast}
              text={botMove.toast ?? ""}
            />

            {/* Card fly visual */}
            {(() => {
              const seatPos = targets.seat[botMove.seat];
              const centerPos = targets.center;
              const toLoose = {
                x: centerPos.x - 140, // offset towards loose cards row roughly
                y: centerPos.y - 40,
              };
              const toTable = {
                x: centerPos.x,
                y: centerPos.y - 20,
              };

              const flyTo = botMove.type === "Throw" ? toLoose : toTable;
              const card = botMove.handCard;

              if (!card) return null;
              return (
                <motion.div
                  initial={{ x: seatPos.x, y: seatPos.y, scale: 0.9, opacity: 0.95 }}
                  animate={{ x: flyTo.x, y: flyTo.y, scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="absolute z-40"
                >
                  <PlayingCard card={card} width={52} />
                </motion.div>
              );
            })()}

            {/* Brief glow on captured/house table cards */}
            {botMove.type !== "Throw" && (botMove.tablePick ?? []).map((c, i) => (
              <motion.div
                key={`glow-${i}-${cardKey(c)}`}
                className="absolute rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, repeat: 1, repeatType: "reverse" }}
                style={{
                  left: targets.center.x - 160 + i * 36,
                  top: targets.center.y - 60,
                  width: 58,
                  height: 80,
                  boxShadow: "0 0 0 3px rgba(16,185,129,0.8)",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seats */}
      <Seat
        title="Top"
        pos="top"
        seatIndex={2}
        dealerSeat={dealerSeat}
        bidderSeat={bidderSeat}
        cards={(snap.hands?.[2] ?? []).filter(Boolean)}
        onSelect={(c) => onSelectCard?.(2, c)}
        selectedCardKey={selectedCardKey}
        compact
        seatVisibility={seatVisibility}
      // drag props not needed for non-bottom seats
      />

      <Seat
        title="Left"
        pos="left"
        seatIndex={1}
        dealerSeat={dealerSeat}
        bidderSeat={bidderSeat}
        cards={(snap.hands?.[1] ?? []).filter(Boolean)}
        onSelect={(c) => onSelectCard?.(1, c)}
        selectedCardKey={selectedCardKey}
        compact
        seatVisibility={seatVisibility}
      />

      <Seat
        title="Right"
        pos="right"
        seatIndex={3}
        dealerSeat={dealerSeat}
        bidderSeat={bidderSeat}
        // FIX: was hands[1]; should be hands[2]
        cards={(snap.hands?.[2] ?? []).filter(Boolean)}
        onSelect={(c) => onSelectCard?.(3, c)}
        selectedCardKey={selectedCardKey}
        compact
        seatVisibility={seatVisibility}
      />

      {/* Center: public info */}
      <CenterTable
        floorLoose={snap.floorLoose ?? []}
        houses={snap.houses ?? []}
        faceDownCount={faceDownCount}
        onToggleTableCard={onToggleTableCard}
        selectedTableKeys={selectedTableKeys}
        onHoverToggleTable={onHoverToggleTable}
        onDropToTable={onDropToTable}
        dragActive={!!dragState?.active}
        dragHoverTable={dragState?.hoverTable ?? []}
        bidValue={props.bidValue ?? null}
        draggingHand={dragState?.card ?? null}
        dragSnapped={(dragState?.snapped ?? null) as CardDto | null}
        onDropOnTableCard={(tc: any) => onDropOnTableCard?.(tc)}
      />


      <Seat
        title="Bottom"
        pos="bottom"
        seatIndex={0}
        dealerSeat={dealerSeat}
        bidderSeat={bidderSeat}
        cards={(snap.hands?.[0] ?? []).filter(Boolean)}
        onSelect={(c) => onSelectCard?.(0, c)}
        selectedCardKey={selectedCardKey}
        seatVisibility={seatVisibility}
        // Pass drag start handler explicitly to bottom seat
        onDragStartHand={onDragStartHand}
      />
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
      <div
        className={`text-[11px] mb-1 opacity-80 ${pos === "left" ? "text-left" : pos === "right" ? "text-right" : "text-center"
          }`}
      >
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

      <Fan
        cards={cards}
        onSelect={onSelect}
        selectedCardKey={selectedCardKey}
        showFaces={showFaces}
        // Only bottom seat and when face-up allow drag
        draggable={seatIndex === 0 && showFaces}
        onDragStart={(c: CardDto) => onDragStartHand?.(c)}
      />
    </div>
  );
}

function Fan({
  cards,
  compact,
  onSelect,
  selectedCardKey,
  highlight,
  showFaces = true,
  // NEW:
  draggable = false,
  onDragStart,
}: {
  cards: CardDto[];
  compact?: boolean;
  onSelect?: (card: CardDto) => void;
  selectedCardKey?: string | null;
  highlight?: boolean;
  showFaces?: boolean;
  // NEW:
  draggable?: boolean;
  onDragStart?: (card: CardDto) => void;
}) {
  const base = compact ? 0.8 : 1.8;
  const safeCards = (cards ?? []).filter(Boolean);
  const tilts = safeCards.map((_, i) => (i - safeCards.length / 2) * base);
  const width = compact ? 42 : 54;
  const arc = showFaces && draggable; // draggable is only bottom seat
  const yOffsets = safeCards.map((_, i) => {
    const t = (i - (safeCards.length - 1) / 2);
    return arc ? Math.round(Math.pow(Math.abs(t), 1.2) * -2) : 0; // slight dip
  });
  return (
    <div className="relative w-full flex flex-row gap-2 justify-center">
      {safeCards.map((c: CardDto, i: number) => {
        if (!showFaces) {
          return (
            <div key={`back-${i}`} style={{ transform: `rotate(${tilts[i]}deg)` }}>
              <CardBack width={width} />
            </div>
          );
        }
        const k = cardKey(c);
        const selected = selectedCardKey === k;
        return (
          <div
            key={k}
            style={{ transform: `translateY(${yOffsets[i]}px) rotate(${tilts[i]}deg)` }}
            draggable={draggable}
            onDragStart={(e) => { if (draggable) onDragStart?.(c); }}
            onClick={() => onSelect?.(c)}
            className="transition-transform"
          >
            <PlayingCard card={c} width={width} selected={selected} />
          </div>
        );
      })}
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
        background:
          "repeating-linear-gradient(45deg, #1b2631 0 8px, #0f1620 8px 16px)",
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
  onToggleTableCard,
  selectedTableKeys,
  onHoverToggleTable,
  onDropToTable,
  dragActive,
  dragHoverTable,
  bidValue,
  dragSnapped,
  draggingHand,
  onDropOnTableCard,
}: {
  floorLoose: CardDto[];
  houses: HouseDto[];
  faceDownCount?: number;
  onToggleTableCard?: (card: CardDto) => void;
  selectedTableKeys?: string[];
  onHoverToggleTable?: (card: CardDto) => void;
  onDropToTable?: () => void;
  dragActive?: boolean;
  dragHoverTable?: CardDto[];
  bidValue?: number | null;
  dragSnapped?: CardDto | null;
  draggingHand?: CardDto | null;
  onDropOnTableCard?: (tableCard: CardDto) => void;
}) {
  const safeLoose = (floorLoose ?? []).filter(Boolean);
  const liveSel = new Set((dragHoverTable ?? []).map(cardKey));
  const selKeys = new Set(selectedTableKeys ?? []);
  const isSelected = (c: CardDto) => selKeys.has(cardKey(c)) || liveSel.has(cardKey(c));

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[52%] w-[72%]">
      {/* Drop zone */}
      <div
        className="absolute inset-0"
        onDragOver={(e) => {
          if (dragActive) e.preventDefault();
        }}
        onDrop={(e) => {
          if (dragActive) { e.preventDefault(); onDropToTable?.(); }
        }}
      />

      {/* Houses centered above loose cards */}
      {houses && houses.length > 0 && (
        <>
          <div className="text-[11px] text-emerald-200/80 text-center mb-1">Houses</div>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {houses.map((h, i) => (
              <div key={`house-${i}`} className="px-2 py-1 rounded bg-emerald-900/30 border border-emerald-800 text-emerald-100 text-[11px]">
                <div className="mb-1">{h.value} • {h.cards?.length ?? 0} cards</div>
                <div className="relative inline-block">
                  {h.cards?.slice(0, 3).map((c, idx) => (
                    <div key={`${c.rank}-${c.suit}-${idx}`} className="absolute" style={{ left: idx * 14, transform: `rotate(${idx === 0 ? -4 : idx === 1 ? 4 : 0}deg)` }}>
                      <PlayingCard card={c} width={34} />
                    </div>
                  ))}
                  <div style={{ width: (h.cards?.length ?? 0) > 0 ? 14 * Math.min(h.cards!.length, 3) + 34 : 34 }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}


      {/* Face-down row during bid */}
      {faceDownCount > 0 && (
        <>
          <div className="text-[11px] text-slate-300/80 text-center mb-1">Face-down</div>
          <div className="flex gap-2 justify-center mb-3">
            {Array.from({ length: faceDownCount }).map((_, i) => (
              <CardBack key={`fd-${i}`} />
            ))}
          </div>
        </>
      )}
      {dragActive && draggingHand && dragSnapped && canSnapTo(draggingHand, dragSnapped, bidValue ?? null) && (
        <div className="flex justify-center mt-3">
          <div className="relative inline-block">
            <div className="absolute left-3 top-2 rotate-6">
              <PlayingCard card={draggingHand} width={50} />
            </div>
            <div className="relative -rotate-6">
              <PlayingCard card={dragSnapped} width={50} />
            </div>
          </div>
        </div>
      )}

      {dragActive && draggingHand && dragSnapped && isRankCapture(draggingHand, dragSnapped) && (
        <div className="flex justify-center mt-2">
          <div className="text-xs px-2 py-1 rounded bg-sky-900/50 text-sky-200 border border-sky-700">
            Rank capture: {draggingHand.rank}
          </div>
        </div>
      )}

      {/* Loose cards centered */}
      {safeLoose.length > 0 && (
        <>
          <div className="text-[11px] text-slate-300/80 text-center mb-1">Loose Cards</div>
          <div className="flex flex-wrap gap-3 justify-center">
            {safeLoose.map((c) => {
              const k = cardKey(c);
              const selected = isSelected(c);

              const allowSnap = dragActive && draggingHand && (
                // house sum or same-rank capture
                (bidValue != null && draggingHand.value + c.value === bidValue) ||
                (draggingHand.rank?.toLowerCase() === c.rank?.toLowerCase()) ||
                (draggingHand.value === c.value)
              );

              return (
                <div
                  key={k}
                  className={(selected ? "ring-2 ring-emerald-400 " : "") + "rounded transition-shadow"}
                  onMouseEnter={() => {
                    // keep preview (optional)
                    if (!dragActive || !draggingHand) return;
                    if (allowSnap) onHoverToggleTable?.(c);
                  }}
                  onClick={() => onToggleTableCard?.(c)}
                  onDragOver={(e) => {
                    if (!dragActive) return;
                    // only allow drop if it’s a valid snap for house or rank-capture
                    if (allowSnap) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (!dragActive) return;
                    // Commit immediately to the correct API based on rule
                    e.preventDefault();
                    // We signal which table card was dropped onto via a custom event channel
                    // but simpler: call a dedicated handler with the exact CardDto
                    onDropOnTableCard?.(c);
                  }}
                >
                  <PlayingCard card={c} width={56} className="rounded" />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
