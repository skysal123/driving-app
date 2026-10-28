import base64
import io
import re
import uuid
from pathlib import Path

from flask import current_app, url_for
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from PIL import Image, ImageOps, UnidentifiedImageError

DATA_URL = re.compile(r"^data:image/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\r\n]+)$", re.IGNORECASE)


class MediaError(ValueError):
    pass


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="drivedesk-media-v1")


def save_image(data_url, school_id, kind):
    if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
        raise MediaError("Upload a PNG, JPEG or WebP image.")

    match = DATA_URL.match(data_url.strip())
    if not match:
        raise MediaError("Upload a valid image file.")

    try:
        raw = base64.b64decode(match.group(2), validate=True)
    except Exception as exc:
        raise MediaError("The image data could not be read.") from exc

    if len(raw) > current_app.config["MAX_IMAGE_BYTES"]:
        raise MediaError("The image is too large. Use one under 4 MB.")

    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise MediaError("The image file is not valid.") from exc

    image = ImageOps.exif_transpose(image)
    ext = "png" if kind == "signature" else "jpg"
    if kind == "signature":
        image = image.convert("RGBA")
        if max(image.size) > 1000:
            image.thumbnail((1000, 1000))
        save_args = {"format": "PNG", "optimize": True}
    else:
        image = image.convert("RGB")
        if max(image.size) > 1280:
            image.thumbnail((1280, 1280))
        save_args = {"format": "JPEG", "quality": 85, "optimize": True}

    folder = Path(current_app.config["UPLOAD_FOLDER"]) / str(school_id) / kind
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    image.save(folder / name, **save_args)
    return f"{school_id}/{kind}/{name}"


def media_url(relative_path):
    if not relative_path:
        return None
    token = _serializer().dumps(relative_path)
    return url_for("media_file", token=token, _external=True)


def load_media_path(token):
    try:
        relative_path = _serializer().loads(token, max_age=current_app.config["MEDIA_URL_TTL"])
    except SignatureExpired as exc:
        raise MediaError("This media link has expired.") from exc
    except BadSignature as exc:
        raise MediaError("This media link is not valid.") from exc

    base = Path(current_app.config["UPLOAD_FOLDER"]).resolve()
    candidate = (base / relative_path).resolve()
    if base != candidate and base not in candidate.parents:
        raise MediaError("This media link is not valid.")
    if not candidate.is_file():
        raise MediaError("This media file is missing.")
    return candidate
