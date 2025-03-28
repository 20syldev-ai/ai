FROM node:16
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | bash
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 11434 5000
CMD bash -c "ollama serve & sleep 5 && ollama pull Volko76/qwen2.5-instruct-french && node app.js"