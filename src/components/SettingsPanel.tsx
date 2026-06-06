import React, { useState } from "react";
import { 
  Sliders, Coins, Check, Receipt, Target, Landmark, AlertCircle, X 
} from "lucide-react";
import { CategoryBudget, ExchangeRates } from "../types";

interface SettingsPanelProps {
  budget: CategoryBudget;
  onUpdateBudget: (budget: CategoryBudget) => void;
  rates: ExchangeRates;
  onUpdateRates: (rates: ExchangeRates) => void;
  primaryCurrency: string;
  onUpdatePrimaryCurrency: (curr: string) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
}

export function SettingsPanel({
  budget,
  onUpdateBudget,
  rates,
  onUpdateRates,
  primaryCurrency,
  onUpdatePrimaryCurrency,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory
}: SettingsPanelProps) {
  // Dynamic local state of budget limits synced automatically
  const [localBudget, setLocalBudget] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    categories.forEach(cat => {
      initial[cat] = budget[cat] !== undefined ? budget[cat] : 1000;
    });
    return initial;
  });

  React.useEffect(() => {
    setLocalBudget(prev => {
      const updated = { ...prev };
      categories.forEach(cat => {
        if (updated[cat] === undefined) {
          updated[cat] = budget[cat] !== undefined ? budget[cat] : 1000;
        } else if (budget[cat] !== undefined) {
          updated[cat] = budget[cat];
        }
      });
      // purge missing categories
      Object.keys(updated).forEach(k => {
        if (!categories.includes(k)) {
          delete updated[k];
        }
      });
      return updated;
    });
  }, [categories, budget]);

  // Local states for Category management
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryAlertMessage, setCategoryAlertMessage] = useState<string | null>(null);

  const triggerDeleteCategory = (cat: string) => {
    if (categories.length <= 1) {
      setCategoryAlertMessage("Operación denegada: Debe conservar por lo menos una categoría de gasto activa.");
      return;
    }
    setCategoryToDelete(cat);
  };

  const handleAddCat = () => {
    const val = newCategoryName.trim();
    if (!val) return;
    onAddCategory(val);
    setNewCategoryName("");
  };

  const handleSaveRename = (oldName: string) => {
    const val = editValue.trim();
    if (!val || val === oldName) {
      setEditingCategory(null);
      return;
    }
    onRenameCategory(oldName, val);
    setEditingCategory(null);
  };

  // Success Indicators
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [ratesSuccess, setRatesSuccess] = useState(false);

  // Exchange Rates Editable state (Focus on USD conversions)
  const [usdToMxn, setUsdToMxn] = useState(rates.USD?.MXN || 17.5);
  const [usdToEur, setUsdToEur] = useState(rates.USD?.EUR || 0.92);
  const [usdToArs, setUsdToArs] = useState(rates.USD?.ARS || 880);
  const [usdToCop, setUsdToCop] = useState(rates.USD?.COP || 3900);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBudget(localBudget);
    setBudgetSuccess(true);
    setTimeout(() => setBudgetSuccess(false), 2500);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    // Reconstruct the rates configuration proportionally
    const updatedRates: ExchangeRates = {
      USD: {
        USD: 1,
        MXN: Number(usdToMxn),
        EUR: Number(usdToEur),
        ARS: Number(usdToArs),
        COP: Number(usdToCop)
      },
      MXN: {
        USD: 1 / Number(usdToMxn),
        MXN: 1,
        EUR: Number(usdToEur) / Number(usdToMxn),
        ARS: Number(usdToArs) / Number(usdToMxn),
        COP: Number(usdToCop) / Number(usdToMxn)
      },
      EUR: {
        USD: 1 / Number(usdToEur),
        MXN: Number(usdToMxn) / Number(usdToEur),
        EUR: 1,
        ARS: Number(usdToArs) / Number(usdToEur),
        COP: Number(usdToCop) / Number(usdToEur)
      }
    };
    onUpdateRates(updatedRates);
    setRatesSuccess(true);
    setTimeout(() => setRatesSuccess(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Target Budgets Settings */}
      <div className="bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" /> Límites de Presupuesto por Categoría
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Define metas máximas de gasto mensual para cada categoría en su moneda de reporte elegida ({primaryCurrency}).
        </p>

        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs font-sans max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1.5">
                <label className="text-slate-400 font-semibold font-mono uppercase block text-[9px] tracking-widest truncate" title={cat}>
                  {cat}
                </label>
                <input
                  type="number"
                  value={localBudget[cat] !== undefined ? localBudget[cat] : 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLocalBudget(prev => ({ ...prev, [cat]: val }));
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:border-emerald-500 rounded-none outline-hidden"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            {budgetSuccess ? (
              <span className="text-xs text-emerald-400 font-semibold font-mono flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> ¡Cambios guardados con éxito!
              </span>
            ) : <span />}
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider uppercase transition rounded-none text-xs cursor-pointer"
            >
              Guardar Presupuestos
            </button>
          </div>
        </form>
      </div>

      {/* Primary Reporting Currency configuration */}
      <div className="space-y-6">
        
        {/* Currecy selection */}
        <div className="bg-slate-900 border border-slate-800 p-6 shadow-xl">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Coins className="h-4 w-4 text-emerald-400" /> Moneda Primaria de Reportes
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Los gastos registrados en otras denominaciones se traducdrán automáticamente a esta moneda de referencia para homogeneizar los gráficos y análisis de KPIs.
          </p>

          <div className="flex gap-2">
            {["USD", "MXN", "EUR"].map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onUpdatePrimaryCurrency(curr)}
                className={`flex-1 py-3 text-xs font-bold font-mono border transition-all cursor-pointer ${
                  primaryCurrency === curr
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-extrabold shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic conversion rates settings */}
        <div className="bg-slate-900 border border-slate-800 p-6 shadow-xl">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-400" /> Matriz de Tipos de Cambio (Base 1 USD)
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Ajusta los multiplicadores de tasas cruzadas para calibrar la conversión precisa de transacciones internacionales.
          </p>

          <form onSubmit={handleSaveRates} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider font-sans">1 USD equivalencia a MXN</span>
                <input
                  type="number"
                  step="any"
                  value={usdToMxn}
                  onChange={(e) => setUsdToMxn(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:border-emerald-500 rounded-none outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider font-sans">1 USD equivalencia a EUR</span>
                <input
                  type="number"
                  step="any"
                  value={usdToEur}
                  onChange={(e) => setUsdToEur(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:border-emerald-500 rounded-none outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider font-sans">1 USD equivalencia a ARS</span>
                <input
                  type="number"
                  step="any"
                  value={usdToArs}
                  onChange={(e) => setUsdToArs(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:border-emerald-500 rounded-none outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider font-sans">1 USD equivalencia a COP</span>
                <input
                  type="number"
                  step="any"
                  value={usdToCop}
                  onChange={(e) => setUsdToCop(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:border-emerald-500 rounded-none outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              {ratesSuccess ? (
                <span className="text-xs text-emerald-400 font-semibold font-mono flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> ¡Tasas actualizadas con éxito!
                </span>
              ) : <span />}
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider uppercase transition rounded-none text-xs cursor-pointer"
              >
                Aplicar Re-conversión
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Category Editor: Add, Modify, Delete */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-emerald-400" /> Editor y Gestor de Categorías de Gastos
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Agrega nuevas ramas de negocio, modifica nombres existentes y depura categorías obsoletas. El analista de IA se auto-entrenará al instante con esta matriz para clasificar y justificar facturas bajo tus propias reglas.
        </p>

        {/* Input elements to add new categories */}
        <div className="flex gap-2.5 max-w-md mb-6">
          <input
            type="text"
            placeholder="Nombre de la nueva categoría (ej: Marketing)..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddCat();
              }
            }}
            className="flex-1 text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
          />
          <button
            type="button"
            onClick={handleAddCat}
            className="text-xs font-mono font-bold px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition rounded-none uppercase cursor-pointer shrink-0"
          >
            + Nueva
          </button>
        </div>

        {/* Dynamic Categories management grid */}
        <div className="border border-slate-800 rounded-none overflow-hidden bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3">Categoría de Gasto</th>
                  <th className="p-3 text-right">Acciones Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {categories.map((cat) => {
                  const isEditing = editingCategory === cat;
                  return (
                    <tr key={cat} className="hover:bg-slate-900/40 transition">
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(cat);
                            }}
                            className="w-full max-w-sm px-2.5 py-1.5 bg-slate-950 border border-emerald-500 text-slate-150 font-mono outline-hidden rounded-none"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{cat}</span>
                            {["Insumos", "Logística", "Servicios", "Viáticos", "Personal", "Otros"].includes(cat) && (
                              <span className="text-[8px] font-sans font-bold bg-slate-800 px-1 py-0.5 text-slate-500 uppercase tracking-widest">Por Defecto</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveRename(cat)}
                              className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 hover:bg-emerald-500 hover:text-slate-950 transition rounded-none uppercase cursor-pointer"
                            >
                              ✓ Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategory(null)}
                              className="text-[10px] font-bold text-slate-400 bg-slate-850 px-2.5 py-1 hover:bg-slate-750 hover:text-white transition rounded-none uppercase cursor-pointer"
                            >
                              Volver
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditValue(cat);
                              }}
                              className="text-[10px] font-bold text-slate-300 hover:text-white px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-none cursor-pointer transition uppercase"
                            >
                              Modificar
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerDeleteCategory(cat)}
                              className="text-[10px] font-bold text-rose-400 hover:text-rose-350 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-none cursor-pointer transition uppercase"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Custom Category Deletion Confirmation Modal */}
      {categoryToDelete && (
        <div id="custom-cat-delete-overlay" className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div id="custom-cat-delete-panel" className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-none shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <span className="font-mono font-bold uppercase tracking-widest text-[10px] text-rose-500">
                Eliminar Categoría
              </span>
              <button
                id="custom-cat-delete-close-btn"
                onClick={() => setCategoryToDelete(null)}
                className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white transition rounded-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-300 space-y-4">
              <p className="font-sans leading-relaxed">
                ¿Está seguro de que desea eliminar la categoría de gasto <strong className="text-white uppercase">"{categoryToDelete}"</strong>?
              </p>
              <p className="text-slate-400 leading-relaxed font-sans">
                Todos los gastos registrados bajo esta línea serán reclasificados automáticamente como "Otros" (o la primera categoría activa).
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-950">
              <button
                id="custom-cat-delete-cancel-btn"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-slate-850 transition rounded-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="custom-cat-delete-submit-btn"
                onClick={() => {
                  onDeleteCategory(categoryToDelete);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider transition rounded-none cursor-pointer"
              >
                Eliminar Línea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Category Error Alert Modal */}
      {categoryAlertMessage && (
        <div id="custom-cat-alert-overlay" className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div id="custom-cat-alert-panel" className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-none shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <span className="font-mono font-bold uppercase tracking-widest text-[10px] text-amber-500 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Operación Denegada
              </span>
              <button
                id="custom-cat-alert-close-btn"
                onClick={() => setCategoryAlertMessage(null)}
                className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white transition rounded-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-300">
              <p className="font-sans leading-relaxed">
                {categoryAlertMessage}
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-950">
              <button
                id="custom-cat-alert-ok-btn"
                onClick={() => setCategoryAlertMessage(null)}
                className="px-4 py-2 bg-slate-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-slate-700 transition rounded-none cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export default SettingsPanel;
