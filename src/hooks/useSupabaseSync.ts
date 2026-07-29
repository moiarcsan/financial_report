import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import type { BankMovement } from "../types/movement";

// Types for Supabase tables
export interface SupabaseMovement {
  id: string;
  user_id: string;
  bank: "N26" | "Unicaja" | "Sabadell";
  account: string;
  operation_date: string;
  value_date: string | null;
  concept: string;
  amount: number;
  currency: "EUR";
  source_file_name: string;
  imported_at: string;
  assigned_category?: string | null; // Manually assigned category
}

export interface SupabaseCategoryRule {
  id: string;
  user_id: string;
  keyword: string;
  category: string;
}

export interface SupabaseCustomCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

/**
 * Hook for syncing financial data with Supabase.
 * Provides CRUD operations for movements, category rules, and custom categories.
 * Gracefully handles errors and doesn't block the UI.
 */
export function useSupabaseSync(userId: string | null) {
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [categoryRules, setCategoryRules] = useState<Map<string, string>>(new Map());
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(true);

  // Load all data for the user
  const loadUserData = useCallback(async () => {
    if (!userId) {
      setMovements([]);
      setCategoryRules(new Map());
      setCustomCategories([]);
      setCustomCategoryColors({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load movements (all users' movements are visible to everyone)
      const { data: movementsData, error: movementsError } = await supabase
        .from("movements")
        .select("*")
        .order("operation_date", { ascending: false });

      if (movementsError) {
        // If table doesn't exist, mark Supabase as unavailable
        if (movementsError.message?.includes("relation") || movementsError.code === "42P01") {
          setIsSupabaseAvailable(false);
          setError("Tablas de Supabase no configuradas. Usa el archivo .env con las credenciales correctas.");
          return;
        }
        throw movementsError;
      }

      // Transform Supabase data to BankMovement format
      const transformedMovements: BankMovement[] = (movementsData || []).map((m: any) => ({
        id: m.id,
        fingerprint: m.id,
        bank: m.bank,
        account: m.account,
        operationDate: m.operation_date,
        valueDate: m.value_date,
        concept: m.concept,
        amount: m.amount,
        currency: m.currency,
        sourceFileName: m.source_file_name,
        importedAt: m.imported_at,
        assignedCategory: m.assigned_category,
      }));

      setMovements(transformedMovements);

      // Load category rules (all users' rules are visible to everyone)
      const { data: rulesData, error: rulesError } = await supabase
        .from("category_rules")
        .select("*");

      if (rulesError) {
        if (rulesError.message?.includes("relation") || rulesError.code === "42P01") {
          setIsSupabaseAvailable(false);
          setError("Tablas de Supabase no configuradas. Usa el archivo .env con las credenciales correctas.");
          return;
        }
        throw rulesError;
      }

      const rulesMap = new Map<string, string>();
      (rulesData || []).forEach((rule: any) => {
        rulesMap.set(rule.keyword, rule.category);
      });
      setCategoryRules(rulesMap);

      // Load custom categories (all users' categories are visible to everyone)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("custom_categories")
        .select("*");

      if (categoriesError) {
        if (categoriesError.message?.includes("relation") || categoriesError.code === "42P01") {
          setIsSupabaseAvailable(false);
          setError("Tablas de Supabase no configuradas. Usa el archivo .env con las credenciales correctas.");
          return;
        }
        throw categoriesError;
      }

      const categories: string[] = [];
      const colors: Record<string, string> = {};
      (categoriesData || []).forEach((cat: any) => {
        categories.push(cat.name);
        colors[cat.name] = cat.color;
      });
      setCustomCategories(categories);
      setCustomCategoryColors(colors);
    } catch (err) {
      console.error("Error loading data from Supabase:", err);
      const errorMessage = err instanceof Error ? err.message : "Error al cargar datos";
      setError(errorMessage);
      setIsSupabaseAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Save movements to Supabase
  const saveMovements = useCallback(
    async (newMovements: BankMovement[]) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const supabaseMovementsRaw = newMovements.map((m) => ({
          id: m.fingerprint,
          user_id: userId,
          bank: m.bank,
          account: m.account,
          operation_date: m.operationDate,
          value_date: m.valueDate,
          concept: m.concept,
          amount: m.amount,
          currency: m.currency,
          source_file_name: m.sourceFileName,
          imported_at: m.importedAt,
          assigned_category: m.assignedCategory || null,
        }));

        // Deduplicate by id to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
        const seen = new Set<string>();
        const supabaseMovements = supabaseMovementsRaw.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        const { error } = await supabase.from("movements").upsert(supabaseMovements);

        if (error) throw error;
        setMovements(newMovements);
      } catch (err) {
        console.error("Error saving movements to Supabase:", err);
        setError(err instanceof Error ? err.message : "Error al guardar movimientos");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Add a single movement
  const addMovement = useCallback(
    async (movement: BankMovement) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const supabaseMovement = {
          id: movement.fingerprint,
          user_id: userId,
          bank: movement.bank,
          account: movement.account,
          operation_date: movement.operationDate,
          value_date: movement.valueDate,
          concept: movement.concept,
          amount: movement.amount,
          currency: movement.currency,
          source_file_name: movement.sourceFileName,
          imported_at: movement.importedAt,
          assigned_category: movement.assignedCategory || null,
        };

        const { error } = await supabase.from("movements").insert(supabaseMovement);

        if (error) throw error;
        setMovements((prev) => [...prev, movement]);
      } catch (err) {
        console.error("Error adding movement:", err);
        setError(err instanceof Error ? err.message : "Error al añadir movimiento");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Delete movements by source file
  const deleteMovementsByFile = useCallback(
    async (fileName: string) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const { error } = await supabase
          .from("movements")
          .delete()
          .eq("user_id", userId)
          .eq("source_file_name", fileName);

        if (error) throw error;
        setMovements((prev) => prev.filter((m) => m.sourceFileName !== fileName));
      } catch (err) {
        console.error("Error deleting movements:", err);
        setError(err instanceof Error ? err.message : "Error al borrar movimientos");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Clear all movements
  const clearMovements = useCallback(async () => {
    if (!userId || !isSupabaseAvailable) return;

    try {
      const { error } = await supabase.from("movements").delete().eq("user_id", userId);

      if (error) throw error;
      setMovements([]);
    } catch (err) {
      console.error("Error clearing movements:", err);
      setError(err instanceof Error ? err.message : "Error al vaciar movimientos");
    }
  }, [userId, isSupabaseAvailable]);

  // Add category rule
  const addCategoryRule = useCallback(
    async (keyword: string, category: string) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const { error } = await supabase.from("category_rules").upsert(
          {
            user_id: userId,
            keyword: keyword.trim(),
            category,
          },
          {
            onConflict: "user_id,keyword",
          }
        );

        if (error) throw error;
        setCategoryRules((prev) => new Map(prev).set(keyword.trim(), category));
      } catch (err) {
        console.error("Error adding category rule:", err);
        setError(err instanceof Error ? err.message : "Error al guardar regla de categoría");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Add multiple category rules (batch)
  const addCategoryRules = useCallback(
    async (rules: Array<{ keyword: string; category: string }>) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const supabaseRules = rules.map((r) => ({
          user_id: userId,
          keyword: r.keyword.trim(),
          category: r.category,
        }));

        const { error } = await supabase.from("category_rules").upsert(supabaseRules);

        if (error) throw error;
        setCategoryRules((prev) => {
          const next = new Map(prev);
          for (const r of rules) {
            next.set(r.keyword.trim(), r.category);
          }
          return next;
        });
      } catch (err) {
        console.error("Error adding category rules:", err);
        setError(err instanceof Error ? err.message : "Error al guardar reglas de categoría");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Remove category rule
  const removeCategoryRule = useCallback(
    async (keyword: string) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const { error } = await supabase
          .from("category_rules")
          .delete()
          .eq("user_id", userId)
          .eq("keyword", keyword);

        if (error) throw error;
        setCategoryRules((prev) => {
          const next = new Map(prev);
          next.delete(keyword);
          return next;
        });
      } catch (err) {
        console.error("Error removing category rule:", err);
        setError(err instanceof Error ? err.message : "Error al borrar regla de categoría");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Clear all category rules
  const clearCategoryRules = useCallback(async () => {
    if (!userId || !isSupabaseAvailable) return;

    try {
      const { error } = await supabase.from("category_rules").delete().eq("user_id", userId);

      if (error) throw error;
      setCategoryRules(new Map());
    } catch (err) {
      console.error("Error clearing category rules:", err);
      setError(err instanceof Error ? err.message : "Error al borrar reglas de categoría");
    }
  }, [userId, isSupabaseAvailable]);

  // Update assigned category for a specific movement
  const updateMovementCategory = useCallback(
    async (movementId: string, category: string | null) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const { error } = await supabase
          .from("movements")
          .update({ assigned_category: category })
          .eq("id", movementId)
          .eq("user_id", userId);

        if (error) throw error;
        
        // Update local state
        setMovements((prev) =>
          prev.map((m) =>
            m.id === movementId ? { ...m, assignedCategory: category } : m
          )
        );
      } catch (err) {
        console.error("Error updating movement category:", err);
        setError(err instanceof Error ? err.message : "Error al actualizar categoría del movimiento");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Add custom category
  const addCustomCategory = useCallback(
    async (name: string, color: string) => {
      if (!userId || !isSupabaseAvailable) return false;

      try {
        const { error } = await supabase.from("custom_categories").insert({
          user_id: userId,
          name: name.trim(),
          color,
        });

        if (error) throw error;
        setCustomCategories((prev) => [...prev, name.trim()]);
        setCustomCategoryColors((prev) => ({ ...prev, [name.trim()]: color }));
        return true;
      } catch (err) {
        console.error("Error adding custom category:", err);
        setError(err instanceof Error ? err.message : "Error al añadir categoría personalizada");
        return false;
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Remove custom category
  const removeCustomCategory = useCallback(
    async (name: string) => {
      if (!userId || !isSupabaseAvailable) return;

      try {
        const { error } = await supabase
          .from("custom_categories")
          .delete()
          .eq("user_id", userId)
          .eq("name", name);

        if (error) throw error;
        setCustomCategories((prev) => prev.filter((c) => c !== name));
        setCustomCategoryColors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      } catch (err) {
        console.error("Error removing custom category:", err);
        setError(err instanceof Error ? err.message : "Error al borrar categoría personalizada");
      }
    },
    [userId, isSupabaseAvailable]
  );

  // Load data on user change
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return {
    movements,
    categoryRules,
    customCategories,
    customCategoryColors,
    isLoading,
    error,
    isSupabaseAvailable,
    saveMovements,
    addMovement,
    deleteMovementsByFile,
    clearMovements,
    addCategoryRule,
    addCategoryRules,
    removeCategoryRule,
    clearCategoryRules,
    updateMovementCategory,
    addCustomCategory,
    removeCustomCategory,
    refreshData: loadUserData,
  };
}