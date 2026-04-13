FROM python:3.12

WORKDIR /fastapi

# Install uv and sync dependencies (no project install; we copy app next).
# README.md is required by hatchling when the local package is built (e.g. uv run).
COPY pyproject.toml uv.lock README.md ./
RUN pip install uv \
    && uv sync --no-install-project --frozen

COPY app ./app
COPY config.py main.py ./

CMD ["uv", "run", "python", "main.py"]
