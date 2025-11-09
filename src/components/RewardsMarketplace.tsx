import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Gift } from "lucide-react";
import { toast } from "sonner";

interface Reward {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  image_url: string | null;
}

interface RewardsMarketplaceProps {
  userPoints: number;
  onRedemption: () => void;
}

export const RewardsMarketplace = ({ userPoints, onRedemption }: RewardsMarketplaceProps) => {
  const queryClient = useQueryClient();

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

  const redeemMutation = useMutation({
    mutationFn: async (reward: Reward) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has enough points
      if (userPoints < reward.points_cost) {
        throw new Error("Not enough points");
      }

      // Insert redemption record
      const { error: insertError } = await supabase
        .from("user_rewards")
        .insert({
          user_id: user.id,
          reward_id: reward.id,
        });

      if (insertError) throw insertError;

      // Update user points
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          total_points: userPoints - reward.points_cost,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      return reward;
    },
    onSuccess: (reward) => {
      toast.success(`${reward.title} redeemed! Check your email for details.`);
      queryClient.invalidateQueries({ queryKey: ["user-progress"] });
      onRedemption();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to redeem reward");
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Rewards Marketplace</h2>
        <p className="text-muted-foreground">Spend your Eco Points on real rewards!</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => {
          const canAfford = userPoints >= reward.points_cost;

          return (
            <Card
              key={reward.id}
              className={`transition-all duration-300 ${
                canAfford
                  ? "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]"
                  : "opacity-60"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-gold to-accent">
                    <Gift className="h-8 w-8 text-gold-foreground" />
                  </div>
                </div>
                <CardTitle>{reward.title}</CardTitle>
                <CardDescription>{reward.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 text-lg font-bold text-accent">
                  <Coins className="h-5 w-5" />
                  <span>{reward.points_cost} Points</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  disabled={!canAfford || redeemMutation.isPending}
                  onClick={() => redeemMutation.mutate(reward)}
                >
                  {!canAfford && "Not Enough Points"}
                  {canAfford && !redeemMutation.isPending && "Redeem"}
                  {redeemMutation.isPending && "Redeeming..."}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
