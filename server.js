require('dotenv').config({ silent: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const autoload = require('./utils/autoload');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Disponibiliza o 'io' para as rotas em /routes
app.set('io', io);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ARQUIVOS ESTÁTICOS ---

// 1. Define a pasta 'public' como raiz para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 2. Garante acesso direto à pasta assets (onde está o alerta.mp3)
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// 3. Serve a pasta de uploads (fotos de serviços/perfil)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- CARREGAMENTO AUTOMÁTICO DE ROTAS API ---
// Isso carrega tudo que está na pasta /routes automaticamente
autoload(app);

// --- CONFIGURAÇÃO DE ROTAS DE NAVEGAÇÃO (FRONT-END) ---

// Home Geral
app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/home/index.html'));
});

// AgendaPro - Landing Page
app.get('/agendapro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/agendapro/home/index.html'));
});

// AgendaPro - Dashboard (Onde o som deve tocar)
app.get('/agendapro/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/agendapro/dashboard/index.html'));
});

// AgendaPro - Login
app.get('/agendapro/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/agendapro/login/index.html'));
});

// --- TRATAMENTO DE ERRO 404 ---
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align: center; margin-top: 50px; font-family: 'Plus Jakarta Sans', sans-serif;">
            <h1>404</h1>
            <p>Ops! Essa página não existe no sistema.</p>
            <a href="/agendapro/dashboard">Voltar para o Painel</a>
        </div>
    `);
});

// --- SOCKET.IO: MONITOR DE CONEXÃO ---
io.on('connection', (socket) => {
    console.log(`📡 Dispositivo conectado ao Realtime: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log('❌ Dispositivo desconectado.');
    });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.clear();
    console.log('-------------------------------------------');
    console.log('           AGENDA PRO - SERVER             ');
    console.log('-------------------------------------------');
    console.log(`✅ STATUS:  Online`);
    console.log(`🏠 LOCAL:   http://localhost:${PORT}`);
    console.log(`🔔 ÁUDIO:   /assets/alerta.mp3 pronto`);
    console.log('-------------------------------------------');
});