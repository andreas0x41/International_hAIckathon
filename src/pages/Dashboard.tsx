import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdventureMap } from "@/components/AdventureMap";
import { RewardsMarketplace } from "@/components/RewardsMarketplace";
import { PointsBadge } from "@/components/PointsBadge";
import { StreakDisplay } from "@/components/StreakDisplay";
import { Leaf, LogOut } from "lucide-react";
import { toast } from "sonner";
import heroImage from "@/assets/hero-eco.jpg";

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
      {/* Hero Header */}
      <div className="relative h-64 overflow-hidden">
        <img src={heroImage} alt="Eco Rewards" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="h-12 w-12" />
            <h1 className="text-5xl font-bold">Eco Rewards</h1>
          </div>
          <p className="text-xl font-medium">Learn, Earn, Take Action</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* User Info Bar */}
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {profile.username}!</h2>
              <p className="text-muted-foreground">Level {profile.current_level}</p>
            </div>
            <div className="flex items-center gap-4">
              <PointsBadge points={profile.total_points} />
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Streak Display */}
          <StreakDisplay 
            currentStreak={profile.current_streak || 0}
            longestStreak={profile.longest_streak || 0}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="journey" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="journey" onClick={refreshProfile}>Learning Journey</TabsTrigger>
            <TabsTrigger value="rewards" onClick={refreshProfile}>Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="journey">
            <AdventureMap />
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
