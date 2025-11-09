import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";

interface Reward {
  id: string;
  title: string;
  points_cost: number;
}

interface RewardProgressProps {
  userPoints: number;
  onNavigateToRewards: () => void;
}

export const RewardProgress = ({ userPoints, onNavigateToRewards }: RewardProgressProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("is_active", true)
        .order("points_cost");
      if (error) throw error;
      return data as Reward[];
    },
  });

  const nextReward = rewards.find(r => r.points_cost > userPoints) || rewards[rewards.length - 1];
  
  if (!nextReward) return null;

  const progress = Math.min((userPoints / nextReward.points_cost) * 100, 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 cursor-pointer ${
        isHovered ? "scale-110" : "scale-100"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onNavigateToRewards}
    >
      {/* Compact circle - always visible */}
      <div className="relative">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
            opacity="0.3"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--gold))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-2 rounded-full bg-gradient-to-br from-gold to-accent shadow-[var(--shadow-gold)]">
            <Gift className="h-5 w-5 text-gold-foreground" />
          </div>
        </div>
      </div>

      {/* Expanded details on hover */}
      {isHovered && (
        <div className="absolute top-0 right-0 bg-card border-2 border-gold rounded-lg shadow-[var(--shadow-lg)] p-4 min-w-[200px] animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="text-xs font-semibold text-gold uppercase tracking-wide mb-2">
            Next Reward
          </div>
          <div className="font-bold text-sm mb-2">{nextReward.title}</div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-lg font-bold text-accent">{userPoints}</span>
            <span className="text-xs text-muted-foreground">/ {nextReward.points_cost}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {nextReward.points_cost - userPoints} points to go
          </div>
          <div className="text-xs text-primary mt-2 font-semibold">
            Click to view all rewards →
          </div>
        </div>
      )}
    </div>
  );
};
