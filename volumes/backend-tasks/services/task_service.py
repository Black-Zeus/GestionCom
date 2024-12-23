import uuid

# Diccionario que simula el almacenamiento de tareas
tasks = {
    "1234": "En progreso",
    "5678": "Completada"
}

# Función para obtener el estado de una tarea
def get_task_status(task_id: str):
    return tasks.get(task_id)

# Función para crear una nueva tarea
def create_task(task_name: str):
    new_task_id = str(uuid.uuid4())[:8]  # Genera un ID único
    tasks[new_task_id] = "Pendiente"
    return new_task_id
