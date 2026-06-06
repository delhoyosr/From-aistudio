import os
import base64
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Cargar variables de entorno del archivo .env
load_dotenv()

# Inicialización segura del cliente Gemini utilizando el SDK moderno 'google-genai'
# Para instalarlo: pip install google-genai fastapi uvicorn pydantic python-dotenv
def get_gemini_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("La variable de entorno GEMINI_API_KEY no está configurada.")
    return genai.Client(api_key=api_key)

app = FastAPI(
    title="Analizador Financiero de Gastos (Gemini AI Backend)",
    description="Backend en Python listo para producción traducido desde Express.ts",
    version="1.0.0"
)

# Configuración de CORS para permitir conexiones desde el cliente React u otros dominios
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS PYDANTIC ---

class ElementoItem(BaseModel):
    nombre: str = Field(description="Nombre del producto o servicio comprado.")
    precio: Optional[float] = Field(None, description="Precio unitario o subtotal del artículo.")
    cantidad: Optional[float] = Field(None, description="Cantidad adquirida.")

class ExpenseExtraction(BaseModel):
    fecha: Optional[str] = Field(None, description="La fecha en formato YYYY-MM-DD.")
    comercio: Optional[str] = Field(None, description="Nombre del establecimiento o comercio.")
    monto_total: float = Field(description="Monto total cobrado. Debe ser un decimal.")
    moneda: str = Field(description="Código ISO de moneda (ej: USD, MXN, EUR).")
    impuestos: Optional[float] = Field(0.0, description="Monto del impuesto/IVA incluido.")
    categoria: str = Field(description="Categoría a la que pertenece el gasto.")
    descripcion: Optional[str] = Field(None, description="Breve resumen del gasto en español.")
    elementos: List[ElementoItem] = Field(default_factory=list, description="Desglose detallado de productos/servicios.")
    advertencias: List[str] = Field(default_factory=list, description="Advertencias o notas de auditoría contable.")
    confirmacion: str = Field(description="Confirmación obligatoria en formato: 'Registro procesado: [monto] [moneda] en [categoria]'.")

# --- MODELOS DE ENTRADA (MIGRADO DE EXPRESS) ---

class AnalyzeReceiptRequest(BaseModel):
    image: str = Field(description="Imagen del ticket en Base64 sin prefijo 'data:*/*;base64,'.")
    mimeType: str = Field(description="Tipo MIME de la imagen, ej: 'image/png' o 'image/jpeg'.")
    descriptionPrompt: Optional[str] = Field(None, description="Sugerencia o contexto adicional por el usuario.")
    categories: Optional[List[str]] = Field(None, description="Categorías vigentes de la cuenta.")

class AnalyzeTextRequest(BaseModel):
    text: str = Field(description="Texto libre o transcripción a estructurar.")
    categories: Optional[List[str]] = Field(None, description="Categorías vigentes de la cuenta.")


# --- PROMPTS Y SISTEMA DE INSTRUCCIÓN ---

def get_financial_analyst_system_instruction(categories: List[str]) -> str:
    category_list = "\n".join([f"{i + 1}. {c}" for i, c in enumerate(categories)])
    return f"""Eres un Asistente Ejecutivo de Finanzas y Analista de Datos de alta precisión.
Tu función principal es registrar, clasificar y analizar gastos personales y operativos.
Debes estructurar la información con el mayor grado de veracidad posible y adherirte de forma estricta a una de las siguientes categorías que el usuario tiene habilitadas en su cuenta:
{category_list}

Si falta información crucial en el ticket (como el monto total o el comercio), debes documentar esa advertencia en la propiedad 'advertencias'.
Cumple estrictamente con el formato de confirmación. Tu confirmación debe ser 'Registro procesado: [Monto] [Moneda] en [Categoría]'. Ejemplo: 'Registro procesado: 450.00 MXN en {categories[0] if categories else "Otros"}'. No agregues texto adicional a ese campo."""


# --- RUTAS DE LA API ---

@app.get("/api/health")
def health_check():
    """Verifica la conectividad y el estado del servicio."""
    import datetime
    return {
        "status": "ok", 
        "time": datetime.datetime.utcnow().isoformat() + "Z",
        "service": "python-fastapi-backend"
    }

@app.post("/api/analyze-receipt", response_model=ExpenseExtraction)
async def analyze_receipt(req: AnalyzeReceiptRequest):
    """
    Recibe la imagen base64 de un recibo o factura y extrae 
    toda la información de forma estructurada con Gemini 3.5.
    """
    active_categories = req.categories if req.categories and len(req.categories) > 0 else [
        "Insumos", "Logística", "Servicios", "Viáticos", "Personal", "Otros"
    ]

    try:
        # Preparación de la parte multimedio de la imagen
        image_part = types.Part.from_bytes(
            data=base64.b64decode(req.image),
            mime_type=req.mimeType
        )

        user_prompt = f"Analiza esta imagen de comprobante o ticket financiero. {req.descriptionPrompt or ''} Extrae la información estructurada de transacción y clasifica el gasto."
        
        client = get_gemini_client()
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=[image_part, user_prompt],
            config=types.GenerateContentConfig(
                system_instruction=get_financial_analyst_system_instruction(active_categories),
                response_mime_type="application/json",
                response_schema=ExpenseExtraction,
                temperature=0.1,
            )
        )
        
        # Como usamos response_schema, FastAPI parsea automáticamente la respuesta JSON a nuestro modelo ExpenseExtraction
        return response.text

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error procesando el recibo con Gemini: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Fallo al procesar el recibo por Inteligencia Artificial: {str(e)}"
        )

@app.post("/api/analyze-text", response_model=ExpenseExtraction)
async def analyze_text(req: AnalyzeTextRequest):
    """
    Analiza una descripción de texto libre insertada por el usuario,
    extrayendo montos, establecimientos y clasificándolo en las categorías válidas.
    """
    active_categories = req.categories if req.categories and len(req.categories) > 0 else [
        "Insumos", "Logística", "Servicios", "Viáticos", "Personal", "Otros"
    ]

    try:
        prompt = f'Normaliza este texto libre sobre gastos y extrae los datos correctamente clasificados: "{req.text}"'
        
        client = get_gemini_client()
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=get_financial_analyst_system_instruction(active_categories),
                response_mime_type="application/json",
                response_schema=ExpenseExtraction,
                temperature=0.1,
            )
        )
        
        return response.text

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error analizando texto con Gemini: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Fallo al procesar la descripción de gasto: {str(e)}"
        )


# Para correr el servidor localmente:
# uvicorn server:app --host 0.0.0.0 --port 8000 --reload
if __name__ == "__main__":
    import uvicorn
    # En desarrollo local:
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
