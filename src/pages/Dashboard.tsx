import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdventurePathMap } from "@/components/AdventurePathMap";
import { RewardsMarketplace } from "@/components/RewardsMarketplace";
import { PointsBadge } from "@/components/PointsBadge";
import { StreakDisplay } from "@/components/StreakDisplay";
import { RewardProgress } from "@/components/RewardProgress";
import { Leaf, LogOut } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

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
      {/* Compact Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold">Eco Rewards</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <PointsBadge points={profile.total_points} className="text-xs py-1 px-2" />
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">🔥</span>
                <span className="font-semibold">{profile.current_streak || 0}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Lv</span>
                <span className="font-semibold">{profile.current_level}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Reward Progress - Fixed top right */}
      <RewardProgress 
        userPoints={profile.total_points}
        onNavigateToRewards={() => {
          // Switch to rewards tab
          const rewardsTab = document.querySelector('[value="rewards"]') as HTMLElement;
          rewardsTab?.click();
        }}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Welcome Message */}
        <div className="mb-4">
          <h2 className="text-xl font-bold">Welcome back, {profile.username}! 👋</h2>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="journey" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="journey" onClick={refreshProfile}>Learning Journey</TabsTrigger>
            <TabsTrigger value="rewards" onClick={refreshProfile}>Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="journey">
            <AdventurePathMap />
          </TabsContent>

          <TabsContent value="rewards">
            <RewardsMarketplace userPoints={profile.total_points} onRedemption={refreshProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
