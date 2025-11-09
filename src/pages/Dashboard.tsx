import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      await fetchProfile(user.id);
    };

    checkUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
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

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-gradient-to-r from-background via-muted/20 to-background backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
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

          {/* Center Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 max-w-md mx-8">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50">
              <TabsTrigger 
                value="journey" 
                onClick={refreshProfile}
                className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Learning Journey
              </TabsTrigger>
              <TabsTrigger 
                value="rewards" 
                onClick={refreshProfile}
                className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Rewards
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
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
                    <p className="text-xs font-semibold">Total Points Earned</p>
                    <p className="text-[10px] text-muted-foreground">Use points to redeem rewards</p>
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
                    <p className="text-xs font-semibold">Current Streak: {profile.current_streak || 0} days</p>
                    <p className="text-[10px] text-muted-foreground">Longest: {profile.longest_streak || 0} days</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Complete quizzes daily to maintain</p>
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
                    <p className="text-xs font-semibold">Current Level</p>
                    <p className="text-[10px] text-muted-foreground">Level up by earning more points</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <AccountMenu username={profile.username} onSignOut={handleSignOut} />
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
