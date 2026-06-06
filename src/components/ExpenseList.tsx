import React, { useState } from "react";
import { 
  Search, Filter, Trash2, Calendar, FileSpreadsheet, Eye, X, CheckSquare, ShieldCheck, Image 
} from "lucide-react";
import { Expense, ExpenseCategory } from "../types";

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  primaryCurrency: string;
  categories: string[];
}

export function ExpenseList({ expenses, onDeleteExpense, primaryCurrency, categories }: ExpenseListProps) {
  const getCategoryBadgeClass = (cat: string) => {
    const normalized = cat.toLowerCase().trim();
    if (normalized.includes("insumo")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (normalized.includes("logí") || normalized.includes("logi") || normalized.includes("enví") || normalized.includes("envi")) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (normalized.includes("serv") || normalized.includes("nube") || normalized.includes("saas")) return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    if (normalized.includes("viát") || normalized.includes("viat") || normalized.includes("viaj") || normalized.includes("comid")) return "bg-rose-550/10 text-rose-400 border-rose-550/20";
    if (normalized.includes("pers") || normalized.includes("suel") || normalized.includes("hono")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (normalized.includes("otr")) return "bg-slate-550/10 text-slate-400 border-slate-550/20";
    
    // Custom hash fallback color
    const hash = Array.from(cat).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      "bg-amber-500/10 text-amber-400 border-amber-500/20",
      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      "bg-rose-550/10 text-rose-400 border-rose-700/30",
      "bg-purple-500/10 text-purple-400 border-purple-500/20",
      "bg-blue-500/10 text-blue-400 border-blue-500/20",
      "bg-orange-500/10 text-orange-400 border-orange-500/20",
      "bg-pink-500/10 text-pink-400 border-pink-500/20"
    ];
    return colors[hash % colors.length];
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseIdToDelete, setExpenseIdToDelete] = useState<string | null>(null);

  // Filters logic
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = 
      exp.comercio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "all" || exp.categoria === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Action: Copy complete filtered dataset for Excel sheet copy-paste
  const copyFilteredToExcel = () => {
    if (filteredExpenses.length === 0) return;

    const headers = "ID\tFecha\tComercio\tCategoría\tMonto Total\tMoneda\tImpuestos\tDescripción\tMensaje Confirmación\n";
    const body = filteredExpenses.map((e) => 
      `${e.id}\t${e.fecha}\t${e.comercio}\t${e.categoria}\t${e.monto_total}\t${e.moneda}\t${e.impuestos}\t${e.descripcion}\t${e.confirmacion}`
    ).join("\n");

    navigator.clipboard.writeText(headers + body);
    alert("¡Lista copiada! Formato TAB-CSV listo para pegar con Ctrl+V directamente en Excel o Google Sheets.");
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Strip */}
      <div className="bg-slate-900 p-4 rounded-none border border-slate-800 shadow-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por comercio o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
          />
        </div>

        <div className="flex gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 bg-slate-950 border border-slate-800 text-slate-300 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={copyFilteredToExcel}
            className="text-xs font-bold font-mono px-3 py-2 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 transition rounded-none flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Exportar Filtrados a Excel
          </button>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-none overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-450 border-b border-slate-800 font-mono">
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic">Fecha</th>
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic">Comercio</th>
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic">Categoría</th>
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic text-right">Monto</th>
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic text-center">Evidencia</th>
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic">Confirmación de Registro</th>
                <th className="p-3.5 text-[10px] font-bold uppercase tracking-wider italic text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs font-mono">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp, index) => (
                  <tr 
                    key={exp.id} 
                    className={`transition ${index % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/10"} hover:bg-slate-850/50`}
                  >
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">
                      {exp.fecha}
                    </td>
                    <td className="p-3.5 font-medium text-slate-200 uppercase tracking-tight">
                      <div>
                        {exp.comercio}
                        {exp.descripcion && (
                          <span className="block text-[10px] text-slate-500 font-normal normal-case font-sans mt-0.5 max-w-xs truncate">
                            {exp.descripcion}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border font-mono tracking-tight uppercase ${getCategoryBadgeClass(exp.categoria)}`}>
                        {exp.categoria}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-white whitespace-nowrap">
                      {(exp.monto_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {exp.moneda}
                    </td>
                    <td className="p-3.5 text-center">
                      {exp.imageUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20 text-[10px] font-mono">
                          <Image className="h-3 w-3" /> Con foto
                        </span>
                      ) : (
                        <span className="text-slate-600 italic text-[10px]">Sin adjunto</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="inline-flex items-center gap-1 bg-slate-950 text-slate-400 px-2 py-1 border border-slate-850 text-[10px] font-mono select-all w-full max-w-sm truncate whitespace-nowrap">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{exp.confirmacion}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-none transition cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setExpenseIdToDelete(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-450 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-none transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 hover:bg-slate-900/10 italic">
                    Sin registros coincidentes en base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col rounded-none shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                <span className="font-mono font-bold uppercase tracking-widest text-slate-200 text-xs">
                  Documentación Detallada del Registro
                </span>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white transition rounded-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 text-xs text-slate-350 scrollbar-none">
              {/* Confirmacion visual card */}
              <div className="p-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-none font-mono">
                <span className="font-bold uppercase tracking-wider text-[9px] block text-emerald-400 mb-1">
                  Sello Certificado de Transacción:
                </span>
                {selectedExpense.confirmacion}
              </div>

              {/* Core Details metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-slate-500 block font-semibold font-mono uppercase tracking-widest text-[9px]">Fecha</span>
                  <span className="text-slate-100 font-mono font-bold block mt-1">{selectedExpense.fecha}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold font-mono uppercase tracking-widest text-[9px]">Establecimiento</span>
                  <span className="text-slate-100 font-semibold block mt-1 uppercase">{selectedExpense.comercio}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold font-mono uppercase tracking-widest text-[9px]">Categoría</span>
                  <span className="text-slate-100 font-medium block mt-1">{selectedExpense.categoria}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold font-mono uppercase tracking-widest text-[9px]">Importe Consolidado</span>
                  <span className="text-white font-mono font-extrabold block text-sm mt-1">
                    {selectedExpense.monto_total.toLocaleString()} {selectedExpense.moneda}
                  </span>
                </div>
              </div>

              {/* Breakdown description */}
              {selectedExpense.descripcion && (
                <div className="space-y-1 bg-slate-950 p-3 rounded-none border border-slate-850">
                  <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest">Concepto General / Sumario</span>
                  <p className="text-slate-300 leading-relaxed font-sans mt-1">
                    {selectedExpense.descripcion}
                  </p>
                </div>
              )}

              {/* Detail list items list */}
              {selectedExpense.elementos && selectedExpense.elementos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest block">Desglose de Línea (Items)</span>
                  <div className="border border-slate-800 rounded-none overflow-hidden bg-slate-950">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-450 uppercase font-mono">
                          <th className="p-2">Concepto</th>
                          <th className="p-2 text-right">Cant.</th>
                          <th className="p-2 text-right">Unitario</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs font-mono">
                        {selectedExpense.elementos.map((el, i) => {
                          const qty = el.cantidad || 1;
                          const price = el.precio || 0;
                          return (
                            <tr key={i} className="hover:bg-slate-900/35">
                              <td className="p-2 font-medium text-slate-300 font-sans">{el.nombre}</td>
                              <td className="p-2 text-right font-mono text-slate-400">{qty}</td>
                              <td className="p-2 text-right font-mono text-slate-400">{price.toLocaleString()} {selectedExpense.moneda}</td>
                              <td className="p-2 text-right font-mono font-semibold text-white">
                                {(qty * price).toLocaleString()} {selectedExpense.moneda}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Warnings check panel */}
              {selectedExpense.advertencias && selectedExpense.advertencias.length > 0 && (
                <div className="bg-amber-500/10 p-3 rounded-none border border-amber-500/20 space-y-1">
                  <span className="font-bold text-amber-400 font-mono text-[9px] uppercase tracking-widest block">Observaciones de Integridad</span>
                  <ul className="list-disc pl-4 text-xs text-amber-300 space-y-0.5">
                    {selectedExpense.advertencias.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* original Receipt photo display */}
              {selectedExpense.imageUrl && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest block">Comprobante de Soporte</span>
                  <div className="border border-slate-800 rounded-none overflow-hidden bg-slate-950 flex items-center justify-center p-3 max-h-64">
                    <img 
                      src={selectedExpense.imageUrl} 
                      alt="Receipt evidence" 
                      className="max-h-56 object-contain rounded-none border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-950 rounded-none">
              <button
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold font-mono uppercase tracking-widest hover:bg-emerald-600 transition rounded-none cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for deletion */}
      {expenseIdToDelete && (
        <div id="custom-delete-confirm-overlay" className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div id="custom-delete-confirm-panel" className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-none shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <span className="font-mono font-bold uppercase tracking-widest text-[10px] text-rose-500">
                Confirmar Eliminación
              </span>
              <button
                id="custom-delete-confirm-close-btn"
                onClick={() => setExpenseIdToDelete(null)}
                className="p-1 hover:bg-slate-850 text-slate-400 hover:text-white transition rounded-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-300 space-y-4">
              <p className="font-sans leading-relaxed">
                ¿Está seguro de que desea eliminar permanentemente este registro de gasto? Esta acción es irreversible y afectará los informes consolidados.
              </p>
              {(() => {
                const targetExp = expenses.find(e => e.id === expenseIdToDelete);
                if (!targetExp) return null;
                return (
                  <div className="bg-slate-950 border border-slate-850 p-3 font-mono text-[11px] space-y-1 text-slate-400">
                    <div><span className="text-slate-500">Monto:</span> <strong className="text-white">{targetExp.monto_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetExp.moneda}</strong></div>
                    <div><span className="text-slate-500">Comercio:</span> <span className="uppercase text-slate-300">{targetExp.comercio}</span></div>
                    <div><span className="text-slate-500">Categoría:</span> <span className="text-slate-350">{targetExp.categoria}</span></div>
                  </div>
                );
              })()}
            </div>
            <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-950">
              <button
                id="custom-delete-confirm-cancel-btn"
                onClick={() => setExpenseIdToDelete(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-slate-850 transition rounded-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="custom-delete-confirm-submit-btn"
                onClick={() => {
                  onDeleteExpense(expenseIdToDelete);
                  setExpenseIdToDelete(null);
                }}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider transition rounded-none cursor-pointer"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ExpenseList;
