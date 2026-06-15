// Permission catalog (module × action) and role presets.
// Authorization is data-driven: a role stores a list of permission keys.
// Owner roles hold the wildcard "*".

export type Permission = { key: string; module: string; label: string };

export const PERMISSIONS: Permission[] = [
  { key: "dashboard.view", module: "Dashboard", label: "View dashboard" },
  { key: "dashboard.view_financials", module: "Dashboard", label: "View revenue & profit figures" },

  { key: "sales.view", module: "Sales", label: "View sales records" },
  { key: "sales.create", module: "Sales", label: "Create sales records" },
  { key: "sales.edit", module: "Sales", label: "Edit sales records" },
  { key: "sales.delete", module: "Sales", label: "Void/delete sales records" },
  { key: "sales.export", module: "Sales", label: "Export sales records" },

  { key: "income.view", module: "Income", label: "View income records" },
  { key: "income.create", module: "Income", label: "Create income records" },
  { key: "income.edit", module: "Income", label: "Edit income records" },
  { key: "income.delete", module: "Income", label: "Void/delete income records" },

  { key: "expenses.view", module: "Expenses", label: "View expenses" },
  { key: "expenses.create", module: "Expenses", label: "Create expenses" },
  { key: "expenses.edit", module: "Expenses", label: "Edit expenses" },
  { key: "expenses.delete", module: "Expenses", label: "Void/delete expenses" },
  { key: "expenses.approve", module: "Expenses", label: "Approve expenses" },

  { key: "stock.view", module: "Stock", label: "View stock" },
  { key: "stock.manage_products", module: "Stock", label: "Manage products" },
  { key: "stock.movement", module: "Stock", label: "Record stock in/out" },
  { key: "stock.adjust", module: "Stock", label: "Adjust stock" },

  { key: "people.view", module: "People", label: "View customers/suppliers" },
  { key: "people.manage", module: "People", label: "Manage customers/suppliers" },

  { key: "reports.view", module: "Reports", label: "View reports" },
  { key: "reports.view_profit", module: "Reports", label: "View profit reports" },
  { key: "reports.export", module: "Reports", label: "Export reports" },

  { key: "users.view", module: "Users", label: "View users & roles" },
  { key: "users.manage", module: "Users", label: "Invite users & manage roles" },

  { key: "settings.view", module: "Settings", label: "View business settings" },
  { key: "settings.manage", module: "Settings", label: "Manage business settings & theme" },

  { key: "billing.view", module: "Billing", label: "View subscription" },
  { key: "billing.manage", module: "Billing", label: "Pay & manage subscription" },

  { key: "customization.view", module: "Customization", label: "View customization requests" },
  { key: "customization.create", module: "Customization", label: "Submit customization requests" },

  { key: "audit.view", module: "Audit", label: "View audit logs" },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// System role presets (seeded per tenant on creation).
export const ROLE_PRESETS: Record<
  string,
  { name: string; description: string; permissions: string[] }
> = {
  owner: {
    name: "Business Owner",
    description: "Full control of the business workspace.",
    permissions: ["*"],
  },
  admin: {
    name: "Business Admin",
    description: "Manage operations, users and records (no ownership transfer).",
    permissions: ALL_PERMISSION_KEYS,
  },
  manager: {
    name: "Manager",
    description: "Oversee daily records, stock, people and reports.",
    permissions: [
      "dashboard.view",
      "dashboard.view_financials",
      "sales.view",
      "sales.create",
      "sales.edit",
      "sales.export",
      "income.view",
      "income.create",
      "income.edit",
      "expenses.view",
      "expenses.create",
      "expenses.edit",
      "expenses.approve",
      "stock.view",
      "stock.manage_products",
      "stock.movement",
      "stock.adjust",
      "people.view",
      "people.manage",
      "reports.view",
      "reports.view_profit",
      "reports.export",
      "customization.view",
      "customization.create",
    ],
  },
  accountant: {
    name: "Accountant",
    description: "Manage financial records, reports and exports.",
    permissions: [
      "dashboard.view",
      "dashboard.view_financials",
      "sales.view",
      "sales.create",
      "sales.edit",
      "sales.export",
      "income.view",
      "income.create",
      "income.edit",
      "income.delete",
      "expenses.view",
      "expenses.create",
      "expenses.edit",
      "expenses.approve",
      "stock.view",
      "people.view",
      "reports.view",
      "reports.view_profit",
      "reports.export",
      "billing.view",
    ],
  },
  stock_officer: {
    name: "Stock Officer",
    description: "Manage products and stock movements.",
    permissions: [
      "dashboard.view",
      "stock.view",
      "stock.manage_products",
      "stock.movement",
      "stock.adjust",
      "reports.view",
      "people.view",
    ],
  },
  records_clerk: {
    name: "Records Clerk",
    description: "Enter daily sales, income and expense records.",
    permissions: [
      "dashboard.view",
      "sales.view",
      "sales.create",
      "income.create",
      "expenses.create",
      "stock.view",
    ],
  },
  viewer: {
    name: "Viewer / Auditor",
    description: "Read-only access to selected reports and records.",
    permissions: ["dashboard.view", "sales.view", "reports.view", "people.view"],
  },
};

export function parsePermissions(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function hasPermission(perms: string[], key: string): boolean {
  return perms.includes("*") || perms.includes(key);
}

export function hasAnyPermission(perms: string[], keys: string[]): boolean {
  if (perms.includes("*")) return true;
  return keys.some((k) => perms.includes(k));
}
