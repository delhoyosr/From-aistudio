import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Dynamic Lazy Initialization for Google GenAI SDK to prevent startup crashes
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but not configured.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

const app = express();
const PORT = 3000;

// Set up JSON parsing with generous limits for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dynamic Expense Extraction schema generator
function createExpenseExtractionSchema(categories: string[]) {
  return {
    type: Type.OBJECT,
    properties: {
      fecha: {
        type: Type.STRING,
        description: "La fecha de la transacción en formato YYYY-MM-DD. Si no es legible, intenta inferirla o déjala vacía.",
      },
      comercio: {
        type: Type.STRING,
        description: "Nombre del comercio o establecimiento. Ejm: 'Supermercado Central'. Si no existe, dejar vacío o inferir.",
      },
      monto_total: {
        type: Type.NUMBER,
        description: "Monto total real facturado. Debe ser un número decimal.",
      },
      moneda: {
        type: Type.STRING,
        description: "Código ISO de la moneda (ej. MXN, USD, EUR, ARS, CLP, COP). Por defecto intenta deducirla del ticket o texto, o asume USD si no hay otra referencia.",
      },
      impuestos: {
        type: Type.NUMBER,
        description: "Monto cobrado por concepto de impuestos o IVA. Si no se puede deducir, establecer en 0.",
      },
      categoria: {
        type: Type.STRING,
        description: `Categoría de gasto asignada de forma estricta. Debe ser exactamente una de estas: ${categories.map(c => `'${c}'`).join(", ")}.`,
      },
      descripcion: {
        type: Type.STRING,
        description: "Un breve resumen explicativo del gasto o de lo comprado en español.",
      },
      elementos: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING, description: "Nombre del producto o servicio." },
            precio: { type: Type.NUMBER, description: "Precio unitario o subtotal del grupo." },
            cantidad: { type: Type.NUMBER, description: "Cantidad comprada de este elemento." }
          },
          required: ["nombre"]
        },
        description: "Listado estructurado de los elementos detallados en el ticket si están visibles.",
      },
      advertencias: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Lista de advertencias si falta información crucial como el monto, comercio o si los datos no son nítidos.",
      },
      confirmacion: {
        type: Type.STRING,
        description: "Mensaje confirmando la operación en el formato estricto: 'Registro procesado: [Monto] [Moneda] en [Categoría]'.",
      }
    },
    required: ["categoria", "monto_total", "moneda", "confirmacion"]
  };
}

// System instruction generator for financial analyst persona with dynamic categories
function getFinancialAnalystSystemInstruction(categories: string[]) {
  return `Eres un Asistente Ejecutivo de Finanzas y Analista de Datos de alta precisión.
Tu función principal es registrar, clasificar y analizar gastos personales y operativos.
Debes estructurar la información con el mayor grado de veracidad posible y adherirte de forma estricta a una de las siguientes categorías que el usuario tiene habilitadas en su cuenta:
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Si falta información crucial en el ticket (como el monto total o el comercio), debes documentar esa advertencia en la propiedad 'advertencias'.
Cumple estrictamente con el formato de confirmación. Tu confirmación debe ser 'Registro procesado: [Monto] [Moneda] en [Categoría]'. Ejemplo: 'Registro procesado: 450.00 MXN en ${categories[0] || "Otros"}'. No agregues texto adicional a ese campo.`;
}

// API route to health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API route to process uploaded receipts via images (multimodal)
app.post("/api/analyze-receipt", async (req, res) => {
  const { image, mimeType, descriptionPrompt, categories: clientCategories } = req.body;

  if (!image || !mimeType) {
    return res.status(400).json({ error: "Se requiere la imagen codificada en Base64 y su mimeType correspondiente (ej. image/png)." });
  }

  const activeCategories = Array.isArray(clientCategories) && clientCategories.length > 0
    ? clientCategories
    : ["Insumos", "Logística", "Servicios", "Viáticos", "Personal", "Otros"];

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: image,
      },
    };

    const textPart = {
      text: `Analiza esta imagen de comprobante o ticket financiero. ${descriptionPrompt || ""} Extrae la información estructurada de transacción y clasifica el gasto.`,
    };

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: getFinancialAnalystSystemInstruction(activeCategories),
        responseMimeType: "application/json",
        responseSchema: createExpenseExtractionSchema(activeCategories),
        temperature: 0.1,
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error analizando recibo por Gemini:", error);
    res.status(500).json({ error: "Fallo al procesar el recibo por Inteligencia Artificial: " + (error?.message || error) });
  }
});

// API route to process free text description of expense
app.post("/api/analyze-text", async (req, res) => {
  const { text, categories: clientCategories } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Se requiere una descripción de texto para analizar." });
  }

  const activeCategories = Array.isArray(clientCategories) && clientCategories.length > 0
    ? clientCategories
    : ["Insumos", "Logística", "Servicios", "Viáticos", "Personal", "Otros"];

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Normaliza este texto libre sobre gastos y extrae los datos correctamente clasificados: "${text}"`,
      config: {
        systemInstruction: getFinancialAnalystSystemInstruction(activeCategories),
        responseMimeType: "application/json",
        responseSchema: createExpenseExtractionSchema(activeCategories),
        temperature: 0.1,
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error analizando texto de gasto por Gemini:", error);
    res.status(500).json({ error: "Fallo al procesar la descripción de gasto: " + (error?.message || error) });
  }
});

// Setup Vite middleware in Development mode, otherwise static folder
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Highly robust catch-all fallback to serve and transform index.html under Vite dev mode
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import("fs");
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Highly robust, multi-path validation for production static files
    const fs = await import("fs");
    let distPath = path.resolve(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = __dirname;
      if (!fs.existsSync(path.join(distPath, "index.html"))) {
        distPath = path.resolve(__dirname, "..", "dist");
      }
    }

    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`Error: El archivo de la aplicación (index.html) no se encontró. Ruta intentada: ${indexPath}`);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT} under NODE_ENV=${process.env.NODE_ENV}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start server", err);
});
