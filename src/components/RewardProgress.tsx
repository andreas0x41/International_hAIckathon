import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Coins } from "lucide-react";

interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  image_url?: string;
}

interface RewardProgressProps {
  userPoints: number;
  onNavigateToRewards: () => void;
  compact?: boolean;
}

export const RewardProgress = ({ userPoints, onNavigateToRewards, compact = false }: RewardProgressProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
  const circumference = 2 * Math.PI * 16;

  const handleClick = () => {
    onNavigateToRewards();
  };

  if (compact) {
    return (
      <div
        className="transition-all duration-300 cursor-pointer"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onClick={handleClick}
      >
        <div
          className={`bg-card/50 border border-border/50 rounded-full shadow-sm overflow-hidden transition-all duration-300 ${
            isExpanded ? "w-64 px-4" : "w-14 px-2"
          } py-2 flex items-center gap-2`}
        >
          {/* Circular Progress */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference - (progress / 100) * circumference,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Gift className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-200 flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{nextReward.title}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Coins className="h-3 w-3 text-gold" />
                <span>
                  {userPoints} / {nextReward.points_cost}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standalone mode (not used currently but kept for flexibility)
  return (
    <div
      className="fixed top-20 right-4 z-30 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={handleClick}
    >
      <div
        className={`bg-card border border-border rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden transition-all duration-300 ${
          isExpanded ? "w-72" : "w-20"
        }`}
      >
        <div className="p-4">
          {/* Circular Progress */}
          <div className="relative w-12 h-12 mx-auto mb-3">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                style={{
                  strokeDasharray: 2 * Math.PI * 20,
                  strokeDashoffset: 2 * Math.PI * 20 - (progress / 100) * 2 * Math.PI * 20,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-sm font-semibold mb-2 text-center">Next Reward</h3>
              {nextReward.image_url && (
                <div className="w-full h-24 mb-2 rounded-lg overflow-hidden">
                  <img
                    src={nextReward.image_url}
                    alt={nextReward.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <p className="text-xs font-medium mb-1 text-center">{nextReward.title}</p>
              <p className="text-xs text-muted-foreground mb-2 text-center line-clamp-2">
                {nextReward.description}
              </p>
              <div className="flex items-center justify-center gap-1 text-xs">
                <Coins className="h-3 w-3 text-gold" />
                <span className="font-semibold">
                  {userPoints} / {nextReward.points_cost}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
