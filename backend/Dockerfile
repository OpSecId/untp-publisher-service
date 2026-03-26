FROM python:3.12

WORKDIR /fastapi

# Install uv and sync dependencies (no project install; we copy app next)
COPY pyproject.toml uv.lock ./
RUN pip install uv \
    && uv sync --no-install-project --frozen

COPY app ./app
COPY untp ./untp
COPY config.py main.py ./

CMD ["uv", "run", "python", "main.py"]
