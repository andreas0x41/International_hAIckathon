import { Flame, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export const StreakDisplay = ({ currentStreak, longestStreak, className = "" }: StreakDisplayProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-br from-gold to-accent">
                  <Flame className="h-5 w-5 text-gold-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{currentStreak}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Complete quizzes daily to maintain your streak!</p>
              <p className="text-sm">Earn bonus points: {currentStreak * 10} points per day (max 100)</p>
              {currentStreak > 0 && (
                <p className="text-sm text-gold">🔥 Keep it going! Come back tomorrow!</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {longestStreak > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{longestStreak}</div>
                    <div className="text-xs text-muted-foreground">Best Streak</div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your longest streak ever! Can you beat it?</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
