"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { CardDto } from "@/lib/types";

interface CardFlyAnimation {
    id: string;
    card: CardDto;
    from: { x: number; y: number };
    to: { x: number; y: number };
    duration: number;
    delay: number;
    onComplete?: () => void;
    type: "deal" | "throw" | "capture" | "house";
}

export function CardFlyAnimations({ animations }: { animations: CardFlyAnimation[] }) {
    return (
        <AnimatePresence>
            {animations.map((anim) => (
                <motion.div
                    key={anim.id}
                    initial={{
                        x: anim.from.x,
                        y: anim.from.y,
                        scale: 0.8,
                        opacity: 0.9,
                        rotateZ: Math.random() * 10 - 5 // Slight random rotation
                    }}
                    animate={{
                        x: anim.to.x,
                        y: anim.to.y,
                        scale: 1,
                        opacity: 1,
                        rotateZ: 0
                    }}
                    exit={{
                        scale: 0.6,
                        opacity: 0,
                        rotateZ: Math.random() * 15 - 7.5
                    }}
                    transition={{
                        duration: anim.duration * 1.5,
                        delay: anim.delay,
                        ease: [0.25, 0.8, 0.25, 1],
                        type: "spring",
                        stiffness: 80,
                        damping: 20 
                    }}
                    className="absolute pointer-events-none z-50"
                    onAnimationComplete={anim.onComplete}
                    style={{
                        filter: anim.type === "capture" ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))" :
                            anim.type === "house" ? "drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))" :
                                "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))"
                    }}
                >
                    <PlayingCard
                        card={anim.card}
                        width={60}
                        className={`
              border-2 transition-all duration-300
              ${anim.type === "capture" ? "border-green-400" :
                                anim.type === "house" ? "border-purple-400" :
                                    anim.type === "throw" ? "border-blue-400" : "border-gray-400"}
            `}
                    />
                </motion.div>
            ))}
        </AnimatePresence>
    );
}

// Particle effects for captures and sweeps
export function CaptureParticles({
    show,
    center,
    type = "capture"
}: {
    show: boolean;
    center: { x: number; y: number };
    type?: "capture" | "sweep" | "house"
}) {
    if (!show) return null;

    const particleCount = type === "sweep" ? 15 : type === "house" ? 10 : 8;
    const particles = Array.from({ length: particleCount }).map((_, i) => ({
        id: `particle-${i}`,
        angle: (360 / particleCount) * i,
        distance: type === "sweep" ? 80 : 60,
        color: type === "sweep" ? "#fbbf24" : type === "house" ? "#a855f7" : "#10b981"
    }));

    return (
        <AnimatePresence>
            {particles.map((particle) => {
                const radians = (particle.angle * Math.PI) / 180;
                const endX = center.x + Math.cos(radians) * particle.distance;
                const endY = center.y + Math.sin(radians) * particle.distance;

                return (
                    <motion.div
                        key={particle.id}
                        initial={{
                            x: center.x,
                            y: center.y,
                            scale: 0,
                            opacity: 1
                        }}
                        animate={{
                            x: endX,
                            y: endY,
                            scale: [0, 1, 0],
                            opacity: [1, 1, 0]
                        }}
                        transition={{
                            duration: 1.2,
                            ease: "easeOut",
                            times: [0, 0.5, 1]
                        }}
                        className="absolute pointer-events-none z-40"
                        style={{
                            width: 8,
                            height: 8,
                            backgroundColor: particle.color,
                            borderRadius: "50%",
                            boxShadow: `0 0 6px ${particle.color}`
                        }}
                    />
                );
            })}
        </AnimatePresence>
    );
}

// Turn indicator animation
export function TurnIndicator({
    currentSeat,
    seatPositions,
    playerNames = ["You", "Player 1", "Player 2", "Player 3"]
}: {
    currentSeat: number;
    seatPositions: Record<number, { x: number; y: number }>;
    playerNames?: string[];
}) {
    const position = seatPositions[currentSeat];

    return (
        <motion.div
            key={`turn-${currentSeat}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
                duration: 0.5,
                type: "spring",
                stiffness: 200
            }}
            className="absolute pointer-events-none z-30"
            style={{
                left: position.x - 50,
                top: position.y - 80,
                width: 100,
                textAlign: "center"
            }}
        >
            {/* <motion.div
                animate={{
                    y: [0, -5, 0],
                    scale: [1, 1.05, 1]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg"
            >
                {playerNames[currentSeat]}'s Turn
            </motion.div> */}

            {/* Pulsing glow around player area */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute inset-0 bg-yellow-400 rounded-full blur-md -z-10"
                style={{
                    width: 120,
                    height: 120,
                    left: -10,
                    top: -10
                }}
            />
        </motion.div>
    );
}
