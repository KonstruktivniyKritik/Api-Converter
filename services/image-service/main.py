import io
import os
import time
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from PIL import Image
import pika

app = FastAPI(title="image-service")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def publish_metric(event: str, details: dict) -> None:
    try:
        params = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.exchange_declare(exchange="metrics", exchange_type="fanout", durable=True)
        payload = {
            "service": "image-service",
            "event": event,
            "ts": int(time.time()),
            **details,
        }
        import json

        channel.basic_publish(exchange="metrics", routing_key="", body=json.dumps(payload).encode("utf-8"))
        connection.close()
    except Exception:
        pass


@app.post("/convert")
async def convert_image(file: UploadFile = File(...), format: str = Form("png")):
    try:
        content = await file.read()
        im = Image.open(io.BytesIO(content))
        format_upper = format.upper()
        out_io = io.BytesIO()
        save_kwargs = {}
        if format_upper in ("JPG", "JPEG"):
            format_upper = "JPEG"
            save_kwargs["quality"] = 90
        im.save(out_io, format_upper, **save_kwargs)
        out_io.seek(0)

        publish_metric("convert_success", {"input": file.filename, "output_format": format_upper})

        filename = os.path.splitext(file.filename or "file")[0] + "." + format.lower()
        headers = {"Content-Disposition": f"attachment; filename=\"{filename}\""}
        return StreamingResponse(out_io, media_type=f"image/{format.lower()}", headers=headers)
    except Exception as e:
        publish_metric("convert_error", {"error": str(e)})
        raise HTTPException(status_code=400, detail="Ошибка конвертации")


@app.get("/health")
def health():
    return {"status": "ok"}


