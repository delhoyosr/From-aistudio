import React, { useState, useRef } from "react";
import { 
  Camera, UploadCloud, FileText, Check, AlertTriangle, 
  Trash, Loader2, Sparkles, Plus, AlertCircle 
} from "lucide-react";
import { Expense, ExpenseCategory, ExpenseItem } from "../types";

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, "id" | "created_at">) => void;
  primaryCurrency: string;
  categories: string[];
}

export function ExpenseForm({ onAddExpense, primaryCurrency, categories }: ExpenseFormProps) {
  // AI extraction inputs
  const [textPrompt, setTextPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [extractedStatus, setExtractedStatus] = useState<"idle" | "success" | "error">("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Review / Manual Edit State
  const [reviewMode, setReviewMode] = useState(false);
  
  // Editable Fields
  const [fecha, setFecha] = useState("");
  const [comercio, setComercio] = useState("");
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [moneda, setMoneda] = useState(primaryCurrency);
  const [impuestos, setImpuestos] = useState<number>(0);
  const [categoria, setCategoria] = useState<ExpenseCategory>("Otros");
  const [descripcion, setDescripcion] = useState("");
  const [elementos, setElementos] = useState<ExpenseItem[]>([]);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [confirmMsg, setConfirmMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to read and convert raw file to clean Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract pure base64
        const pureBase64 = result.split(",")[1];
        setImageBase64(pureBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop mechanics
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const pureBase64 = result.split(",")[1];
          setImageBase64(pureBase64);
        };
        reader.readAsDataURL(file);
      } else {
        setApiError("Solo se permiten archivos de imagen (Tickets/Facturas)");
      }
    }
  };

  // Call server-side API: Text Extraction
  const handleProcessText = async () => {
    if (!textPrompt.trim()) return;
    setIsProcessing(true);
    setApiError(null);
    setExtractedStatus("idle");

    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textPrompt, categories }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo en la comunicación con el analista de datos.");
      }

      const data = await response.json();
      populateForm(data);
      setExtractedStatus("success");
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "No se pudo procesar el texto.");
      setExtractedStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Call server-side API: Multimodal Image receipt extraction
  const handleProcessImage = async () => {
    if (!imageBase64 || !imageFile) return;
    setIsProcessing(true);
    setApiError(null);
    setExtractedStatus("idle");

    try {
      const response = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          mimeType: imageFile.type,
          descriptionPrompt: textPrompt,
          categories
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error de lectura del ticket por nuestro servicio de IA.");
      }

      const data = await response.json();
      populateForm(data);
      setExtractedStatus("success");
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Fallo en el reconocimiento óptico de ticket.");
      setExtractedStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Map JSON response to states for user correction
  const populateForm = (data: any) => {
    // Graceful fallback to first available category if AI returns a non-listed category
    const extractedCat = data.categoria || "Otros";
    const matchedCategory = categories.includes(extractedCat)
      ? extractedCat
      : (categories.includes("Otros") ? "Otros" : (categories[0] || ""));

    setFecha(data.fecha || new Date().toISOString().split("T")[0]);
    setComercio(data.comercio || "");
    setMontoTotal(Number(data.monto_total) || 0);
    setMoneda(data.moneda || primaryCurrency);
    setImpuestos(Number(data.impuestos) || 0);
    setCategoria(matchedCategory);
    setDescripcion(data.descripcion || "");
    setElementos(data.elementos || []);
    setAdvertencias(data.advertencias || []);
    setConfirmMsg(data.confirmacion || `Registro procesado: ${data.monto_total || 0} ${data.moneda || primaryCurrency} en ${matchedCategory}`);
    setReviewMode(true);
  };

  // Quick reset
  const handleReset = () => {
    setTextPrompt("");
    setImageFile(null);
    setImageBase64(null);
    setExtractedStatus("idle");
    setApiError(null);
    setReviewMode(false);
    setFecha("");
    setComercio("");
    setMontoTotal(0);
    setImpuestos(0);
    setCategoria("Otros");
    setDescripcion("");
    setElementos([]);
    setAdvertencias([]);
    setConfirmMsg("");
  };

  // Submit corrected values
  const handleSaveExpense = () => {
    if (!fecha) {
      setAdvertencias(prev => [...prev, "Falta especificar la fecha del gasto."]);
      return;
    }
    if (!comercio.trim()) {
      setAdvertencias(prev => [...prev, "Falta especificar el comercio o establecimiento."]);
      return;
    }
    if (montoTotal <= 0) {
      setAdvertencias(prev => [...prev, "El monto total debe ser mayor a cero para ser registrado."]);
      return;
    }

    // Dynamic generation of confirmation as absolute rule
    const finalConfirmMsg = `Registro procesado: ${montoTotal.toFixed(2)} ${moneda} en ${categoria}`;

    onAddExpense({
      fecha,
      comercio,
      monto_total: montoTotal,
      moneda,
      impuestos,
      categoria,
      descripcion,
      elementos,
      advertencias,
      confirmacion: finalConfirmMsg,
      imageUrl: imageBase64 ? `data:${imageFile?.type || 'image/png'};base64,${imageBase64}` : undefined
    });

    handleReset();
  };

  // Itemize element control helpers
  const handleAddSubItem = () => {
    setElementos([...elementos, { nombre: "", precio: 0, cantidad: 1 }]);
  };

  const handleRemoveSubItem = (index: number) => {
    setElementos(elementos.filter((_, i) => i !== index));
  };

  const handleSubItemChange = (index: number, field: keyof ExpenseItem, val: any) => {
    const updated = [...elementos];
    updated[index] = {
      ...updated[index],
      [field]: field === "precio" || field === "cantidad" ? Number(val) : val
    };
    setElementos(updated);
  };

  return (
    <div className="w-full">
      {!reviewMode ? (
        <div className="bg-slate-900 border border-slate-800 rounded-none overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 border border-slate-800 text-emerald-450 rounded-none select-none">
                <Sparkles className="h-4 w-4 animate-pulse text-emerald-450" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Ingreso Inteligente Multimodal
                </h2>
                <p className="text-xs text-slate-400">
                  Arrastra una captura del ticket o describe libremente tu gasto para estructurarlo.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                populateForm({
                  fecha: new Date().toISOString().split("T")[0],
                  comercio: "",
                  monto_total: 0,
                  moneda: primaryCurrency,
                  impuestos: 0,
                  categoria: "Otros",
                  descripcion: "",
                  elementos: [],
                  advertencias: [],
                });
              }}
              className="text-xs font-bold font-mono px-3 py-1.5 border border-slate-800 text-slate-300 bg-slate-950 hover:bg-slate-900 transition rounded-none flex items-center gap-1.5 cursor-pointer uppercase"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-450" /> Manual
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Drag & Drop Frame */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-none p-8 transition-all text-center cursor-pointer flex flex-col items-center justify-center ${
                isDragActive
                  ? "border-emerald-500 bg-emerald-500/10"
                  : imageFile
                  ? "border-blue-500 bg-blue-500/50"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/30"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {imageFile ? (
                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 inline-block font-mono">
                    <Check className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Archivo cargado: {imageFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {(imageFile.size / 1024).toFixed(1)} KB • LISTO PARA EXTRACCIÓN
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImageBase64(null);
                    }}
                    className="text-[10px] uppercase font-bold tracking-widest text-rose-400 hover:text-rose-300 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash className="h-3.5 w-3.5" /> Quitar imagen
                  </button>
                </div>
              ) : (
                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-slate-900 text-slate-400 border border-slate-800 inline-block">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-450 hover:underline block uppercase tracking-wider">
                      Arrastra tu ticket aquí o haz clic para explorar
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1 normal-case tracking-normal">
                      Formatos: JPG, PNG, WEBP. Permite escaneo de facturas, recibos y notas mediante IA.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Text Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Instrucciones o Detalles en Texto Libre</span>
                <span className="text-slate-500 normal-case font-normal font-sans">Opcional</span>
              </label>
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="Ejemplo: 'Comida corporativa de representación por 1450 pesos MXN en Starbucks Centro, incluye flete de $200 de DHL'"
                rows={3}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-550 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
              />
            </div>

            {/* Error notifications */}
            {apiError && (
              <div className="bg-rose-500/10 text-rose-450 p-4 border border-rose-500/20 font-mono text-xs flex items-start gap-2.5 rounded-none">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-450" />
                <div>
                  <span className="font-bold block uppercase tracking-widest">Fallo de procesamiento</span>
                  {apiError}
                </div>
              </div>
            )}

            {/* Action trigger button */}
            <div className="flex gap-3 justify-end pt-2">
              {imageFile ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessImage}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider uppercase transition rounded-none text-xs flex items-center gap-2 font-mono cursor-pointer disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando Ticket...
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5" /> Ejecutar Extracción de Imagen
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing || !textPrompt.trim()}
                  onClick={handleProcessText}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider uppercase transition rounded-none text-xs flex items-center gap-2 font-mono cursor-pointer disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Normalizando Datos...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" /> Procesar Texto de Gasto
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Review and Integrity Correction mode */
        <div className="bg-slate-900 border border-slate-800 rounded-none overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Revisión y Control de Integridad
                </h2>
                <p className="text-xs text-slate-400">
                  Verifica que los datos del asistente sean correctos y complementa campos vacíos.
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white font-mono font-bold uppercase tracking-wider hover:underline cursor-pointer"
            >
              Cancelar y Volver
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Visual original source snippet if present */}
            {imageBase64 && (
              <div className="flex items-center gap-4 bg-slate-950 p-3.5 rounded-none border border-slate-850">
                <div className="h-14 w-14 shrink-0 rounded-none bg-slate-900 overflow-hidden border border-slate-800">
                  <img
                    src={`data:${imageFile?.type || "image/png"};base64,${imageBase64}`}
                    alt="Ticket cargado"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-xs font-mono">
                  <span className="font-bold text-emerald-400 uppercase tracking-widest block">Imagen vinculada correctamente</span>
                  <span className="text-slate-500 text-[10px]">Su registro incluirá el comprobante adjunto.</span>
                </div>
              </div>
            )}

            {/* Security Alerts / Integrity warnings */}
            {advertencias && advertencias.length > 0 && (
              <div className="bg-amber-500/10 rounded-none p-4 border border-amber-500/25 space-y-2 font-mono">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                  <span>Advertencias de Integridad de IA:</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-amber-300 space-y-1">
                  {advertencias.map((adv, idx) => (
                    <li key={idx} className="italic">{adv}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comercio / Establecimiento</label>
                <input
                  type="text"
                  placeholder="Ej. Office Depot S.A."
                  value={comercio}
                  onChange={(e) => {
                    setComercio(e.target.value);
                    setAdvertencias(prev => prev.filter(a => !a.toLowerCase().includes("comercio")));
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría de Gasto</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as ExpenseCategory)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-300 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
                >
                  {categories.map((cat) => {
                    const labels: Record<string, string> = {
                      Insumos: "Insumos (Materiales, papelería)",
                      Logística: "Logística (Fletes, envíos)",
                      Servicios: "Servicios (Nube, luz, SaaS)",
                      Viáticos: "Viáticos (Comidas, viajes)",
                      Personal: "Personal (Sueldos, honorarios)",
                      Otros: "Otros (Varios)",
                    };
                    return (
                      <option key={cat} value={cat}>
                        {labels[cat] || cat}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto Total</label>
                  <input
                    type="number"
                    step="any"
                    value={montoTotal || ""}
                    onChange={(e) => {
                      setMontoTotal(Number(e.target.value));
                      if (Number(e.target.value) > 0) {
                        setAdvertencias(prev => prev.filter(a => !a.toLowerCase().includes("monto") && !a.toLowerCase().includes("valor")));
                      }
                    }}
                    placeholder="Monto total"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">Moneda</label>
                  <input
                    type="text"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value.toUpperCase())}
                    placeholder="USD"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono text-center uppercase font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impuestos Incluidos (Opcional)</label>
                <input
                  type="number"
                  step="any"
                  value={impuestos || ""}
                  onChange={(e) => setImpuestos(Number(e.target.value))}
                  placeholder="Ej: IVA, Tasas locales"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción General / Concepto</label>
                <input
                  type="text"
                  placeholder="Resumen o sumario general"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 text-slate-100 focus:outline-hidden focus:border-emerald-500 rounded-none font-mono"
                />
              </div>
            </div>

            {/* Elements sub item list */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-none border border-slate-850">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Detalle del Gasto (Conceptos)</span>
                <button
                  type="button"
                  onClick={handleAddSubItem}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="h-3 w-3" /> Agregar Concepto
                </button>
              </div>

              {elementos && elementos.length > 0 ? (
                <div className="space-y-2">
                  {elementos.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Descripción del concepto"
                        value={item.nombre}
                        onChange={(e) => handleSubItemChange(index, "nombre", e.target.value)}
                        className="flex-3 p-2 bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 rounded-none outline-hidden"
                      />
                      <input
                        type="number"
                        placeholder="Precio unitario"
                        value={item.precio || ""}
                        onChange={(e) => handleSubItemChange(index, "precio", e.target.value)}
                        className="flex-1 p-2 bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 rounded-none outline-hidden font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Cant."
                        value={item.cantidad || ""}
                        onChange={(e) => handleSubItemChange(index, "cantidad", e.target.value)}
                        className="w-14 p-2 bg-slate-950 border border-slate-800 text-slate-100 focus:border-emerald-500 rounded-none outline-hidden font-mono text-center"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubItem(index)}
                        className="p-1 px-2.5 text-slate-500 hover:text-rose-450 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4 bg-slate-950/40 border border-dashed border-slate-850">
                  No hay conceptos detallados asociados a este documento.
                </p>
              )}
            </div>

            {/* Affirmative Confirmation Preview Box */}
            <div className="bg-slate-950 border border-slate-850 p-4 flex justify-between items-center text-xs font-mono rounded-none">
              <div className="max-w-lg truncate">
                <span className="font-bold text-slate-500 uppercase block text-[9px] tracking-widest">Confirmación del Registro</span>
                <span className="text-emerald-400 font-bold block mt-0.5 truncate">
                  {`Registro procesado: ${montoTotal.toFixed(2)} ${moneda} en ${categoria}`}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold tracking-widest text-[9px]">
                ACTIVO
              </span>
            </div>

            {/* Submissions button section */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-slate-800 text-slate-350 hover:text-white bg-slate-950 hover:bg-slate-900 transition rounded-none font-bold font-mono uppercase text-xs cursor-pointer"
              >
                Limpiar todo
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider uppercase transition rounded-none text-xs flex items-center gap-1.5 font-mono cursor-pointer shadow-lg"
              >
                <Check className="h-4 w-4" /> Registrar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ExpenseForm;
