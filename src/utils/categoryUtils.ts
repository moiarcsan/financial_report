/**
 * Utilities for automatic expense categorization and category-based analysis.
 */

export type ExpenseCategory =
  | "Supermercado"
  | "Restaurantes"
  | "Transporte público"
  | "Combustible"
  | "Suscripciones digitales"
  | "Seguros"
  | "Salud / Farmacia"
  | "Ropa / Complementos"
  | "Hogar / Suministros"
  | "Alquiler / Hipoteca"
  | "Telefonía / Internet"
  | "Ocio / Cultura"
  | "Deporte / Gimnasio"
  | "Formación"
  | "Hijos / Guardería"
  | "Mascotas"
  | "Regalos"
  | "Viajes"
  | "Impuestos / Trámites"
  | "Nómina / Ingresos"
  | "Ahorro / Inversión"
  | "Transferencias entre cuentas"
  | "Cajero / Comisiones"
  | "Otros";

export const CATEGORY_ORDER: ExpenseCategory[] = [
  "Supermercado",
  "Restaurantes",
  "Transporte público",
  "Combustible",
  "Suscripciones digitales",
  "Seguros",
  "Salud / Farmacia",
  "Ropa / Complementos",
  "Hogar / Suministros",
  "Alquiler / Hipoteca",
  "Telefonía / Internet",
  "Ocio / Cultura",
  "Deporte / Gimnasio",
  "Formación",
  "Hijos / Guardería",
  "Mascotas",
  "Regalos",
  "Viajes",
  "Impuestos / Trámites",
  "Cajero / Comisiones",
  "Nómina / Ingresos",
  "Ahorro / Inversión",
  "Transferencias entre cuentas",
  "Otros",
];

export interface CategoryColorMap {
  [key: string]: string;
}

export interface CategorySummary {
  category: ExpenseCategory;
  totalCents: number;
  percentage: number;
  color: string;
  movementCount: number;
}

/**
 * Color palette for each category.
 */
export const CATEGORY_COLORS: CategoryColorMap = {
  "Supermercado": "#86efac",
  "Restaurantes": "#fed7aa",
  "Transporte público": "#93c5fd",
  "Combustible": "#c4b5fd",
  "Suscripciones digitales": "#f0abfc",
  "Seguros": "#fda4af",
  "Salud / Farmacia": "#fca5a5",
  "Ropa / Complementos": "#5eead4",
  "Hogar / Suministros": "#fdba74",
  "Alquiler / Hipoteca": "#d8b4fe",
  "Telefonía / Internet": "#67e8f9",
  "Ocio / Cultura": "#fde047",
  "Deporte / Gimnasio": "#86efac",
  "Formación": "#7dd3fc",
  "Hijos / Guardería": "#fdba74",
  "Mascotas": "#bef264",
  "Regalos": "#f9a8d4",
  "Viajes": "#99f6e4",
  "Impuestos / Trámites": "#cbd5e1",
  "Cajero / Comisiones": "#e2e8f0",
  "Nómina / Ingresos": "#86efac",
  "Ahorro / Inversión": "#93c5fd",
  "Transferencias entre cuentas": "#e2e8f0",
  "Otros": "#e2e8f0",
};

/**
 * Keywords that indicate a balance transfer between accounts.
 */
const BALANCE_TRANSFER_KEYWORDS = [
  "transferencia",
  "traspaso",
  "transfer",
  "ingreso por transferencia",
  "retirada por transferencia",
  "transferencia a cuenta",
  "transferencia desde",
  "movimiento interno",
  "traspaso de fondos",
  "traspaso entre cuentas",
  "traspaso a",
  "traspaso desde",
];

/**
 * Checks if a concept represents a balance transfer between accounts.
 */
export function isBalanceTransfer(concept: string): boolean {
  const normalized = concept.toLowerCase().trim();
  return BALANCE_TRANSFER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/**
 * Category name used for transfers between own accounts.
 */
export const TRANSFER_CATEGORY = "Transferencias entre cuentas";

/**
 * Checks if a category represents a balance transfer between accounts.
 * Accepts both the built-in name and common user variants.
 */
export function isTransferCategory(category: string): boolean {
  const normalized = category.toLowerCase().trim();
  return (
    normalized === TRANSFER_CATEGORY.toLowerCase() ||
    normalized === "traspaso entre cuentas" ||
    normalized === "transferencia entre cuentas" ||
    normalized === "traspasos entre cuentas" ||
    normalized.includes("traspaso entre cuenta") ||
    normalized.includes("transferencia entre cuenta")
  );
}

/**
 * Returns true if a movement should be treated as an internal transfer
 * (either by concept keywords or by its resolved category, including user rules).
 */
export function isInternalTransfer(
  concept: string,
  userRules?: Map<string, string>
): boolean {
  if (isBalanceTransfer(concept)) return true;
  const category = categorizeConcept(concept, userRules);
  return isTransferCategory(category);
}

/**
 * Checks if a concept represents an income (salary, payroll, etc.)
 */
export function isIncome(concept: string): boolean {
  const normalized = concept.toLowerCase().trim();
  return (
    normalized.includes("nómina") ||
    normalized.includes("nomina") ||
    normalized.includes("salario") ||
    normalized.includes("ingreso nomina") ||
    normalized.includes("ingreso nómina") ||
    normalized.includes("abono nomina") ||
    normalized.includes("abono nómina") ||
    normalized.includes("pago delegado") ||
    normalized.includes("prestacion") ||
    normalized.includes("prestación") ||
    normalized.includes("pension") ||
    normalized.includes("pensión")
  );
}

/**
 * Checks if a concept represents a saving/investment movement.
 */
export function isSavingOrInvestment(concept: string): boolean {
  const normalized = concept.toLowerCase().trim();
  return (
    normalized.includes("ahorro") ||
    normalized.includes("inversion") ||
    normalized.includes("inversión") ||
    normalized.includes("deposito") ||
    normalized.includes("depósito") ||
    normalized.includes("plan de pensiones") ||
    normalized.includes("fondo inversion") ||
    normalized.includes("fondo de inversión") ||
    normalized.includes("myinvestor") ||
    normalized.includes("indexa") ||
    normalized.includes("trade republic") ||
    normalized.includes("intereses") ||
    normalized.includes("dividendo")
  );
}

/**
 * Keyword-to-category mapping — comprehensive list for Spain.
 */
const KEYWORD_CATEGORIES: Array<{ keywords: string[]; category: ExpenseCategory }> = [
  // ── SUPERMERCADO ──────────────────────────────────────────────
  {
    keywords: [
      "mercadona", "lidl", "carrefour", "dia", "día", "eroski", "consum", "bonpreu",
      "bonÀrea", "bonarea", "alcampo", "sánchez romero", "covirán", "coviran",
      "masymas", "family cash", "el corte inglés", "supercor", "hipercor",
      "aldi", "alimerka", "gadis", "froiz", "plusfresc", "caprabo", "sorli discau",
      "condis", "suma", "supersano", "super", "supermercado", "hiper", "hipermercado",
      "ultramarinos", "alimentación", "alimentacion", "colmado", "fruteria", "frutería",
      "carnicería", "carniceria", "pescadería", "pescaderia", "panadería", "panaderia",
      "herbolario", "dietético", "dietetico",
    ],
    category: "Supermercado",
  },
  // ── RESTAURANTES ──────────────────────────────────────────────
  {
    keywords: [
      "restaurante", "restaurant", "bar", "cafetería", "cafeteria", "café",
      "comida rápida", "comida rapida", "fast food", "hamburguesa", "hamburguesería",
      "burger", "mcdonald", "burger king", "kfc", "domino", "telepizza",
      "pizza", "pizzeria", "pizzería", "tapas", "sidrería", "sidreria",
      "asador", "parrilla", "marisquería", "marisqueria", "vips", "gindao",
      "foster hollywood", "tagliatella", "100 montaditos", "rodilla",
      "la sureña", "lizarran", "goiko", "taco bell", "subway",
      "sushi", "wok", "chino", "japonés", "coreano", "mexicano", "italiano",
      "food", "delivery", "glovo", "uber eats", "just eat", "pedidos ya",
      "starbucks", "dunkin", "krispy kreme",
    ],
    category: "Restaurantes",
  },
  // ── TRANSPORTE PÚBLICO ────────────────────────────────────────
  {
    keywords: [
      "metro", "tmb", "bus", "autobus", "autobús", "renfe", "cercanías", "cercanias",
      "ave", "tren", "tranvía", "tranvia", "tram", "taxi", "cabify", "uber",
      "blicky", "free now", "vtc", "autocar", "autocares", "alo", "alsa",
      "avanza", "monbus", "bicing", "bicimad", "bicicleta", "bici",
      "movilidad", "billete", "abono transporte", "tarjeta transporte",
      "consorcio", "emt", "metrobus",
    ],
    category: "Transporte público",
  },
  // ── COMBUSTIBLE ───────────────────────────────────────────────
  {
    keywords: [
      "gasolina", "gasoil", "diesel", "diesel", "gasoleo", "gasóleo", "carburante",
      "repsol", "cepsa", "bp", "galp", "petronor", "shell", "plenoil", "ballenoil",
      "petroprix", "bonarea energia", "estación servicio", "estacion servicio",
      "gasolinera", "gasolinera", "combustible",
    ],
    category: "Combustible",
  },
  // ── SUSCRIPCIONES DIGITALES ───────────────────────────────────
  {
    keywords: [
      "netflix", "spotify", "amazon prime", "disney+", "disney plus", "hbo",
      "hbo max", "max", "paramount+", "paramount plus", "sky", "sky tv",
      "movistar+", "orange tv", "atresplayer", "mi tele", "mi telefe",
      "youtube premium", "youtube music", "apple music", "apple tv",
      "apple one", "google one", "google drive", "icloud", "dropbox",
      "onedrive", "microsoft 365", "office 365", "adobe", "creative cloud",
      "figma", "notion", "todoist", "evernote", "midjourney", "chatgpt",
      "claude", "copilot", "github copilot", "openai", "patreon",
      "twitch", "kinda", "magis tv", "tidal", "deezer", "pocket casts",
      "suscripción", "suscripcion", "streaming", "suscripcion digital",
    ],
    category: "Suscripciones digitales",
  },
  // ── SEGUROS ───────────────────────────────────────────────────
  {
    keywords: [
      "seguro", "seguros", "mapfre", "mutua madrileña", "axa", "allianz",
      "generali", "reale", "plus ultra", "caser", "oca", "lnea directa",
      "linea directa", "direct seguros", "fiatchc", "mutua", "previsión",
      "prevision", "santalucía", "santalucia", "asefa", "helvetia",
      "catalana occidente", "segurcaixa", "caixa seguros", "aseguradora",
      "seguro coche", "seguro hogar", "seguro vida", "seguro salud",
      "seguro medico", "seguro médico",
    ],
    category: "Seguros",
  },
  // ── SALUD / FARMACIA ──────────────────────────────────────────
  {
    keywords: [
      "farmacia", "pharmacy", "parafarmacia", "parafarma", "medicamento",
      "medicina", "médico", "medico", "consulta", "dentista", "clinica dental",
      "clínica dental", "ortodoncia", "óptica", "optica", "gafas", "lentillas",
      "oftalmologo", "oftalmólogo", "fisioterapia", "psicólogo", "psicologo",
      "logopeda", "enfermería", "analisis clinicos", "andlisis clínicos",
      "hospital", "clínica", "clinica", "urgencias", "ambulatorio",
      "centro medico", "centro médico", "mutua", "seguro salud",
      "adventia", "sanitas", "asisa", "dkv", "adeslas",
      "froterapia", "terapia",
    ],
    category: "Salud / Farmacia",
  },
  // ── ROPA / COMPLEMENTOS ───────────────────────────────────────
  {
    keywords: [
      "zara", "hm", "h&m", "mango", "pull&bear", "pull and bear", "bershka",
      "stradivarius", "oysho", "intimissimi", "calzedonia", "tezenis",
      "united colors", "benetton", "decathlon", "sprinter", "forum sport",
      "jdsports", "j d sports", "jds", "foot locker", "adidas", "nike",
      "puma", "reebok", "new balance", "vans", "converse", "timberland",
      "geox", "camper", "merkal", "primark", "cortefiel", "springfield",
      "women's secret", "womens secret", "sfera", "lefties", "kiabi",
      "c&a", "c y a", "pepe jeans", "jack & jones", "tom tailor",
      "superdry", "guess", "calvin klein", "tommy hilfiger", "hackett",
      "masimo dutti", "massimo dutti", "carolina herrera", "ropa",
      "vestido", "zapatos", "zapatería", "zapateria", "complementos",
      "bolso", "accesorios", "bisuteria", "bisutería",
    ],
    category: "Ropa / Complementos",
  },
  // ── HOGAR / SUMINISTROS ───────────────────────────────────────
  {
    keywords: [
      "iberdrola", "endesa", "naturgy", "repsol gas", "totalenergies",
      "edp", "holaluz", "pepeenergy", "atlas energy", "enercoluz",
      "factor energia", "energía", "energia", "electricidad", "luz",
      "gas natural", "gas", "agua", "suministro", "canon agua",
      "abastecimiento", "alquiler", "comunidad", "comunidad de propietarios",
      "comunidad propietarios", "administrador finca", "derrama",
      "leroy merlin", "leroy m", "bricomart", "brico", "bricolaje",
      "ikea", "muebles", "mobiliario", "decoración", "decoracion",
      "electrodoméstico", "electrodomestico", "mediamarkt", "media markt",
      "el corte inglés hogar", "conforama", "tienda hogar", "casa",
      "jardineria", "jardinería", "plantas",
    ],
    category: "Hogar / Suministros",
  },
  // ── ALQUILER / HIPOTECA ───────────────────────────────────────
  {
    keywords: [
      "alquiler vivienda", "alquiler piso", "renta alquiler", "arrendamiento",
      "hipoteca", "cuota hipoteca", "cuota hipotecaria", "préstamo hipotecario",
      "prestamo hipotecario", "amortización hipoteca", "amortizacion hipoteca",
    ],
    category: "Alquiler / Hipoteca",
  },
  // ── TELEFONÍA / INTERNET ──────────────────────────────────────
  {
    keywords: [
      "movistar", "orange", "vodafone", "yoigo", "pepephone", "masmovil",
      "masmóvil", "golphone", "simyo", "tuenti", "digimobil", "digi movil",
      "digi", "lowi", "finetwork", "ouu", "lebril", "llama ya",
      "telefonía", "telefonia", "móvil", "movil", "tarifa móvil",
      "fibra", "internet fibra", "adsl", "telefono fijo", "teléfono fijo",
      "tarifa plana", "factura movil", "factura móvil",
    ],
    category: "Telefonía / Internet",
  },
  // ── OCIO / CULTURA ────────────────────────────────────────────
  {
    keywords: [
      "cine", "yelmocines", "yelmo", "cinepolis", "kinépolis", "kin polis",
      "cine na", "cines", "teatro", "concierto", "festival",
      "musica", "música", "discoteca", "pub", "club social",
      "libreria", "librería", "casa del libro", "casa libro", "fnac",
      "book", "ebook", "kindle", "audible", "juego", "videojuego",
      "playstation", "nintendo", "xbox", "steam", "epic games",
      "battle", "rockstar", "jugetería", "juguetería", "juguete",
      "ocio", "cultura", "museo", "museos", "exposición", "exposicion",
      "parque atracciones", "port aventura", "tibustabo", "gretty",
      "parque temático", "parque acuático", "zoo", "acuario",
      "bowling", "bolos", "karting", "escape room",
    ],
    category: "Ocio / Cultura",
  },
  // ── DEPORTE / GIMNASIO ────────────────────────────────────────
  {
    keywords: [
      "gimnasio", "gym", "fitness", "crossfit", "cross fit", "pilates",
      "yoga", "spa", "piscina", "natacion", "natación", "club deportivo",
      "polideportivo", "deporte", "tenis", "pádel", "padel", "squash",
      "golf", "running", "ciclismo", "escalada", "senderismo",
      "viva gym", "viva gim", "basic fit", "holmes place", "mcfit",
      "supera", "antella", "gouws", "synergym", "david lloyd",
      "ala delta", "metrofit",
    ],
    category: "Deporte / Gimnasio",
  },
  // ── FORMACIÓN ─────────────────────────────────────────────────
  {
    keywords: [
      "curso", "formación", "formacion", "máster", "master", "posgrado",
      "postgrado", "universidad", "colegio", "instituto", "escuela",
      "academia", "clase", "profesor", "tutor", "clases particulares",
      "idioma", "inglés", "ingles", "francés", "frances", "alemán", "aleman",
      "chino", "italiano", "portugués", "portugues",
      "udemy", "coursera", "edx", "domestika", "platzi", "codely",
      "udacity", "linkedin learning", "skillshare", "codecademy",
      "openwebinars", "udix", "unir", "uoc", "uned", "campus",
      "matrícula", "matricula", "inscripción", "inscripcion",
    ],
    category: "Formación",
  },
  // ── HIJOS / GUARDERÍA ─────────────────────────────────────────
  {
    keywords: [
      "guardería", "guarderia", "colegio", "comedor escolar", "extraescolar",
      "ludoteca", "campamento", "canguro", "niñera", "papis", "mamis",
      "cuota colegio", "matricula colegio", "material escolar",
      "ropa colegio", "libros texto", "papeleria", "papelería",
      "clases extraescolares", "actividades extraescolares",
    ],
    category: "Hijos / Guardería",
  },
  // ── MASCOTAS ──────────────────────────────────────────────────
  {
    keywords: [
      "mascota", "veterinario", "veterinaria", "pienso", "comida perro",
      "comida gato", "acana", "royal canin", "purina", "advance",
      "hill's", "hills", "zooplus", "pets", "tienda mascotas",
      "accesorios mascota", "arenero", "arena gato", "collares",
      "peluquería canina", "peluqueria canina", "clínica veterinaria",
      "clinica veterinaria", "vacunas mascota",
    ],
    category: "Mascotas",
  },
  // ── REGALOS ───────────────────────────────────────────────────
  {
    keywords: [
      "regalo", "regalos", "detalle", "cumpleaños", "aniversario",
      "san valentín", "san valentin", "navidad", "reyes",
      "felicitación", "felicitacion", "tarjeta regalo", "vale regalo",
      "cesta regalo", "flores", "ramo", "floristería", "floristeria",
      "interflora", "colvin",
    ],
    category: "Regalos",
  },
  // ── VIAJES ────────────────────────────────────────────────────
  {
    keywords: [
      "vuelo", "avión", "avion", "ryanair", "vueling", "iberia", "easyjet",
      "air europa", "air france", "lufthansa", "klm", "emirates",
      "hotel", "booking", "airbnb", "expedia", "travel", "viaje",
      "viajes", "vacaciones", "destino", "hostal", "resort",
      "reserva hotel", "tour", "excursión", "excursion", "visita guiada",
      "alquiler coche", "rent a car", "rentacar", "europcar", "avis",
      "hertz", "sixt", "carrefour viajes", "halcon viajes", "el corte inglés viajes",
      "logitravel", "traveltool", "barcelo", "melia",
    ],
    category: "Viajes",
  },
  // ── IMPUESTOS / TRÁMITES ─────────────────────────────────────
  {
    keywords: [
      "hacienda", "aeat", "agencia tributaria", "irpf", "iva",
      "impuesto", "multa", "sanción", "sancion", "tasa", "tributo",
      "padrón", "padron", "catastro", "registro civil", "dgt",
      "dirección general tráfico", "trafico", "tráfico",
      "cambio titular", "extranjería", "extranjeria", "visado",
      "pasaporte", "dni", "nie", "certificado", "notaría",
      "notaria", "registro", "registrador", "abogado", "procurador",
      "gestoría", "gestoria", "administrativo",
    ],
    category: "Impuestos / Trámites",
  },
  // ── CAJERO / COMISIONES ───────────────────────────────────────
  {
    keywords: [
      "cajero", "cajero automático", "comisión", "comision", "comisiones",
      "retención", "retencion", "mantenimiento cuenta", "cuota cuenta",
      "gastos cuenta", "intereses descubierto", "intereses demora",
      "comision mantenimiento", "comisión de mantenimiento",
    ],
    category: "Cajero / Comisiones",
  },
];

/**
 * Categorizes a single transaction concept into an expense category.
 * First checks user-defined rules (passed in), then keyword matching.
 * Returns "Otros" if no match found.
 */
export function categorizeConcept(
  concept: string,
  userRules?: Map<string, string>
): string {
  const normalized = concept.toLowerCase().trim();

  // 1) Check user-defined rules first (from localStorage)
  if (userRules) {
    for (const [keyword, category] of userRules.entries()) {
      if (normalized.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // 2) Balance transfers between accounts
  if (isBalanceTransfer(normalized)) return TRANSFER_CATEGORY;

  // 3) Check income
  if (isIncome(normalized)) return "Nómina / Ingresos";

  // 4) Check saving/investment
  if (isSavingOrInvestment(normalized)) return "Ahorro / Inversión";

  // 5) Keyword matching
  for (const { keywords, category } of KEYWORD_CATEGORIES) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }
  }

  return "Otros";
}

/**
 * Summarizes expenses by category for a list of movements.
 * Only movements with negative amounts (expenses) are included.
 * Balance transfers between accounts are excluded.
 *
 * @param movements - Array of movements with at least `concept` and `amount` fields
 * @param userRules - Optional user-defined keyword→category rules
 * @returns Array of CategorySummary objects sorted by totalCents descending
 */
export function summarizeExpensesByCategory(
  movements: Array<{ concept: string; amount: number }>,
  userRules?: Map<string, string>
): CategorySummary[] {
  const totals: Record<string, { totalCents: number; count: number }> = {};

  // Initialize all categories
  for (const cat of CATEGORY_ORDER) {
    totals[cat] = { totalCents: 0, count: 0 };
  }

  let grandTotalCents = 0;

  for (const mov of movements) {
    const cents = Math.round(mov.amount * 100);
    if (cents >= 0) continue; // Only expenses (negative amounts)

    // Exclude balance transfers between accounts (by concept or resolved category)
    if (isInternalTransfer(mov.concept, userRules)) continue;

    const category = categorizeConcept(mov.concept, userRules);
    if (!totals[category]) {
      totals[category] = { totalCents: 0, count: 0 };
    }
    totals[category].totalCents += Math.abs(cents);
    totals[category].count += 1;
    grandTotalCents += Math.abs(cents);
  }

  const result: CategorySummary[] = Object.entries(totals)
    .map(([category, data]) => ({
      category: category as ExpenseCategory,
      totalCents: data.totalCents,
      percentage: grandTotalCents > 0 ? (data.totalCents / grandTotalCents) * 100 : 0,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS["Otros"],
      movementCount: data.count,
    }))
    .filter((item) => item.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  return result;
}

/**
 * Returns movements that fell into "Otros" for the user to review and categorize manually.
 */
export function getUncategorizedMovements(
  movements: Array<{ concept: string; amount: number }>,
  userRules?: Map<string, string>
): Array<{ concept: string; amount: number }> {
  return movements.filter((mov) => {
    const cents = Math.round(mov.amount * 100);
    if (cents >= 0) return false;
    if (isInternalTransfer(mov.concept, userRules)) return false;
    return categorizeConcept(mov.concept, userRules) === "Otros";
  });
}