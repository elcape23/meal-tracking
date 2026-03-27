export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MealType = "lunch" | "dinner" | "both";
export type RecipeSource = "plan" | "custom" | "imported";
export type ImportStatus = "uploaded" | "parsed" | "confirmed" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          email?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          normalized_name: string;
          description: string | null;
          meal_type: MealType;
          source: RecipeSource;
          ingredients: Json | null;
          instructions: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          normalized_name: string;
          description?: string | null;
          meal_type?: MealType;
          source?: RecipeSource;
          ingredients?: Json | null;
          instructions?: string | null;
          is_archived?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["meal_plans"]["Insert"]>;
      };
      meal_plan_entries: {
        Row: {
          id: string;
          meal_plan_id: string;
          date: string;
          meal_type: Exclude<MealType, "both">;
          recipe_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          date: string;
          meal_type: Exclude<MealType, "both">;
          recipe_id: string;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["meal_plan_entries"]["Insert"]>;
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          meal_type: Exclude<MealType, "both">;
          planned_recipe_id: string | null;
          eaten_recipe_id: string;
          followed_plan: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          meal_type: Exclude<MealType, "both">;
          planned_recipe_id?: string | null;
          eaten_recipe_id: string;
          followed_plan: boolean;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["food_logs"]["Insert"]>;
      };
      favorite_recipes: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
        };
        Update: {
          recipe_id?: string;
        };
      };
      meal_plan_imports: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          storage_path: string | null;
          raw_text: string | null;
          parsed_payload: Json | null;
          status: ImportStatus;
          warnings: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          storage_path?: string | null;
          raw_text?: string | null;
          parsed_payload?: Json | null;
          status?: ImportStatus;
          warnings?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["meal_plan_imports"]["Insert"]>;
      };
    };
  };
}

export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type MealPlan = Database["public"]["Tables"]["meal_plans"]["Row"];
export type MealPlanEntry = Database["public"]["Tables"]["meal_plan_entries"]["Row"];
export type FoodLog = Database["public"]["Tables"]["food_logs"]["Row"];
export type MealPlanImport = Database["public"]["Tables"]["meal_plan_imports"]["Row"];

export type TodayMealCard = {
  mealType: Exclude<MealType, "both">;
  date: string;
  plannedRecipe: Pick<Recipe, "id" | "name" | "source"> | null;
  loggedRecipe: Pick<Recipe, "id" | "name"> | null;
  logId: string | null;
  followedPlan: boolean | null;
  suggestions: Pick<Recipe, "id" | "name" | "meal_type" | "source">[];
};

export type HistoryLog = FoodLog & {
  planned_recipe: Pick<Recipe, "id" | "name"> | null;
  eaten_recipe: Pick<Recipe, "id" | "name">;
};

export type PlanDay = {
  date: string;
  lunch: Pick<Recipe, "id" | "name" | "source"> | null;
  dinner: Pick<Recipe, "id" | "name" | "source"> | null;
};

export type ParsedMealPlanEntry = {
  id: string;
  dateLabel: string;
  date: string | null;
  mealType: Exclude<MealType, "both">;
  recipeName: string;
  notes?: string;
  confidence: "high" | "medium" | "low";
};

export type ParsedMealPlan = {
  title: string;
  startDate: string | null;
  endDate: string | null;
  entries: ParsedMealPlanEntry[];
  warnings: string[];
  rawText: string;
};

export type RecipeIngredient = {
  name: string;
  quantity: string;
  unit: string;
  note?: string | null;
};

export type IngredientOption = {
  label: string;
  normalized: string;
};

export type ParsedRecipeImport = {
  title: string;
  mealType: MealType;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  warnings: string[];
  rawText: string;
};
