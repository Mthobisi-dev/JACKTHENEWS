'use client';

import { motion } from 'framer-motion';
import type { ReactionType } from '@/lib/types';
import { REACTIONS } from '@/lib/types';

interface ReactionPickerProps {
  onSelect: (reaction: ReactionType) => void;
  onClose: () => void;
  currentReaction: ReactionType | null;
}

export function ReactionPicker({ onSelect, onClose, currentReaction }: ReactionPickerProps) {
  const reactions = Object.entries(REACTIONS) as [ReactionType, { emoji: string; label: string }][];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="absolute bottom-full right-0 mb-2 glass rounded-full p-2 flex gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {reactions.map(([type, { emoji, label }], index) => (
        <motion.button
          key={type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(type)}
          className={`relative group p-2 rounded-full transition-all hover:scale-125 hover:bg-white/10 ${
            currentReaction === type ? 'bg-white/20 scale-110' : ''
          }`}
          title={label}
        >
          <span className="text-2xl">{emoji}</span>
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white/70 whitespace-nowrap"
          >
            {label}
          </motion.span>
        </motion.button>
      ))}
    </motion.div>
  );
}
