import json
import os
import threading
import time
from collections import defaultdict
from typing import Dict, Any

import pika
from fastapi import FastAPI

app = FastAPI(title="stats-service")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")

metrics: Dict[str, Any] = {
    "total_conversions": 0,
    "errors": 0,
    "by_format": defaultdict(int),
    "last_event_ts": None,
}


def consume_metrics():
    while True:
        try:
            params = pika.URLParameters(RABBITMQ_URL)
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.exchange_declare(exchange="metrics", exchange_type="fanout", durable=True)
            queue = channel.queue_declare(queue="", exclusive=True)
            qname = queue.method.queue
            channel.queue_bind(exchange="metrics", queue=qname)

            for method_frame, properties, body in channel.consume(qname, inactivity_timeout=1):
                if body is None:
                    continue
                try:
                    event = json.loads(body.decode("utf-8"))
                    metrics["last_event_ts"] = event.get("ts")
                    if event.get("event") == "convert_success":
                        metrics["total_conversions"] += 1
                        fmt = (event.get("output_format") or "").lower()
                        if fmt:
                            metrics["by_format"][fmt] += 1
                    elif event.get("event") == "convert_error":
                        metrics["errors"] += 1
                except Exception:
                    pass
                finally:
                    if method_frame:
                        channel.basic_ack(method_frame.delivery_tag)
        except Exception:
            time.sleep(2)


thread = threading.Thread(target=consume_metrics, daemon=True)
thread.start()


@app.get("/metrics")
def get_metrics():
    # Convert defaultdict to dict for JSON serialization
    data = dict(metrics)
    data["by_format"] = dict(metrics["by_format"])
    return data

@app.get("/health")
def health():
    return {"status": "ok"}


