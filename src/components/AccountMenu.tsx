import { useState, useRef } from "react";
import { LogOut, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AccountMenuProps {
  username: string;
  onSignOut: () => void;
}

export const AccountMenu = ({ username, onSignOut }: AccountMenuProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 500);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Initials Circle */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold cursor-pointer transition-all duration-300 ${
          isExpanded ? "shadow-[var(--shadow-glow)]" : ""
        }`}
      >
        <div className="h-7 w-7 rounded-full bg-background/20 flex items-center justify-center text-xs">
          {getInitials(username)}
        </div>
        {isExpanded && (
          <span className="text-sm animate-in fade-in slide-in-from-left-2 duration-200">
            {username}
          </span>
        )}
      </div>

      {/* Expanded Menu */}
      {isExpanded && (
        <div 
          className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-[var(--shadow-lg)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-2 space-y-1 bg-card">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => navigate("/admin")}
            >
              <Plus className="h-4 w-4" />
              Manage Quizzes
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => {
                // Navigate to settings - placeholder for now
              }}
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Button>
            <div className="h-px bg-border my-1" />
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
