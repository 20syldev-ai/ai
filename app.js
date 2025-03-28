import cors from 'cors';
import dotenv from 'dotenv';
import express, { urlencoded, json } from 'express';
import fetch from 'node-fetch';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();

// Define allowed models & rate limits
const models = ['llama3.2'], rateLimits = {}, contextMemory = {};

// Define global variables
let requests = 0, resetTime = Date.now() + 10000;

// ----------- ----------- MIDDLEWARES SETUP ----------- ----------- //

dotenv.config();

// CORS & Express setup
app.use(cors({ methods: ['GET', 'POST'] }));
app.use(urlencoded({ extended: true }));
app.use(json());

// Set favicon for API
app.use('/favicon.ico', express.static(join(__dirname, 'src', 'favicon.ico')));

// Display robots.txt
app.use('/robots.txt', express.static(join(__dirname, 'robots.txt')));

// Return formatted JSON
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.jsonResponse = (data) => {
        res.send(JSON.stringify(data, null, 2));
    };
    next();
});

// Too many requests
app.use((req, res, next) => {
    if (Date.now() > resetTime) requests = 0, resetTime = Date.now() + 10000;
    if (++requests > 1000) return res.status(429).jsonResponse({ message: 'Too Many Requests' });
    next();
});

// Internal Server Error
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        status: '500'
    });
});

// Check if model exists
app.use('/:model', (req, res, next) => {
    const { model } = req.params;

    if (!models.includes(model)) {
        return res.status(404).jsonResponse({
            message: 'Not Found',
            error: `Invalid AI model (${model}).`,
            status: '404'
        });
    }
    next();
});

// ----------- ----------- MAIN ENDPOINTS ----------- ----------- //

// Main route
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.jsonResponse({
        models: {
            llama3_2: 'https://ai.sylvain.pro/llama3.2'
        }
    });
});

// ----------- ----------- GET ENDPOINTS ----------- ----------- //

// Redirect model to ai
app.get('/:model', (req, res) => {
    res.redirect(301, `/${req.params.model}/ai`);
});

// GET ai error
app.get('/:model/ai', (req, res) => {
    res.jsonResponse({ error: 'This endpoint only supports POST requests.' });
});

// ----------- ----------- POST ENDPOINTS ----------- ----------- //

// IA Llama3.2
app.post('/:model/ai', async (req, res) => {
    const { prompt, session } = req.body;

    if (!prompt) return res.jsonResponse({ error: 'Please provide a valid prompt (?prompt={message})' });
    if (!session || typeof session !== 'string') return res.jsonResponse({ error: 'Please provide a valid session ID (&session={ID})' });

    const now = Date.now();
    const context = contextMemory[session] || [];

    rateLimits[session] = (rateLimits[session] || []).filter(ts => now - ts < 10000);
    if (rateLimits[session].length > 50) {
        const remainingTime = Math.ceil((rateLimits[session][0] + 10000 - now) / 1000);
        return res.jsonResponse({ error: `Rate limit exceeded. Try again in ${remainingTime} seconds.` });
    }
    rateLimits[session].push(now);

    try {
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.DEFAULT_MODEL,
                prompt,
                context,
                stream: false
            })
        });
        const { context: memory, ...answer } = await response.json();
        contextMemory[session] = memory;

        res.jsonResponse(answer);
    } catch (err) {
        res.jsonResponse({ error: 'AI not responding.' });
    }
});

// ----------- ----------- SERVER SETUP ----------- ----------- //

app.listen(5000, () => console.log('AI is running on\n    - http://127.0.0.1:5000\n    - http://localhost:5000'));
