import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { CATEGORY_ORDER, CATEGORY_COLORS } from "../utils/categoryUtils";
import type { ExpenseCategory } from "../utils/categoryUtils";

const STORAGE_KEY = "user_category_rules";

// Pastel palette for auto-assigning colors to custom categories
const COLOR_PALETTE = [
  "#86efac", "#fed7aa", "#93c5fd", "#c4b5fd", "#f0abfc",
  "#fda4af", "#fca5a5", "#5eead4", "#f0abfc", "#d8b4fe",
  "#67e8f9", "#fde047", "#bef264", "#f9a8d4", "#99f6e4",
  "#86efac", "#fed7aa", "#93c5fd", "#c4b5fd", "#f0abfc",
];

/**
 * Generates a deterministic color from a string using a simple hash.
 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

// ── Rules persistence ──────────────────────────────────────────

/**
 * Loads user-defined category rules from localStorage.
 */
function loadRules(): Map<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored) as Array<[string, string]>;
    return new Map(parsed);
  } catch {
    return new Map();
  }
}

/**
 * Saves user-defined category rules to localStorage.
 */
function saveRules(rules: Map<string, string>): void {
  try {
    // Sort by keyword length descending (longest match first = most specific)
    const sorted = Array.from(rules.entries()).sort(
      ([a], [b]) => b.length - a.length
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // localStorage may be full or unavailable; silently fail
    console.warn("No se pudieron guardar las reglas de categorización.");
  }
}

// ── Supabase sync functions ───────────────────────────────────

/**
 * Fetches category rules from Supabase for all users.
 */
async function fetchRulesFromSupabase(userId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("category_rules")
    .select("keyword, category");

  if (error) {
    console.warn("No se pudieron cargar las reglas desde Supabase:", error.message);
    return new Map();
  }

  const rulesMap = new Map<string, string>();
  if (data) {
    for (const row of data) {
      rulesMap.set(row.keyword, row.category);
    }
  }
  return rulesMap;
}

/**
 * Syncs local rules to Supabase (upserts all rules).
 */
async function syncRulesToSupabase(userId: string, rules: Map<string, string>): Promise<void> {
  if (!userId) return;

  const rulesArray = Array.from(rules.entries()).map(([keyword, category]) => ({
    user_id: userId,
    keyword,
    category,
  }));

  const { error } = await supabase.from("category_rules").upsert(rulesArray, {
    onConflict: "user_id,keyword",
  });

  if (error) {
    console.error("Error al sincronizar reglas con Supabase:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

/**
 * Fetches custom categories from Supabase for all users.
 */
async function fetchCustomCategoriesFromSupabase(userId: string): Promise<{ categories: string[]; colors: Record<string, string> }> {
  const { data, error } = await supabase
    .from("custom_categories")
    .select("name, color");

  if (error) {
    console.warn("No se pudieron cargar las categorías personalizadas desde Supabase:", error.message);
    return { categories: [], colors: {} };
  }

  const categories: string[] = [];
  const colors: Record<string, string> = {};
  if (data) {
    for (const row of data) {
      categories.push(row.name);
      colors[row.name] = row.color;
    }
  }
  return { categories, colors };
}

/**
 * Adds a custom category to Supabase.
 */
async function addCustomCategoryToSupabase(userId: string, name: string, color: string): Promise<boolean> {
  if (!userId) {
    console.error("Cannot add custom category: userId is required");
    return false;
  }

  const { error } = await supabase.from("custom_categories").insert({
    user_id: userId,
    name: name.trim(),
    color,
  });

  if (error) {
    console.error("Error al guardar categoría personalizada en Supabase:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return false;
  }
  return true;
}

/**
 * Removes a custom category from Supabase.
 */
async function removeCustomCategoryFromSupabase(userId: string, name: string): Promise<boolean> {
  if (!userId) {
    console.error("Cannot remove custom category: userId is required");
    return false;
  }

  const { error } = await supabase
    .from("custom_categories")
    .delete()
    .eq("user_id", userId)
    .eq("name", name);

  if (error) {
    console.error("Error al borrar categoría personalizada de Supabase:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return false;
  }
  return true;
}

/**
 * Hook that manages user-defined keyword→category rules,
 * with optional Supabase sync for cross-device synchronization.
 *
 * - Rules are loaded from localStorage and synced to Supabase
 * - Custom categories are loaded from Supabase and stored there (require userId)
 */
export function useUserCategoryRules(userId?: string) {
  const [rules, setRules] = useState<Map<string, string>>(loadRules);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>({});
  const isMountedRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Persist whenever rules change (localStorage)
  useEffect(() => {
    if (isMountedRef.current) {
      saveRules(rules);
    }
  }, [rules]);

  // ── Sync with Supabase on mount (if userId provided) ────────
  useEffect(() => {
    if (!userId) return;

    const syncWithSupabase = async () => {
      const supabaseRules = await fetchRulesFromSupabase(userId);
      const { categories: supabaseCategories, colors: supabaseColors } = await fetchCustomCategoriesFromSupabase(userId);

      // Load rules from Supabase if local is empty
      if (supabaseRules.size > 0 && rules.size === 0) {
        setRules(supabaseRules);
      } else if (supabaseRules.size > 0 && rules.size > 0) {
        // Merge: prefer Supabase rules but add any local-only rules
        const merged = new Map(supabaseRules);
        rules.forEach((category, keyword) => {
          if (!merged.has(keyword)) {
            merged.set(keyword, category);
          }
        });
        setRules(merged);
      }

      // Load custom categories from Supabase (they are stored only in Supabase, not local)
      setCustomCategories(supabaseCategories);
      setCustomCategoryColors(supabaseColors);
    };

    syncWithSupabase();
    isMountedRef.current = true;
  }, [userId]);

  // ── Sync to Supabase when rules change (if userId provided) ──
  useEffect(() => {
    if (!userId || isSyncingRef.current || !isMountedRef.current) return;
    
    // Only sync if we have rules to sync
    if (rules.size === 0) return;
    
    isSyncingRef.current = true;
    syncRulesToSupabase(userId, rules).finally(() => {
      isSyncingRef.current = false;
    });
  }, [rules, userId]);

  // ── Rule operations ────────────────────────────────────────────

  /**
   * Adds or updates a single keyword→category rule.
   */
  const addRule = useCallback((keyword: string, category: string) => {
    setRules((prev) => {
      const next = new Map(prev);
      next.set(keyword.trim(), category);
      return next;
    });
  }, []);

  /**
   * Adds multiple keyword→category rules at once (batch import).
   */
  const addRules = useCallback(
    (newRules: Array<{ keyword: string; category: string }>) => {
      setRules((prev) => {
        const next = new Map(prev);
        for (const { keyword, category } of newRules) {
          next.set(keyword.trim(), category);
        }
        return next;
      });
    },
    []
  );

  /**
   * Removes a rule by keyword.
   */
  const removeRule = useCallback((keyword: string) => {
    setRules((prev) => {
      const next = new Map(prev);
      next.delete(keyword);
      return next;
    });
  }, []);

  /**
   * Clears all user-defined rules.
   */
  const clearRules = useCallback(() => {
    setRules(new Map());
  }, []);

  /**
   * Returns the number of rules stored.
   */
  const ruleCount = rules.size;

  // ── Custom category operations ────────────────────────────────

  /**
   * Adds a new custom category. Returns false if it already exists or userId is not provided.
   * Custom categories are stored only in Supabase (require userId).
   */
  const addCustomCategory = useCallback((name: string): boolean => {
    if (!userId) {
      console.warn("Cannot add custom category without userId");
      return false;
    }

    const trimmed = name.trim();
    if (!trimmed) return false;

    // Check duplicates against built-in + existing custom
    const allExisting = getAllAssignableCategories(customCategories);
    if (allExisting.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }

    const color = stringToColor(trimmed);
    setCustomCategories((prev) => [...prev, trimmed]);
    // Auto-assign a color based on the category name
    setCustomCategoryColors((prev) => ({
      ...prev,
      [trimmed]: color,
    }));

    // Sync to Supabase
    addCustomCategoryToSupabase(userId, trimmed, color).catch((err) => {
      console.error("Error syncing custom category to Supabase:", err);
    });

    return true;
  }, [customCategories, userId]);

  /**
   * Removes a custom category by name (requires userId).
   * Also removes it from Supabase and clears associated rules.
   */
  const removeCustomCategory = useCallback((name: string) => {
    if (!userId) {
      console.warn("Cannot remove custom category without userId");
      return;
    }

    setCustomCategories((prev) => prev.filter((c) => c !== name));

    // Also remove all rules that use this category
    setRules((prev) => {
      const next = new Map(prev);
      for (const [keyword, category] of prev.entries()) {
        if (category === name) {
          next.delete(keyword);
        }
      }
      return next;
    });

    // Remove color assignment
    setCustomCategoryColors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    // Sync removal to Supabase
    removeCustomCategoryFromSupabase(userId, name).catch((err) => {
      console.error("Error removing custom category from Supabase:", err);
    });
  }, [userId]);

  return {
    rules,
    addRule,
    addRules,
    removeRule,
    clearRules,
    ruleCount,
    customCategories,
    customCategoryColors,
    addCustomCategory,
    removeCustomCategory,
  };
}

/**
 * Returns all available expense categories (built-in + custom) except "Otros".
 */
export function getAllAssignableCategories(customCategories?: string[]): string[] {
  const builtIn = CATEGORY_ORDER.filter((c) => c !== "Otros");
  if (!customCategories || customCategories.length === 0) return builtIn;
  return [...builtIn, ...customCategories];
}

/**
 * Returns colors for all assignable categories (built-in + custom).
 */
export function getAllCategoryColors(customCategories?: string[], customCategoryColors?: Record<string, string>): Record<string, string> {
  const colors: Record<string, string> = { ...CATEGORY_COLORS };
  if (customCategories) {
    for (const cat of customCategories) {
      if (customCategoryColors && customCategoryColors[cat]) {
        colors[cat] = customCategoryColors[cat];
      } else {
        // Auto-assign a pastel color if missing
        colors[cat] = stringToColor(cat);
      }
    }
  }
  return colors;
}

/**
 * Returns just the built-in categories except "Otros" (backwards compat).
 */
export function getAssignableCategories(): ExpenseCategory[] {
  return CATEGORY_ORDER.filter((c) => c !== "Otros");
}

export type { ExpenseCategory };