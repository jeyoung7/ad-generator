FROM node:20-bookworm

# Install FFmpeg and native dependencies for canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
    python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build frontend (tsc + vite)
RUN npm run build

EXPOSE 3001

CMD ["node", "--import", "tsx", "server/index.ts"]
