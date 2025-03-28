FROM node:16
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | bash
EXPOSE 11434
CMD ["bash", "-c", "ollama run Volko76/llama3.2-instruct-french:1b & node app.js"]