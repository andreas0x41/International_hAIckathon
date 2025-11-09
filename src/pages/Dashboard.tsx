import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AdventurePathMap } from "@/components/AdventurePathMap";
import { RewardsMarketplace } from "@/components/RewardsMarketplace";
import { PointsBadge } from "@/components/PointsBadge";
import { RewardProgress } from "@/components/RewardProgress";
import { AccountMenu } from "@/components/AccountMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Leaf, Flame, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("journey");

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);
    };

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchProfile(user.id);
      } else {
        // Guest mode - set default profile
        setProfile({
          username: "Guest",
          total_points: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
        });
      }
    };

    checkUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile({
          username: "Guest",
          total_points: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Refresh profile when component becomes visible (e.g., returning from quiz)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  // Refresh profile when switching tabs
  const refreshProfile = async () => {
    if (!user) return;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(profileData);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Guest Mode Banner */}
      {!user && (
        <div className="bg-gradient-to-r from-primary to-secondary py-3 px-4 text-center">
          <p className="text-primary-foreground text-sm">
            You're in guest mode. Progress won't be saved.{" "}
            <button
              onClick={() => navigate("/auth")}
              className="underline font-semibold hover:opacity-80"
            >
              Sign up to save your progress
            </button>
          </p>
        </div>
      )}
      
      {/* Enhanced Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-gradient-to-r from-background via-muted/20 to-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo and Brand - Clickable to go to Journey */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setActiveTab("journey")}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow)]">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Eco Rewards
              </h1>
              <p className="text-[10px] text-muted-foreground">Learn & Earn</p>
            </div>
          </div>
          
          {/* Right Side Stats and Account */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-3">
              <RewardProgress 
                userPoints={profile.total_points}
                onNavigateToRewards={() => setActiveTab("rewards")}
                compact={true}
              />
              
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/50 border border-border/50 shadow-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <PointsBadge points={profile.total_points} className="text-xs py-1 px-2.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border-border">
                    <p className="text-sm font-semibold">Total Points Earned</p>
                    <p className="text-xs text-muted-foreground">Use points to redeem rewards</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="h-5 w-px bg-border" />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-default">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-bold">{profile.current_streak || 0}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border-border">
                    <p className="text-sm font-semibold">Current Streak: {profile.current_streak || 0} days</p>
                    <p className="text-xs text-muted-foreground">Longest: {profile.longest_streak || 0} days</p>
                    <p className="text-xs text-muted-foreground mt-1">Complete quizzes daily to maintain</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="h-5 w-px bg-border" />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-default">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold">{profile.current_level}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border-border">
                    <p className="text-sm font-semibold">Current Level</p>
                    <p className="text-xs text-muted-foreground">Level up by earning more points</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {user ? (
                <AccountMenu username={profile.username} onSignOut={handleSignOut} />
              ) : (
                <Button
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="text-sm"
                >
                  Sign Up
                </Button>
              )}
            </div>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="journey" className="mt-0">
            <AdventurePathMap />
          </TabsContent>

          <TabsContent value="rewards" className="mt-0">
            <RewardsMarketplace userPoints={profile.total_points} onRedemption={refreshProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
