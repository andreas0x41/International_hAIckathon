-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  path_order INTEGER NOT NULL UNIQUE,
  questions_json JSONB NOT NULL,
  points_per_question INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for quizzes (read-only for all authenticated users)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quizzes"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (true);

-- Create user_progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for rewards (read-only for all authenticated users)
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create user_rewards table (for tracking redeemed rewards)
CREATE TABLE public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redeemed rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem rewards"
  ON public.user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, total_points, current_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    0,
    1
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update profile updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample quizzes
INSERT INTO public.quizzes (title, description, path_order, questions_json, points_per_question) VALUES
(
  'Energy Basics',
  'Learn about renewable energy and how to reduce your carbon footprint',
  1,
  '[
    {
      "question": "What is the most effective way to reduce personal carbon footprint?",
      "options": ["Switching to LED lights", "Reducing air travel", "Recycling paper"],
      "correct_index": 1,
      "context_for_ai": "Air travel is extremely carbon-intensive compared to household changes."
    },
    {
      "question": "Which renewable energy source is most widely used globally?",
      "options": ["Solar", "Wind", "Hydroelectric"],
      "correct_index": 2,
      "context_for_ai": "Hydroelectric power has been used for decades and accounts for the largest share of renewable energy globally."
    },
    {
      "question": "What percentage of energy can LED bulbs save compared to incandescent bulbs?",
      "options": ["25%", "50%", "75%"],
      "correct_index": 2,
      "context_for_ai": "LED bulbs use approximately 75% less energy and last much longer than traditional incandescent bulbs."
    }
  ]'::jsonb,
  10
),
(
  'Sustainable Food',
  'Discover how food choices impact the environment',
  2,
  '[
    {
      "question": "Which diet has the lowest environmental impact?",
      "options": ["Plant-based", "Mediterranean", "Paleo"],
      "correct_index": 0,
      "context_for_ai": "Plant-based diets require less land, water, and energy, and produce fewer greenhouse gas emissions."
    },
    {
      "question": "What percentage of food waste could be composted?",
      "options": ["30%", "50%", "70%"],
      "correct_index": 1,
      "context_for_ai": "About 50% of household food waste is compostable organic matter."
    },
    {
      "question": "Which food production has the highest carbon footprint?",
      "options": ["Beef", "Chicken", "Vegetables"],
      "correct_index": 0,
      "context_for_ai": "Beef production generates significantly more greenhouse gases than other protein sources."
    }
  ]'::jsonb,
  10
),
(
  'Local Recycling',
  'Master the art of effective recycling in your community',
  3,
  '[
    {
      "question": "What percentage of plastic is actually recycled globally?",
      "options": ["9%", "25%", "50%"],
      "correct_index": 0,
      "context_for_ai": "Only about 9% of all plastic ever produced has been recycled, highlighting the importance of reducing plastic use."
    },
    {
      "question": "Which material can be recycled indefinitely?",
      "options": ["Plastic", "Paper", "Glass"],
      "correct_index": 2,
      "context_for_ai": "Glass can be recycled endlessly without loss of quality, making it one of the most sustainable materials."
    },
    {
      "question": "What should you do before recycling containers?",
      "options": ["Wash them", "Remove labels", "Crush them"],
      "correct_index": 0,
      "context_for_ai": "Cleaning containers prevents contamination of other recyclables and makes the recycling process more efficient."
    }
  ]'::jsonb,
  10
);

-- Insert sample rewards
INSERT INTO public.rewards (title, description, points_cost, is_active) VALUES
('Free Bus Day Pass', 'Get a free day pass for public transportation in your city', 500, true),
('10% Off Local Eco-Store', 'Receive a discount voucher for sustainable products at participating stores', 300, true),
('Tree Planting Certificate', 'Plant a tree in your name through our partner organization', 750, true),
('Reusable Water Bottle', 'Premium stainless steel water bottle delivered to your door', 400, true),
('Eco-Friendly Tote Bag', 'Stylish canvas tote bag made from recycled materials', 250, true);