FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
