import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Reward {
  id: string;
  title: string;
  points_cost: number;
}

interface RewardProgressProps {
  userPoints: number;
}

export const RewardProgress = ({ userPoints }: RewardProgressProps) => {
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

  // Find next affordable reward
  const nextReward = rewards.find(r => r.points_cost > userPoints) || rewards[rewards.length - 1];
  
  if (!nextReward) return null;

  const progress = Math.min((userPoints / nextReward.points_cost) * 100, 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card className="p-4 bg-gradient-to-br from-gold/10 to-accent/10 border-gold/20 hover:shadow-[var(--shadow-gold)] transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="relative">
          {/* Circular progress ring */}
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
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
          
          {/* Icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-gold to-accent">
              <Gift className="h-6 w-6 text-gold-foreground" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Next Reward
          </div>
          <div className="font-bold text-sm truncate mb-1">{nextReward.title}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-accent">{userPoints}</span>
            <span className="text-sm text-muted-foreground">/ {nextReward.points_cost}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {nextReward.points_cost - userPoints} points to go
          </div>
        </div>
      </div>
    </Card>
  );
};
