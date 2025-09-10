from fastapi import FastAPI, HTTPException
from typing import List, Dict, Union

app = FastAPI(title="format-service")

# Реестр доступных конвертеров и их поддерживаемых форматов
CONVERTERS = {
    "image-service": {
        "input_formats": ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"],
        "output_formats": ["png", "jpg", "jpeg", "webp"]
    },
    # В будущем можно добавить:
    # "pdf-service": {
    #     "input_formats": ["pdf"],
    #     "output_formats": ["png", "jpg", "txt"]
    # },
    # "video-service": {
    #     "input_formats": ["mp4", "avi", "mov"],
    #     "output_formats": ["mp4", "webm", "gif"]
    # }
}

@app.get("/available-formats/{file_format}")
async def get_available_formats(file_format: str) -> Dict[str, Union[str, List[str]]]:
    """
    Возвращает доступные форматы для конвертации из указанного формата
    """
    file_format = file_format.lower().lstrip('.')
    
    available_converters = []
    all_output_formats = set()
    
    for service_name, config in CONVERTERS.items():
        if file_format in config["input_formats"]:
            available_converters.append(service_name)
            all_output_formats.update(config["output_formats"])
    
    if not available_converters:
        raise HTTPException(
            status_code=404, 
            detail=f"Формат '{file_format}' пока не поддерживается для конвертации"
        )
    
    return {
        "input_format": file_format,
        "available_converters": available_converters,
        "output_formats": sorted(list(all_output_formats))
    }

@app.get("/supported-formats")
async def get_supported_formats() -> Dict[str, List[str]]:
    """
    Возвращает все поддерживаемые входные форматы
    """
    all_input_formats = set()
    for config in CONVERTERS.values():
        all_input_formats.update(config["input_formats"])
    
    return {
        "supported_input_formats": sorted(list(all_input_formats))
    }

@app.get("/health")
def health():
    return {"status": "ok"}
