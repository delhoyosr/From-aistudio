export type ExpenseCategory = string;

export interface ExpenseItem {
  nombre: string;
  precio?: number;
  cantidad?: number;
}

export interface Expense {
  id: string;
  fecha: string; // YYYY-MM-DD
  comercio: string;
  monto_total: number;
  moneda: string; // ISO Code eg MXN, USD
  impuestos: number;
  categoria: ExpenseCategory;
  descripcion: string;
  elementos?: ExpenseItem[];
  advertencias?: string[];
  confirmacion?: string;
  created_at: string;
  imageUrl?: string; // base64 or reference
}

export interface CategoryBudget {
  [categoryName: string]: number;
}

export interface ExchangeRates {
  [fromCurrency: string]: {
    [toCurrency: string]: number;
  };
}
