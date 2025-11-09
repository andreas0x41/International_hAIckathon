import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Leaf, Sparkles, Trophy, Gift } from "lucide-react";
import heroImage from "@/assets/hero-eco.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-screen overflow-hidden">
        <img src={heroImage} alt="Eco Rewards Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/90" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground px-4">
          <div className="flex items-center gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-4 rounded-full bg-primary-foreground/10 backdrop-blur-sm">
              <Leaf className="h-16 w-16" />
            </div>
            <div>
              <h1 className="text-6xl md:text-7xl font-bold mb-2">Eco Rewards</h1>
              <p className="text-2xl md:text-3xl font-semibold">Learn, Earn, Take Action</p>
            </div>
          </div>
          <p className="text-xl md:text-2xl mb-8 text-center max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            Turn your eco-knowledge into real rewards while making a difference for our planet
          </p>
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate("/auth")}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-secondary">
                <Sparkles className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">Learn</h3>
            <p className="text-muted-foreground text-lg">
              Take interactive quizzes on energy, food, recycling, and more. Get instant AI-powered feedback and actionable tips.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-gold to-accent">
                <Trophy className="h-12 w-12 text-gold-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">Earn</h3>
            <p className="text-muted-foreground text-lg">
              Accumulate Eco Points for every correct answer. Progress through levels and unlock new quiz topics.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-secondary to-primary">
                <Gift className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold">Take Action</h3>
            <p className="text-muted-foreground text-lg">
              Redeem your points for real rewards: bus passes, eco-store discounts, tree planting certificates, and more!
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-secondary py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of learners turning sustainability knowledge into real-world impact
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            onClick={() => navigate("/auth")}
          >
            Start Your Journey
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Eco Rewards. Building a sustainable future, one quiz at a time.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
