FROM node:16
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | bash
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 11434 5000
CMD bash -c "ollama serve & while ! nc -z localhost 11434; do sleep 1; done && ollama pull Volko76/llama3.2-instruct-french:1b && node app.js"