import { Coins } from "lucide-react";

interface PointsBadgeProps {
  points: number;
  className?: string;
}

export const PointsBadge = ({ points, className = "" }: PointsBadgeProps) => {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gold to-accent text-gold-foreground font-bold shadow-[var(--shadow-gold)] ${className}`}
    >
      <Coins className="h-5 w-5" />
      <span>{points.toLocaleString()} Points</span>
    </div>
  );
};
