from fastapi import FastAPI
from routes import pdf_routes, xlsx_routes, docx_routes

app = FastAPI()

# Incluir rutas con prefijos específicos
app.include_router(pdf_routes.router, prefix="/pdf")
app.include_router(xlsx_routes.router, prefix="/xlsx")
app.include_router(docx_routes.router, prefix="/docx")

@app.get("/health")
async def health_check():
    return {"status": "ok - Docs"}
