"""Detection interface. No model is bundled: results are never fabricated."""
import os


class ModelNotConfigured(RuntimeError):
    pass


def detect(image_path: str) -> list[dict]:
    weights = os.getenv("YOLO_WEIGHTS")
    if not weights:
        raise ModelNotConfigured("Set YOLO_WEIGHTS to a trained YOLO .pt file to enable detection")
    from ultralytics import YOLO  # imported lazily
    res = YOLO(weights)(image_path)[0]
    return [{"type": res.names[int(b.cls)], "conf": float(b.conf), "xyxy": [float(x) for x in b.xyxy[0]]} for b in res.boxes]
