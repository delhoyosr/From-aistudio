/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  PlusCircle, History, BarChart3, Settings, ShieldCheck, Sparkles, CheckCircle, ArrowRight 
} from "lucide-react";

import { Expense, CategoryBudget, ExchangeRates } from "./types";
import { INITIAL_EXPENSES, INITIAL_BUDGET, INITIAL_RATES } from "./data/mockData";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SettingsPanel } from "./components/SettingsPanel";

const DEFAULT_CATEGORIES = ["Insumos", "Logística", "Servicios", "Viáticos", "Personal", "Otros"];

export default function App() {
  // App states with offline persistence (localStorage)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<CategoryBudget>(INITIAL_BUDGET);
  const [rates, setRates] = useState<ExchangeRates>(INITIAL_RATES);
  const [primaryCurrency, setPrimaryCurrency] = useState("MXN");
  const [activeTab, setActiveTab] = useState<"register" | "history" | "analytics" | "settings">("register");

  // Floating live visual success confirmation alert
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Hydrate states upon initial mount
  useEffect(() => {
    const cachedCategories = localStorage.getItem("asistente_categories");
    const cachedExpenses = localStorage.getItem("asistente_expenses");
    const cachedBudget = localStorage.getItem("asistente_budget");
    const cachedRates = localStorage.getItem("asistente_rates");
    const cachedCurrency = localStorage.getItem("asistente_currency");

    if (cachedCategories) {
      try {
        setCategories(JSON.parse(cachedCategories));
      } catch (e) {
        setCategories(DEFAULT_CATEGORIES);
      }
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }

    if (cachedExpenses) {
      try {
        setExpenses(JSON.parse(cachedExpenses));
      } catch (e) {
        setExpenses(INITIAL_EXPENSES);
      }
    } else {
      setExpenses(INITIAL_EXPENSES);
    }

    if (cachedBudget) {
      try {
        setBudget(JSON.parse(cachedBudget));
      } catch (e) {}
    }
    
    if (cachedRates) {
      try {
        setRates(JSON.parse(cachedRates));
      } catch (e) {}
    }

    if (cachedCurrency) {
      setPrimaryCurrency(cachedCurrency);
    }
  }, []);

  // Save changes to localStorage on any state modification
  const saveExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    localStorage.setItem("asistente_expenses", JSON.stringify(newExpenses));
  };

  const handleUpdateBudget = (newBudget: CategoryBudget) => {
    setBudget(newBudget);
    localStorage.setItem("asistente_budget", JSON.stringify(newBudget));
  };

  const handleUpdateRates = (newRates: ExchangeRates) => {
    setRates(newRates);
    localStorage.setItem("asistente_rates", JSON.stringify(newRates));
  };

  const handleUpdatePrimaryCurrency = (curr: string) => {
    setPrimaryCurrency(curr);
    localStorage.setItem("asistente_currency", curr);
  };

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem("asistente_categories", JSON.stringify(newCats));
  };

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      alert(`La categoría "${trimmed}" ya existe.`);
      return;
    }
    const updatedCats = [...categories, trimmed];
    saveCategories(updatedCats);
    
    // Initialize budget value
    const updatedBudget = { ...budget, [trimmed]: 1000 };
    handleUpdateBudget(updatedBudget);
    
    setSuccessNotification(`Categoría creada: "${trimmed}" con presupuesto base de 1,000.00 ${primaryCurrency}`);
    setTimeout(() => setSuccessNotification(null), 5000);
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return;
    if (categories.map(c => c.toLowerCase()).includes(trimmedNew.toLowerCase()) && trimmedNew.toLowerCase() !== oldName.toLowerCase()) {
      alert(`Ya existe otra categoría con el nombre "${trimmedNew}".`);
      return;
    }

    const updatedCats = categories.map(c => c === oldName ? trimmedNew : c);
    saveCategories(updatedCats);

    // Update budget keys
    const updatedBudget = { ...budget };
    if (oldName in updatedBudget) {
      updatedBudget[trimmedNew] = updatedBudget[oldName];
      delete updatedBudget[oldName];
    } else {
      updatedBudget[trimmedNew] = 1000;
    }
    handleUpdateBudget(updatedBudget);

    // Reclassify expenses matching oldName
    const updatedExpenses = expenses.map(exp => {
      if (exp.categoria === oldName) {
        return {
          ...exp,
          categoria: trimmedNew,
          confirmacion: exp.confirmacion?.replace(`en ${oldName}`, `en ${trimmedNew}`)
        };
      }
      return exp;
    });
    saveExpenses(updatedExpenses);

    setSuccessNotification(`Categoría renombrada de "${oldName}" a "${trimmedNew}"`);
    setTimeout(() => setSuccessNotification(null), 5550);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const updatedCats = categories.filter(c => c !== catToDelete);
    saveCategories(updatedCats);

    // Remove limit
    const updatedBudget = { ...budget };
    delete updatedBudget[catToDelete];
    handleUpdateBudget(updatedBudget);

    // Safety fallback
    const fallbackCategory = updatedCats.includes("Otros") ? "Otros" : (updatedCats[0] || "Todos");
    const updatedExpenses = expenses.map(exp => {
      if (exp.categoria === catToDelete) {
        return {
          ...exp,
          categoria: fallbackCategory,
          confirmacion: exp.confirmacion?.replace(`en ${catToDelete}`, `en ${fallbackCategory}`)
        };
      }
      return exp;
    });
    saveExpenses(updatedExpenses);

    setSuccessNotification(`Categoría "${catToDelete}" eliminada. Movimientos movidos a "${fallbackCategory}"`);
    setTimeout(() => setSuccessNotification(null), 6000);
  };

  // Add new expense & show exact REQUIRED notification format:
  // "Registro procesado: [Monto] en [Categoría]"
  const handleAddExpense = (newExpData: Omit<Expense, "id" | "created_at">) => {
    const newExpense: Expense = {
      ...newExpData,
      id: Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString()
    };

    const updatedExpenses = [newExpense, ...expenses];
    saveExpenses(updatedExpenses);

    // Affirmation toast with the exact sentence required
    // Format: "Registro procesado: [Monto] [Moneda] en [Categoría]"
    const customPromptConfirm = newExpData.confirmacion || `Registro procesado: ${newExpData.monto_total.toFixed(2)} ${newExpData.moneda} en ${newExpData.categoria}`;
    setSuccessNotification(customPromptConfirm);

    // Auto dismiss
    setTimeout(() => {
      setSuccessNotification(null);
    }, 6000);

    // Redirect to list history to let the user see the new transaction
    setActiveTab("history");
  };

  const handleDeleteExpense = (id: string) => {
    const remaining = expenses.filter(e => e.id !== id);
    saveExpenses(remaining);
    setSuccessNotification("Registro de gasto eliminado correctamente del histórico");
    setTimeout(() => {
      setSuccessNotification(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 pb-12 antialiased">
      
      {/* Top Banner Success Notification for integrity registration checks */}
      {successNotification && (
        <div id="toast-success-banner" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-bounce">
          <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 px-5 py-4 rounded-none shadow-2xl flex items-center gap-3.5">
            <div className="p-2 bg-emerald-500 text-slate-950 rounded-none shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold tracking-widest font-mono uppercase text-emerald-400 block">
                Operación de Analista Verificada
              </span>
              <p className="text-xs font-mono font-medium text-slate-100 mt-0.5 truncate">
                {successNotification}
              </p>
            </div>
            <button 
              onClick={() => setSuccessNotification(null)}
              className="text-slate-950 hover:bg-emerald-600 transition text-[10px] font-bold font-mono tracking-widest px-3 py-1 bg-emerald-500 rounded-none shrink-0 cursor-pointer uppercase"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modern Swiss Header Layout */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-slate-950 border border-slate-800 text-emerald-400 rounded-none text-[9px] font-mono font-bold tracking-widest uppercase">
                  FINANCIAL ANALYST SUITE
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-2xl font-mono font-bold text-white tracking-tight mt-1.5 uppercase">
                Asistente Financiero Ejecutivo
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Módulo avanzado de captura inteligente, auditoría de integridad e informes ejecutivos.
              </p>
            </div>

            {/* Currency conversion flag display */}
            <div className="flex items-center gap-4 text-xs font-mono bg-slate-950 border border-slate-800 rounded-none px-4 py-3 shadow-xl">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Estándar de Reporte</span>
                <span className="font-bold text-slate-250 flex items-center gap-1.5 mt-0.5">
                  ISO-CORE: <span className="text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-none font-bold">{primaryCurrency}</span>
                </span>
              </div>
              <span className="text-slate-800">|</span>
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Registros Totales</span>
                <span className="font-bold text-white mt-0.5 block">{expenses.length} Gastos</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Clean minimal visual Tabs bar */}
        <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none gap-1 mb-8" id="navigation-tabs">
          <button
            onClick={() => setActiveTab("register")}
            className={`py-3 px-5 text-xs font-bold font-mono uppercase tracking-widest border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer rounded-none ${
              activeTab === "register"
                ? "border-emerald-500 text-emerald-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20"
            }`}
          >
            <PlusCircle className="h-4 w-4 shrink-0" /> Registrar Gasto
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-5 text-xs font-bold font-mono uppercase tracking-widest border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer rounded-none ${
              activeTab === "history"
                ? "border-emerald-500 text-emerald-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20"
            }`}
          >
            <History className="h-4 w-4 shrink-0" /> Historial de Cuentas
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-3 px-5 text-xs font-bold font-mono uppercase tracking-widest border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer rounded-none ${
              activeTab === "analytics"
                ? "border-emerald-500 text-emerald-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" /> Análisis Ejecutivo & KPIs
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-5 text-xs font-bold font-mono uppercase tracking-widest border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer rounded-none ${
              activeTab === "settings"
                ? "border-emerald-500 text-emerald-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" /> Límites & Tipos de Cambio
          </button>
        </div>

        {/* Tab content rendering */}
        <div className="animate-fade-in">
          {activeTab === "register" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ExpenseForm onAddExpense={handleAddExpense} primaryCurrency={primaryCurrency} categories={categories} />
              </div>
              
              {/* Quick instructions panel */}
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-none border border-slate-800 p-5 space-y-4 shadow-xl">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-450 animate-pulse" /> Manual de Captura Inteligente
                  </h3>
                  <div className="space-y-4 text-xs leading-relaxed text-slate-350">
                    <div className="flex gap-3">
                      <span className="h-5 w-5 bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-extrabold text-emerald-400 shrink-0 text-[10px]">1</span>
                      <p className="font-sans">Puedes arrastrar una imagen del ticket (recibo o transferencia) para iniciar el escaneo inmediato por IA.</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <span className="h-5 w-5 bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-extrabold text-emerald-400 shrink-0 text-[10px]">2</span>
                      <p className="font-sans">
                        O escribe una descripción libre en lenguaje natural ejmo: 
                        <span className="italic block mt-2 bg-slate-950 border border-slate-850 p-2 font-mono text-[10px] text-emerald-300">
                          "Almuerzo corporativo con flete de logística por 1200 pesos MXN de DHL, incluye impuestos de $160"
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <span className="h-5 w-5 bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-extrabold text-emerald-400 shrink-0 text-[10px]">3</span>
                      <p className="font-sans">La IA extraerá e identificará la categoría contable correcta. Podrás auditar y rellenar cualquier campo antes de guardar para garantizar la integridad.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-none p-5 text-slate-350 border border-slate-850 space-y-3 shadow-xl">
                  <h4 className="text-xs font-semibold font-mono text-white uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-450" /> Tono Profesional Directo
                  </h4>
                  <p className="text-xs leading-relaxed font-sans">
                    Nuestro sistema audita cada entrada contra políticas presupuestarias, generando un comprobante contable certificado con la confirmación estructurada obligatoria para audición ejecutiva.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <ExpenseList 
              expenses={expenses} 
              onDeleteExpense={handleDeleteExpense} 
              primaryCurrency={primaryCurrency} 
              categories={categories}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard 
              expenses={expenses} 
              budget={budget} 
              rates={rates} 
              primaryCurrency={primaryCurrency} 
            />
          )}

          {activeTab === "settings" && (
            <SettingsPanel
              budget={budget}
              onUpdateBudget={handleUpdateBudget}
              rates={rates}
              onUpdateRates={handleUpdateRates}
              primaryCurrency={primaryCurrency}
              onUpdatePrimaryCurrency={handleUpdatePrimaryCurrency}
              categories={categories}
              onAddCategory={handleAddCategory}
              onRenameCategory={handleRenameCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
        </div>

      </main>

    </div>
  );
}
