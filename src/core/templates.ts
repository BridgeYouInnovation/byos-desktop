// Business-type templates. Selected at onboarding; preconfigure labels,
// default modules, categories and dashboard focus. Core nouns stay constant;
// only display labels & defaults vary.

// Industry terminology. Drives the sidebar nav, page titles and quick actions so
// each business type reads like its real-world management system (a Retail shop
// talks about "Inventory", a Restaurant about a "Menu", a Church about "Offerings").
// Optional per template; getLexicon() fills any gaps with sensible generic defaults.
export type Lexicon = {
  recordsNav: string; // sidebar + records page title (e.g. "Sales", "Orders", "Giving")
  recordsSubtitle: string;
  saleNoun: string; // singular for the sale kind, e.g. "Record a sale" / "order"
  incomeLabel: string; // display label for the income kind (tabs/badges), e.g. "Income", "Offerings", "Fees"
  incomeNoun: string; // singular for the income kind, e.g. "Record an offering"
  inflowLabel: string; // dashboard money-in label, e.g. "Sales", "Giving", "Fees"
  stockNav: string; // sidebar + stock page title (e.g. "Inventory", "Ingredients", "Medicines")
  stockSubtitle: string;
  productNoun: string; // singular (e.g. "Product", "Menu item", "Medicine")
  productsNoun: string; // plural (e.g. "Products", "Menu", "Medicines")
  peopleNav: string; // sidebar + people page title (e.g. "Customers & Suppliers")
  suppliersOnly: boolean; // when true, the People module manages suppliers only
  categoryLabel: string | null; // product category field label (e.g. "Menu section"); null hides it
  tracksStock: boolean; // whether this business tracks stock at all (false hides all stock UI, e.g. a restaurant menu)
  peopleHaveBalances: boolean; // whether the primary people (members/customers) carry money balances (false hides opening balance, e.g. church members)
  salesTrackCustomer?: boolean; // when true, the sale form captures a customer + payment status (B2B credit sales, e.g. wholesaler/depot)
};

export type BusinessTemplate = {
  key: string;
  name: string;
  description: string;
  icon: string;
  peopleLabel: string; // Customers | Members | Students | Patients
  salesLabel: string; // Sales | Offerings | Fees ...
  defaultModules: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  productCategories: string[];
  dashboardFocus: string[];
  lexicon?: Lexicon; // industry terminology override (optional; see getLexicon)
};

export const ALL_MODULES = [
  "dashboard",
  "sales",
  "income",
  "expenses",
  "stock",
  "people",
  "reports",
  "documents",
  "customization",
] as const;

const COMMON_EXPENSES = [
  "Rent",
  "Salaries",
  "Transport",
  "Electricity",
  "Internet",
  "Repairs",
  "Taxes",
  "Miscellaneous",
];

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    key: "retail",
    name: "Retail Shop",
    description: "Daily sales, inventory, expenses and profit for shops & mini-markets.",
    icon: "store",
    peopleLabel: "Customers",
    salesLabel: "Sales",
    defaultModules: ["dashboard", "sales", "expenses", "stock", "people", "reports"],
    incomeCategories: ["Product sales", "Service income", "Other income"],
    expenseCategories: ["Stock purchase", ...COMMON_EXPENSES],
    productCategories: [
      "Groceries",
      "Beverages",
      "Snacks",
      "Household",
      "Personal care",
      "Other",
    ],
    dashboardFocus: ["today_sales", "month_revenue", "expenses", "low_stock", "stock_value"],
    lexicon: {
      recordsNav: "Sales",
      recordsSubtitle: "Every sale, expense and transfer recorded in your shop.",
      saleNoun: "sale",
      incomeLabel: "Income",
      incomeNoun: "income",
      inflowLabel: "Sales",
      stockNav: "Inventory",
      stockSubtitle: "Stock levels, restocks, valuation and low-stock alerts.",
      productNoun: "Product",
      productsNoun: "Products",
      peopleNav: "Suppliers",
      suppliersOnly: true,
      categoryLabel: null,
      tracksStock: true,
      peopleHaveBalances: true,
    },
  },
  {
    key: "restaurant",
    name: "Restaurant",
    description: "Menu, orders, ingredient purchases and daily expenses for restaurants & eateries.",
    icon: "utensils",
    peopleLabel: "Customers",
    salesLabel: "Order",
    defaultModules: ["dashboard", "sales", "expenses", "stock", "people", "reports"],
    incomeCategories: ["Food sales", "Drink sales", "Other income"],
    expenseCategories: ["Ingredients", "Drinks stock", "Gas", "Spoilage", ...COMMON_EXPENSES],
    productCategories: ["Starters", "Main dishes", "Sides", "Drinks", "Desserts", "Specials"],
    dashboardFocus: ["today_sales", "month_revenue", "expenses", "low_stock"],
    lexicon: {
      recordsNav: "Orders",
      recordsSubtitle: "Every order and expense recorded in your restaurant.",
      saleNoun: "order",
      incomeLabel: "Income",
      incomeNoun: "income",
      inflowLabel: "Sales",
      stockNav: "Menu",
      stockSubtitle: "Your menu items, sections and prices.",
      productNoun: "Menu item",
      productsNoun: "Menu items",
      peopleNav: "Suppliers",
      suppliersOnly: true,
      categoryLabel: null,
      tracksStock: false,
      peopleHaveBalances: true,
    },
  },
  {
    key: "church",
    name: "Church",
    description: "Members, giving (offerings, tithes, donations, funds) and church expenses.",
    icon: "church",
    peopleLabel: "Members",
    salesLabel: "Offerings",
    defaultModules: ["dashboard", "income", "expenses", "people", "reports", "documents"],
    incomeCategories: ["Offerings", "Tithes", "Donations", "Building fund", "Missions", "Special events"],
    expenseCategories: ["Charity & welfare", "Programs & events", "Building & maintenance", "Missions", ...COMMON_EXPENSES],
    productCategories: [],
    dashboardFocus: ["month_income", "expenses", "balances"],
    lexicon: {
      recordsNav: "Records",
      recordsSubtitle: "Offerings, tithes, donations and expenses recorded for your church.",
      saleNoun: "offering",
      incomeLabel: "Offerings",
      incomeNoun: "offering",
      inflowLabel: "Giving",
      stockNav: "Items",
      stockSubtitle: "Items your church keeps.",
      productNoun: "Item",
      productsNoun: "Items",
      peopleNav: "Members",
      suppliersOnly: false,
      categoryLabel: null,
      tracksStock: false,
      peopleHaveBalances: false,
    },
  },
  {
    key: "school",
    name: "School",
    description: "Students, fee payments (tuition, registration, exams) and school expenses.",
    icon: "graduation-cap",
    peopleLabel: "Students",
    salesLabel: "Fees",
    defaultModules: ["dashboard", "income", "expenses", "people", "reports", "documents"],
    incomeCategories: ["Tuition", "Registration", "Exam fees", "Books & uniforms", "Other fees"],
    expenseCategories: ["Teaching materials", "Exam materials", "Maintenance", ...COMMON_EXPENSES],
    productCategories: [],
    dashboardFocus: ["fees_paid", "outstanding", "expenses"],
    lexicon: {
      recordsNav: "Records",
      recordsSubtitle: "Fee payments and expenses recorded for your school.",
      saleNoun: "fee",
      incomeLabel: "Fees",
      incomeNoun: "payment",
      inflowLabel: "Fees",
      stockNav: "Items",
      stockSubtitle: "Items your school keeps.",
      productNoun: "Item",
      productsNoun: "Items",
      peopleNav: "Students",
      suppliersOnly: false,
      categoryLabel: null,
      tracksStock: false,
      peopleHaveBalances: true,
    },
  },
  {
    key: "wholesaler",
    name: "Wholesaler",
    description: "Bulk stock, supplier purchases, customer credit balances and sales.",
    icon: "boxes",
    peopleLabel: "Customers",
    salesLabel: "Sales",
    defaultModules: ["dashboard", "sales", "expenses", "stock", "people", "reports"],
    incomeCategories: ["Bulk sales", "Other income"],
    expenseCategories: ["Stock purchases", "Warehouse rent", "Loading & transport", "Damages", ...COMMON_EXPENSES],
    productCategories: ["Cartons", "Bags", "Sacks", "Bulk", "Units"],
    dashboardFocus: ["stock_value", "month_revenue", "low_stock", "product_movement"],
    lexicon: {
      recordsNav: "Sales",
      recordsSubtitle: "Bulk sales (cash or credit) and expenses for your business.",
      saleNoun: "sale",
      incomeLabel: "Income",
      incomeNoun: "income",
      inflowLabel: "Sales",
      stockNav: "Inventory",
      stockSubtitle: "Bulk stock, cartons and bags with levels and low-stock alerts.",
      productNoun: "Product",
      productsNoun: "Products",
      peopleNav: "Customers & Suppliers",
      suppliersOnly: false,
      categoryLabel: "Category",
      tracksStock: true,
      peopleHaveBalances: true,
      salesTrackCustomer: true,
    },
  },
  {
    key: "clinic",
    name: "Clinic",
    description: "Patients, service income (consultations, lab), pharmacy sales, medicine stock and expenses.",
    icon: "stethoscope",
    peopleLabel: "Patients",
    salesLabel: "Sales",
    defaultModules: ["dashboard", "income", "sales", "expenses", "stock", "people", "reports"],
    incomeCategories: ["Consultation", "Laboratory", "Procedure", "Admission", "Other services"],
    expenseCategories: ["Drug purchases", "Medical supplies", "Equipment", ...COMMON_EXPENSES],
    productCategories: ["Medicines", "Supplies", "Equipment"],
    dashboardFocus: ["today_income", "month_revenue", "low_stock", "expenses"],
    lexicon: {
      recordsNav: "Records",
      recordsSubtitle: "Service income, pharmacy sales and expenses recorded for your clinic.",
      saleNoun: "sale",
      incomeLabel: "Services",
      incomeNoun: "service",
      inflowLabel: "Revenue",
      stockNav: "Pharmacy",
      stockSubtitle: "Medicines and supplies in stock, with levels and low-stock alerts.",
      productNoun: "Medicine",
      productsNoun: "Medicines",
      peopleNav: "Patients",
      suppliersOnly: false,
      categoryLabel: "Category",
      tracksStock: true,
      peopleHaveBalances: true,
    },
  },
  {
    key: "bar",
    name: "Bar",
    description: "Drink sales, bottle & crate stock, daily cash close and supplier purchases.",
    icon: "wine",
    peopleLabel: "Customers",
    salesLabel: "Sales",
    defaultModules: ["dashboard", "sales", "expenses", "stock", "people", "reports"],
    incomeCategories: ["Drink sales", "Other income"],
    expenseCategories: ["Drinks stock", "Crates & bottles", "Spoilage", ...COMMON_EXPENSES],
    productCategories: ["Beer", "Spirits", "Wine", "Soft drinks", "Water"],
    dashboardFocus: ["today_sales", "stock_value", "low_stock", "expenses"],
    lexicon: {
      recordsNav: "Sales",
      recordsSubtitle: "Every drink sale and expense recorded in your bar.",
      saleNoun: "sale",
      incomeLabel: "Income",
      incomeNoun: "income",
      inflowLabel: "Sales",
      stockNav: "Stock",
      stockSubtitle: "Drinks in stock — bottles, crates and low-stock alerts.",
      productNoun: "Drink",
      productsNoun: "Drinks",
      peopleNav: "Suppliers",
      suppliersOnly: true,
      categoryLabel: "Category",
      tracksStock: true,
      peopleHaveBalances: true,
    },
  },
  {
    key: "depot",
    name: "Depot",
    description: "Stock in/out, supplier purchases, customer balances and bulk sales.",
    icon: "warehouse",
    peopleLabel: "Customers",
    salesLabel: "Sales",
    defaultModules: ["dashboard", "sales", "expenses", "stock", "people", "reports"],
    incomeCategories: ["Sales", "Other income"],
    expenseCategories: ["Purchases", "Loading", "Transport", "Damages", ...COMMON_EXPENSES],
    productCategories: ["Cartons", "Crates", "Bags", "Pallets"],
    dashboardFocus: ["stock_value", "today_sales", "product_movement", "low_stock"],
    lexicon: {
      recordsNav: "Sales",
      recordsSubtitle: "Bulk sales (cash or credit) and expenses for your depot.",
      saleNoun: "sale",
      incomeLabel: "Income",
      incomeNoun: "income",
      inflowLabel: "Sales",
      stockNav: "Warehouse",
      stockSubtitle: "Depot stock in/out, levels and low-stock alerts.",
      productNoun: "Product",
      productsNoun: "Products",
      peopleNav: "Customers & Suppliers",
      suppliersOnly: false,
      categoryLabel: "Category",
      tracksStock: true,
      peopleHaveBalances: true,
      salesTrackCustomer: true,
    },
  },
];

export function getTemplate(key: string): BusinessTemplate {
  return BUSINESS_TEMPLATES.find((t) => t.key === key) ?? BUSINESS_TEMPLATES[0];
}

// Generic terminology used by any business type that hasn't defined its own
// lexicon yet. Keeps un-customized templates working exactly as before.
function defaultLexicon(t: BusinessTemplate): Lexicon {
  return {
    recordsNav: "Records",
    recordsSubtitle: "All sales, income, expenses and transfers.",
    saleNoun: t.salesLabel.toLowerCase(),
    incomeLabel: "Income",
    incomeNoun: "income",
    inflowLabel: "Sales",
    stockNav: "Stock",
    stockSubtitle: "Know what you have, what reduced, and when to restock.",
    productNoun: "Product",
    productsNoun: "Products",
    peopleNav: `${t.peopleLabel} & Suppliers`,
    suppliersOnly: false,
    categoryLabel: null,
    tracksStock: true,
    peopleHaveBalances: true,
    salesTrackCustomer: false,
  };
}

// French overrides for the business terminology (label fields only; flags are
// language-agnostic). salesLabel/peopleLabel are surfaced by getLexicon below.
type LexFr = Partial<Lexicon> & { salesLabel?: string; peopleLabel?: string };
const LEXICON_FR: Record<string, LexFr> = {
  retail: {
    recordsNav: "Ventes",
    recordsSubtitle: "Chaque vente, dépense et transfert enregistré dans votre boutique.",
    saleNoun: "vente",
    incomeLabel: "Revenus",
    incomeNoun: "revenu",
    inflowLabel: "Ventes",
    stockNav: "Inventaire",
    stockSubtitle: "Niveaux de stock, réassorts, valorisation et alertes de stock bas.",
    productNoun: "Produit",
    productsNoun: "Produits",
    peopleNav: "Fournisseurs",
    salesLabel: "Ventes",
    peopleLabel: "Clients",
  },
  restaurant: {
    recordsNav: "Commandes",
    recordsSubtitle: "Chaque commande et dépense enregistrée dans votre restaurant.",
    saleNoun: "commande",
    incomeLabel: "Revenus",
    incomeNoun: "revenu",
    inflowLabel: "Ventes",
    stockNav: "Menu",
    stockSubtitle: "Vos plats, sections et prix.",
    productNoun: "Plat",
    productsNoun: "Plats",
    peopleNav: "Fournisseurs",
    categoryLabel: "Section du menu",
    salesLabel: "Commande",
    peopleLabel: "Clients",
  },
  church: {
    recordsNav: "Registres",
    recordsSubtitle: "Offrandes, dîmes, dons et dépenses enregistrés pour votre église.",
    saleNoun: "offrande",
    incomeLabel: "Offrandes",
    incomeNoun: "offrande",
    inflowLabel: "Dons",
    stockNav: "Articles",
    stockSubtitle: "Les articles que votre église conserve.",
    productNoun: "Article",
    productsNoun: "Articles",
    peopleNav: "Membres",
    salesLabel: "Offrandes",
    peopleLabel: "Membres",
  },
  school: {
    recordsNav: "Registres",
    recordsSubtitle: "Paiements de frais et dépenses enregistrés pour votre école.",
    saleNoun: "frais",
    incomeLabel: "Frais",
    incomeNoun: "paiement",
    inflowLabel: "Frais",
    stockNav: "Articles",
    stockSubtitle: "Les articles que votre école conserve.",
    productNoun: "Article",
    productsNoun: "Articles",
    peopleNav: "Élèves",
    salesLabel: "Frais",
    peopleLabel: "Élèves",
  },
  wholesaler: {
    recordsNav: "Ventes",
    recordsSubtitle: "Ventes en gros (comptant ou crédit) et dépenses de votre entreprise.",
    saleNoun: "vente",
    incomeLabel: "Revenus",
    incomeNoun: "revenu",
    inflowLabel: "Ventes",
    stockNav: "Inventaire",
    stockSubtitle: "Stock en gros, cartons et sacs avec niveaux et alertes de stock bas.",
    productNoun: "Produit",
    productsNoun: "Produits",
    peopleNav: "Clients et fournisseurs",
    categoryLabel: "Catégorie",
    salesLabel: "Ventes",
    peopleLabel: "Clients",
  },
  clinic: {
    recordsNav: "Registres",
    recordsSubtitle: "Revenus des services, ventes de pharmacie et dépenses de votre clinique.",
    saleNoun: "vente",
    incomeLabel: "Services",
    incomeNoun: "service",
    inflowLabel: "Revenus",
    stockNav: "Pharmacie",
    stockSubtitle: "Médicaments et fournitures en stock, avec niveaux et alertes de stock bas.",
    productNoun: "Médicament",
    productsNoun: "Médicaments",
    peopleNav: "Patients",
    categoryLabel: "Catégorie",
    salesLabel: "Ventes",
    peopleLabel: "Patients",
  },
  bar: {
    recordsNav: "Ventes",
    recordsSubtitle: "Chaque vente de boisson et dépense enregistrée dans votre bar.",
    saleNoun: "vente",
    incomeLabel: "Revenus",
    incomeNoun: "revenu",
    inflowLabel: "Ventes",
    stockNav: "Stock",
    stockSubtitle: "Boissons en stock — bouteilles, casiers et alertes de stock bas.",
    productNoun: "Boisson",
    productsNoun: "Boissons",
    peopleNav: "Fournisseurs",
    categoryLabel: "Catégorie",
    salesLabel: "Ventes",
    peopleLabel: "Clients",
  },
  depot: {
    recordsNav: "Ventes",
    recordsSubtitle: "Ventes en gros (comptant ou crédit) et dépenses de votre dépôt.",
    saleNoun: "vente",
    incomeLabel: "Revenus",
    incomeNoun: "revenu",
    inflowLabel: "Ventes",
    stockNav: "Entrepôt",
    stockSubtitle: "Entrées/sorties de stock du dépôt, niveaux et alertes de stock bas.",
    productNoun: "Produit",
    productsNoun: "Produits",
    peopleNav: "Clients et fournisseurs",
    categoryLabel: "Catégorie",
    salesLabel: "Ventes",
    peopleLabel: "Clients",
  },
};

// Resolved industry terminology for a business type, in the requested language.
// Includes salesLabel + peopleLabel so pages get every business noun from here.
export function getLexicon(key: string, lang: "en" | "fr" = "en") {
  const t = getTemplate(key);
  const en = {
    ...defaultLexicon(t),
    ...(t.lexicon ?? {}),
    salesLabel: t.salesLabel,
    peopleLabel: t.peopleLabel,
  };
  return lang === "fr" ? { ...en, ...(LEXICON_FR[key] ?? {}) } : en;
}

// People label → contact type mapping
export function contactTypeForTemplate(key: string): string {
  switch (key) {
    case "church":
      return "member";
    case "school":
      return "student";
    case "clinic":
      return "patient";
    default:
      return "customer";
  }
}
