import React, { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { 
  TrendingUp, AlertTriangle, CheckCircle, Copy, Code, Terminal, FileDown, ArrowUpRight 
} from "lucide-react";
import { Expense, CategoryBudget, ExchangeRates } from "../types";

interface AnalyticsDashboardProps {
  expenses: Expense[];
  budget: CategoryBudget;
  rates: ExchangeRates;
  primaryCurrency: string;
}

const getCategoryColor = (cat: string) => {
  const CATEGORY_COLORS = {
    Insumos: "#10b981", // Emerald
    Logística: "#f59e0b", // Amber
    Servicios: "#06b6d4", // Cyan
    Viáticos: "#f43f5e", // Rose
    Personal: "#a855f7", // Purple
    Otros: "#64748b"  // Slate
  };
  if (cat in CATEGORY_COLORS) {
    return CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS];
  }
  const hash = Array.from(cat).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ["#10b981", "#f59e0b", "#06b6d4", "#f43f5e", "#a855f7", "#3b82f6", "#f97316", "#ec4899"];
  return colors[hash % colors.length];
};

export function AnalyticsDashboard({ expenses, budget, rates, primaryCurrency }: AnalyticsDashboardProps) {
  // Python Code Generator panel toggle
  const [showPythonCode, setShowPythonCode] = useState(false);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);

  // Helper converter
  const convert = (amount: number, from: string, to: string) => {
    if (from === to) return amount;
    // Check if directly mapped
    if (rates[from]?.[to]) {
      return amount * rates[from][to];
    }
    // Try via USD as intermediate pivot
    const inUSD = rates[from]?.["USD"] ? amount * rates[from]["USD"] : amount;
    const result = rates["USD"]?.[to] ? inUSD * rates["USD"][to] : inUSD;
    return result;
  };

  // 1. Calculations: Total Spent, Avg Expense, etc.
  const totalSpentInPrimary = expenses.reduce((acc, exp) => {
    return acc + convert(exp.monto_total, exp.moneda, primaryCurrency);
  }, 0);

  const avgSpentInPrimary = expenses.length > 0 ? totalSpentInPrimary / expenses.length : 0;

  // Budget allocations vs actual spent
  const categorySummary = Object.keys(budget).map((catName) => {
    const limit = budget[catName as keyof CategoryBudget] || 0;
    const spent = expenses
      .filter((e) => e.categoria === catName)
      .reduce((sum, e) => sum + convert(e.monto_total, e.moneda, primaryCurrency), 0);
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const deviation = limit - spent;

    return {
      name: catName,
      spent: Math.round(spent * 100) / 100,
      limit: Math.round(limit * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      deviation: Math.round(deviation * 100) / 100,
      color: getCategoryColor(catName)
    };
  });

  // Calculate temporal trend (grouped by date)
  const sortedExpenses = [...expenses].sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  
  // Aggregate expenses by day
  const dateMap: { [date: string]: number } = {};
  sortedExpenses.forEach((exp) => {
    const val = convert(exp.monto_total, exp.moneda, primaryCurrency);
    dateMap[exp.fecha] = (dateMap[exp.fecha] || 0) + val;
  });

  // Turn into a timeline trend array
  let accumulated = 0;
  const trendData = Object.keys(dateMap).sort().map((date) => {
    const dailyAmount = dateMap[date];
    accumulated += dailyAmount;
    return {
      fecha: date,
      monto: Math.round(dailyAmount * 100) / 100,
      acumulado: Math.round(accumulated * 100) / 100
    };
  });

  // Calculate forecasts projections
  // Linear estimate: spent so far / active days * 30 days
  const uniqueDates = Array.from(new Set(expenses.map(e => e.fecha)));
  const daysObserved = uniqueDates.length || 1;
  const dailyAverage = totalSpentInPrimary / daysObserved;
  const projectedMonthlyGasto = dailyAverage * 30;
  const totalBudgetLimit = Object.values(budget).reduce((a, b) => a + b, 0);
  const budgetRatio = totalBudgetLimit > 0 ? (projectedMonthlyGasto / totalBudgetLimit) * 100 : 0;

  // Formatted python matplotlib / seaborn generation code block
  const generatePythonScript = () => {
    const datasetStr = JSON.stringify(
      expenses.map((e) => ({
        Fecha: e.fecha,
        Comercio: e.comercio,
        MontoOriginal: e.monto_total,
        Moneda: e.moneda,
        MontoReporte: Math.round(convert(e.monto_total, e.moneda, primaryCurrency) * 100) / 100,
        Categoria: e.categoria
      })),
      null,
      2
    );

    const budgetStr = JSON.stringify(budget, null, 2);

    return `import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json

# Configuración de diseño profesional clásico suizo
sns.set_theme(style="whitegrid")
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 10

# 1. Cargar Datos Estructurados del Asistente
data_json = """${datasetStr}"""
budget_json = """${budgetStr}"""

expenses_df = pd.DataFrame(json.loads(data_json))
budget_dict = json.loads(budget_json)

# Convertir tipos
expenses_df['Fecha'] = pd.to_datetime(expenses_df['Fecha'])

# 2. Generar Gráfico 1: Comparativa de Gastos Reales vs Presupuesto por Categoría
summary_category = expenses_df.groupby('Categoria')['MontoReporte'].sum().reset_index()
# Inyectar límites de presupuesto
summary_category['Limite'] = summary_category['Categoria'].map(budget_dict)

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Gráfico de barras horizontales comparativo
melted = pd.melt(summary_category, id_vars=['Categoria'], value_vars=['MontoReporte', 'Limite'],
                 var_name='Métrica', value_name='Valor (${primaryCurrency})')

sns.barplot(data=melted, y='Categoria', x='Valor (${primaryCurrency})', hue='Métrica', 
            palette=['#10B981', '#475569'], ax=axes[0])
axes[0].set_title('Gastos Reales Ejecutados vs Límite de Presupuesto', fontsize=12, fontweight='bold')
axes[0].set_xlabel('Monto Total (${primaryCurrency})')
axes[0].set_ylabel('Categoría')

# 3. Generar Gráfico 2: Distribución de Presupuesto Realizado (Torta)
colors = ['#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#a855f7', '#64748b']
axes[1].pie(summary_category['MontoReporte'], labels=summary_category['Categoria'], 
           autopct='%1.1f%%', startangle=140, colors=colors[:len(summary_category)])
axes[1].set_title('Distribución Porcentual del Gasto Real', fontsize=12, fontweight='bold')

plt.tight_layout()
plt.savefig('analytics_gastos_report.png', dpi=300)
print("Gráficos generados exitosamente en 'analytics_gastos_report.png'!")

# 4. Gráfico Temporal de Tendencia (Línea)
plt.figure(figsize=(10, 4))
trend_df = expenses_df.groupby('Fecha')['MontoReporte'].sum().cumsum().reset_index()
sns.lineplot(data=trend_df, x='Fecha', y='MontoReporte', marker='o', color='#10B981', linewidth=2.5)
plt.title('Tendencia Temporal de Gasto Acumulado', fontsize=11, fontweight='bold')
plt.ylabel('Monto Acumulado En ${primaryCurrency}')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig('tendencia_gasto_temporal.png', dpi=300)
`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePythonScript());
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Resumen Ejecutivo KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-none shadow-xl font-mono">
          <span className="text-[9px] font-bold text-slate-500 tracking-widest block uppercase">Total Gasto Acumulado</span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            {totalSpentInPrimary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-emerald-400">{primaryCurrency}</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Consolidado de {expenses.length} transacciones
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-none shadow-xl font-mono">
          <span className="text-[9px] font-bold text-slate-500 tracking-widest block uppercase">Media por Transacción</span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            {avgSpentInPrimary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-emerald-400">{primaryCurrency}</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-2">
            Dispersión media del periodo
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-none shadow-xl font-mono">
          <span className="text-[9px] font-bold text-slate-500 tracking-widest block uppercase font-mono">Proyección Estimada Mensual</span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            {projectedMonthlyGasto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-emerald-400">{primaryCurrency}</span>
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            {projectedMonthlyGasto > totalBudgetLimit ? (
              <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Sobregiro ({Math.round(budgetRatio)}%)
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Bajo Meta ({Math.round(budgetRatio)}%)
              </span>
            )}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-none shadow-xl font-mono">
          <span className="text-[9px] font-bold text-slate-500 tracking-widest block uppercase">Límite Agregado Mensual</span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            {totalBudgetLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-emerald-400">{primaryCurrency}</span>
          </h3>
          <div className="w-full bg-slate-950 h-1.5 mt-3 overflow-hidden border border-slate-800">
            <div 
              className={`h-full transition-all ${totalSpentInPrimary > totalBudgetLimit ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min((totalSpentInPrimary / totalBudgetLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Bars comparation spent vs limit per category */}
        <div className="bg-slate-900 p-5 rounded-none border border-slate-800 shadow-xl">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Relación Gasto vs Límite Presupuestal
          </h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySummary} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} style={{ fontFamily: "monospace" }} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} style={{ fontFamily: "monospace" }} />
                <Tooltip 
                  formatter={(value) => [`${value} ${primaryCurrency}`]}
                  contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "0px", fontFamily: "monospace", fontSize: "11px", color: "#f8fafc" }}
                />
                <Legend iconType="rect" wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase" }} />
                <Bar name="Gasto Realizado" dataKey="spent" fill="#10b981" />
                <Bar name="Límite Asignado" dataKey="limit" fill="#334155" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Torta Pie distribution of expenses */}
        <div className="bg-slate-900 p-5 rounded-none border border-slate-800 shadow-xl">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-450" /> Reparto de Gasto Real en Porcentaje
          </h4>
          <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="h-full w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySummary.filter(c => c.spent > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="spent"
                  >
                    {categorySummary.filter(c => c.spent > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} ${primaryCurrency}`]}
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "0px", fontFamily: "monospace", fontSize: "11px", color: "#f8fafc" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend checklist */}
            <div className="w-full sm:w-1/2 space-y-2">
              {categorySummary.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-dashed border-slate-800 pb-1.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-none shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="font-semibold text-slate-300">{cat.name}</span>
                  </div>
                  <div className="text-right text-slate-400">
                    <span className="font-bold text-white font-mono">
                      {(cat.spent).toLocaleString()}
                    </span>{" "}
                    ({cat.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Temporal progression timeline */}
        <div className="bg-slate-900 p-5 rounded-none border border-slate-800 shadow-xl lg:col-span-2">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">
            Progresión Temporal y Acumulación de Gasto
          </h4>
          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="fecha" stroke="#64748b" fontSize={10} tickLine={false} style={{ fontFamily: "monospace" }} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} style={{ fontFamily: "monospace" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "0px", fontFamily: "monospace", fontSize: "11px", color: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase" }} />
                  <Line name="Gasto Diario" type="monotone" dataKey="monto" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} />
                  <Line name="Gasto Acumulado" type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center italic text-slate-500 font-mono text-xs">
                Ingrese gastos para proyectar la progresión del flujo de caja.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy-pastable Data table formatted for Microsoft Excel */}
      <div className="bg-slate-900 border border-slate-800 p-6 shadow-xl rounded-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
              Límites y Desviaciones Consolidadas
            </h4>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Control de saldos ejecutados. Desviaciones negativas representan sobregiros sobre metas iniciales.
            </p>
          </div>
          <button
            onClick={() => {
              // Copy table matrix to clipboard directly as raw CSV
              const header = "Categoría\tPresupuesto Asignado\tGastos Consolidados\tProgreso %\tDesviación de Presupuesto\n";
              const rows = categorySummary.map(c => 
                `${c.name}\t${c.limit}\t${c.spent}\t${c.percentage}%\t${c.deviation}`
              ).join("\n");
              
              navigator.clipboard.writeText(header + rows);
              alert("Matriz financiera copiada en formato TAB para pegar directamente en Excel.");
            }}
            className="text-xs font-bold font-mono px-3 py-1.5 border border-slate-800 text-slate-350 bg-slate-950 hover:bg-slate-900 transition rounded-none flex items-center gap-1.5 cursor-pointer uppercase shrink-0"
          >
            <FileDown className="h-3.5 w-3.5 text-emerald-450" /> Copiar Matriz para Excel
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800/80 rounded-none bg-slate-950">
          <table className="w-full text-left border-collapse font-mono">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3 text-left">Categoría</th>
                <th className="p-3 text-right">Límite Ajustado</th>
                <th className="p-3 text-right">Consumo Real</th>
                <th className="p-3 text-center">Progreso %</th>
                <th className="p-3 text-right">Desviación (Restante)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-xs">
              {categorySummary.map((cat, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="p-3 font-semibold text-slate-200 flex items-center gap-2 font-mono">
                    <span className="h-2 w-2 rounded-none" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-400">
                    {cat.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {primaryCurrency}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-white">
                    {cat.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} {primaryCurrency}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-slate-300 w-10 text-right">{cat.percentage}%</span>
                      <div className="w-12 bg-slate-900 h-1 border border-slate-800 overflow-hidden">
                        <div 
                          className={`h-full ${cat.spent > cat.limit ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={`p-3 text-right font-mono font-bold ${cat.deviation < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {cat.deviation >= 0 ? "+" : ""}
                    {cat.deviation.toLocaleString(undefined, { minimumFractionDigits: 2 })} {primaryCurrency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Python analytics box - perfect Swiss design element */}
      <div className="bg-slate-900 rounded-none overflow-hidden text-slate-200 border border-slate-800 shadow-xl font-mono">
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-450" />
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-200">
              Script del Ejecutable Analítico (Python)
            </span>
          </div>
          <button
            onClick={() => setShowPythonCode(!showPythonCode)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase cursor-pointer"
          >
            {showPythonCode ? "Ocultar Código" : "Ver Código Python"}
          </button>
        </div>
        
        {showPythonCode && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Utiliza este script de Python localmente para generar visualizaciones impresas de alta densidad (300 DPI) para informes ejecutivos en formatos PNG o PDF con matplotlib y seaborn.
            </p>
            <div className="relative">
              <pre className="bg-slate-950 p-4 overflow-x-auto text-[11px] font-mono text-emerald-300 max-h-72 border border-slate-850 scrollbar-none">
                <code>{generatePythonScript()}</code>
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-none border border-slate-800 text-xs flex items-center gap-1 cursor-pointer transition uppercase"
              >
                {copyCodeSuccess ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-emerald-400" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copiar Código
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
export default AnalyticsDashboard;
