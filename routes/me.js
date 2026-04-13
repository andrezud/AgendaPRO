const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ROTA: Login / Autenticação
router.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    try {
        const sql = "SELECT id, nome, slug, email, whatsapp, senha, tipo FROM contas WHERE email = ? LIMIT 1";
        const rows = await db.query(sql, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: "E-mail não encontrado." });
        }

        const usuario = rows[0];

        if (usuario.senha !== password) {
            return res.status(401).json({ error: "Senha incorreta." });
        }

        console.log(`✅ [LOGIN] ${usuario.nome} acessou o sistema.`);
        
        // No login, retornamos apenas o essencial. O resto o Dashboard busca no /api/me
        res.json({
            message: "Login realizado com sucesso!",
            user: {
                id: usuario.id,
                nome: usuario.nome,
                slug: usuario.slug
            }
        });

    } catch (err) {
        console.error("❌ [ERRO LOGIN]:", err.message);
        res.status(500).json({ error: "Erro ao processar login." });
    }
});

/**
 * ROTA: Buscar dados em tempo real para o Dashboard
 * Essa rota garante que o Dashboard não dependa de dados velhos no LocalStorage
 */
router.get('/api/me/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const sql = "SELECT id, nome, slug, email, whatsapp, tipo, criado_em FROM contas WHERE id = ? LIMIT 1";
        const rows = await db.query(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // Retorna a "Verdade do Banco de Dados"
        res.json(rows[0]);
    } catch (err) {
        console.error("❌ [ERRO AO BUSCAR DADOS DO PERFIL]:", err.message);
        res.status(500).json({ error: "Erro interno ao buscar dados." });
    }
});

// ROTA: Listar todos os usuários (Admin/Busca)
router.get('/api/usuarios', async (req, res) => {
    try {
        const sql = "SELECT id, nome, slug, email, whatsapp, criado_em FROM contas";
        const rows = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error("❌ [ERRO AO BUSCAR USUÁRIOS]:", err.message);
        res.status(500).json({ error: "Erro ao listar usuários." });
    }
});

module.exports = router;