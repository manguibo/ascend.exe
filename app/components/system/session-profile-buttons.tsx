"use client";

import { motion } from "framer-motion";
import type { SessionProfileDefinition, SessionProfileId } from "@/lib/system/profiles";

type SessionProfileButtonsProps = {
  profiles: readonly SessionProfileDefinition[];
  onApply: (profileId: SessionProfileId) => void;
  className?: string;
};

export function SessionProfileButtons({ profiles, onApply, className }: SessionProfileButtonsProps) {
  return (
    <div className={className ?? "grid gap-2 sm:grid-cols-3"}>
      {profiles.map((profile, index) => (
        <motion.button
          key={profile.id}
          type="button"
          onClick={() => onApply(profile.id)}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
          className="border border-cyan-500/40 px-3 py-2 text-left text-xs tracking-[0.15em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
        >
          <p>{profile.label}</p>
          <p className="mt-1 text-[10px] text-cyan-500/90">
            B{profile.baseRate} I{profile.intensityMultiplier.toFixed(2)} D{profile.durationMultiplier.toFixed(2)}
          </p>
        </motion.button>
      ))}
    </div>
  );
}
