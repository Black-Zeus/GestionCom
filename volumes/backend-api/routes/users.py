from fastapi import APIRouter

router = APIRouter()

@router.get("/getAll")
async def get_all_users():
    return {"usuarios": ["Juan", "Pedro", "Maria"]}
