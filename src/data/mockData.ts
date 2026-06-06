import { Expense, CategoryBudget, ExchangeRates, ExpenseCategory } from "../types";

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: "1",
    fecha: "2026-06-01",
    comercio: "AWS Cloud Services",
    monto_total: 1250000, // wait let's use standard numbers like 125.00
    monto_total_val: 125.50, // we will use typical float values like 125.50
    moneda: "USD",
    impuestos: 20.08,
    categoria: "Servicios",
    descripcion: "Suscripción mensual de servidores y base de datos en nube",
    created_at: "2026-06-01T10:00:00Z",
    elementos: [
      { nombre: "AWS EC2 Instances", precio: 80.50, cantidad: 1 },
      { nombre: "AWS Aurora Serverless RDS", precio: 45.00, cantidad: 1 }
    ],
    confirmacion: "Registro procesado: 125.50 USD en Servicios"
  },
  {
    id: "2",
    fecha: "2026-06-02",
    comercio: "Papelería e Impresiones San José",
    monto_total: 1850.00,
    moneda: "MXN",
    impuestos: 255.17,
    categoria: "Insumos",
    descripcion: "Compra de carpetas corporativas, hojas blancas y cartuchos de tinta",
    created_at: "2026-06-02T14:30:00Z",
    elementos: [
      { nombre: "Papel bond Carta 500h", precio: 150.00, cantidad: 4 },
      { nombre: "Cartucho Tinta HP Negro", precio: 1250.00, cantidad: 1 }
    ],
    confirmacion: "Registro procesado: 1850.00 MXN en Insumos"
  },
  {
    id: "3",
    fecha: "2026-06-03",
    comercio: "DHL Express",
    monto_total: 3420.00,
    moneda: "MXN",
    impuestos: 471.72,
    categoria: "Logística",
    descripcion: "Envío urgente de contratos firmados para cliente internacional",
    created_at: "2026-06-03T11:15:00Z",
    elementos: [
      { nombre: "Envío Express Internacional", precio: 3420.00, cantidad: 1 }
    ],
    confirmacion: "Registro procesado: 3420.00 MXN en Logística"
  },
  {
    id: "4",
    fecha: "2026-06-04",
    comercio: "Restaurante El Cardenal",
    monto_total: 120.00,
    moneda: "USD",
    impuestos: 18.00,
    categoria: "Viáticos",
    descripcion: "Cena de negocios con inversionistas clave del proyecto Beta",
    created_at: "2026-06-04T21:00:00Z",
    elementos: [
      { nombre: "Menú degustación insignia", precio: 50.00, cantidad: 2 },
      { nombre: "Servicios y propina", precio: 20.00, cantidad: 1 }
    ],
    confirmacion: "Registro procesado: 120.00 USD en Viáticos"
  },
  {
    id: "5",
    fecha: "2026-06-05",
    comercio: "Sueldos Tercera Semana Mayo",
    monto_total: 45000.00,
    moneda: "MXN",
    impuestos: 0,
    categoria: "Personal",
    descripcion: "Pago a contratistas y programadores externos temporales",
    created_at: "2026-06-05T09:00:00Z",
    elementos: [
      { nombre: "Pago Honororarios Freelancer Backend", precio: 25000.00, cantidad: 1 },
      { nombre: "Pago Honororarios UX Designer", precio: 20000.00, cantidad: 1 }
    ],
    confirmacion: "Registro procesado: 45000.00 MXN en Personal"
  }
].map(exp => ({
  ...exp,
  categoria: exp.categoria as ExpenseCategory,
  // Ajuste de monto_total para AWS
  monto_total: exp.id === "1" ? 125.50 : exp.monto_total
})) as Expense[];

export const INITIAL_BUDGET: CategoryBudget = {
  Insumos: 50000.00,
  Logística: 30000.00,
  Servicios: 40000.00,
  Viáticos: 25000.00,
  Personal: 120000.00,
  Otros: 15000.00
};

export const INITIAL_RATES: ExchangeRates = {
  USD: {
    USD: 1,
    MXN: 17.5,
    EUR: 0.92,
    ARS: 880,
    COP: 3900
  },
  MXN: {
    USD: 0.057,
    MXN: 1,
    EUR: 0.053,
    ARS: 50.2,
    COP: 222.8
  },
  EUR: {
    USD: 1.09,
    MXN: 19.0,
    EUR: 1,
    ARS: 956,
    COP: 4239
  }
};
