import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { CATEGORY_ORDER, CATEGORY_COLORS } from "../utils/categoryUtils";
import type { ExpenseCategory } from "../utils/categoryUtils";

const STORAGE_KEY = "user_category_rules";
const CUSTOM_CATEGORIES_KEY = "user_custom_categories";
const CUSTOM_CATEGORY_COLORS_KEY = "user_custom_category_colors";

// Pastel palette for auto-assigning colors to custom categories
const COLOR_PALETTE = [
  "#86efac", "#fed7aa", "#93c5fd", "#c4b5fd", "#f0abfc",
  "#fda4af", "#fca5a5", "#5eead4", "#f0abfc", "#d8b4fe",
  "#67e8f9", "#fde047", "#bef264", "#f9a8d4", "#99f6e4",
  "#86efac", "#fed7aa", "#93c5fd", "#c4b5fd", "#f0abfc",
];

// ── Custom categories persistence ──────────────────────────────

/**
 * Loads user-created custom categories from localStorage.
 */
function loadCustomCategories(): string[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as string[];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Saves user-created custom categories to localStorage.
 */
function saveCustomCategories(categories: string[]): void {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    console.warn("No se pudieron guardar las categorías personalizadas.");
  }
}

// ── Custom category colors persistence ─────────────────────────

function loadCustomCategoryColors(): Record<string, string> {
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORY_COLORS_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveCustomCategoryColors(colors: Record<string, string>): void {
  try {
    localStorage.setItem(CUSTOM_CATEGORY_COLORS_KEY, JSON.stringify(colors));
  } catch {
    console.warn("No se pudieron guardar los colores de categorías personalizadas.");
  }
}

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
 * Fetches category rules from Supabase for a given user.
 */
async function fetchRulesFromSupabase(userId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("category_rules")
    .select("keyword, category")
    .eq("user_id", userId);

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
    console.warn("Error al sincronizar reglas con Supabase:", error.message);
  }
}

/**
 * Hook that manages user-defined keyword→category rules,
 * with optional Supabase sync for cross-device synchronization.
 *
 * Rules are automatically loaded from localStorage and Supabase,
 * and saved to both when changed.
 */
export function useUserCategoryRules(userId?: string) {
  const [rules, setRules] = useState<Map<string, string>>(loadRules);
  const [customCategories, setCustomCategories] = useState<string[]>(loadCustomCategories);
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>(loadCustomCategoryColors);
  const isMountedRef = useRef(false);

  // Persist whenever rules change (localStorage)
  useEffect(() => {
    if (isMountedRef.current) {
      saveRules(rules);
    }
  }, [rules]);

  // Persist whenever custom categories change (localStorage)
  useEffect(() => {
    if (isMountedRef.current) {
      saveCustomCategories(customCategories);
    }
  }, [customCategories]);

  // Persist whenever custom category colors change (localStorage)
  useEffect(() => {
    if (isMountedRef.current) {
      saveCustomCategoryColors(customCategoryColors);
    }
  }, [customCategoryColors]);

  // ── Sync with Supabase on mount (if userId provided) ────────
  useEffect(() => {
    if (!userId) return;

    const syncWithSupabase = async () => {
      const supabaseRules = await fetchRulesFromSupabase(userId);

      // If Supabase has rules and local is empty, use Supabase
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
    };

    syncWithSupabase();
    isMountedRef.current = true;
  }, [userId]);

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

    // Sync to Supabase if userId is available
    if (userId) {
      const currentRules = rules;
      syncRulesToSupabase(userId, currentRules);
    }
  }, [userId, rules]);

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

      // Sync to Supabase if userId is available
      if (userId) {
        const currentRules = rules;
        syncRulesToSupabase(userId, currentRules);
      }
    },
    [userId, rules]
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

    // Sync to Supabase if userId is available
    if (userId) {
      const currentRules = rules;
      syncRulesToSupabase(userId, currentRules);
    }
  }, [userId, rules]);

  /**
   * Clears all user-defined rules.
   */
  const clearRules = useCallback(() => {
    setRules(new Map());

    // Sync to Supabase if userId is available
    if (userId) {
      syncRulesToSupabase(userId, new Map());
    }
  }, [userId]);

  /**
   * Returns the number of rules stored.
   */
  const ruleCount = rules.size;

  // ── Custom category operations ────────────────────────────────

  /**
   * Adds a new custom category. Returns false if it already exists.
   */
  const addCustomCategory = useCallback((name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    // Check duplicates against built-in + existing custom
    const allExisting = getAllAssignableCategories(customCategories);
    if (allExisting.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }

    setCustomCategories((prev) => [...prev, trimmed]);
    // Auto-assign a color based on the category name
    setCustomCategoryColors((prev) => ({
      ...prev,
      [trimmed]: stringToColor(trimmed),
    }));
    return true;
  }, [customCategories]);

  /**
   * Removes a custom category by name.
   */
  const removeCustomCategory = useCallback((name: string) => {
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
  }, []);

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