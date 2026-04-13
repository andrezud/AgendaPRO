const express = require('express');
const router = express.Router();
const db = require('../config/db');
const path = require('path');

/**
 * ROTA DE NAVEGAÇÃO
 */
router.get('/v/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/agendapro/vitrine/index.html'));
});

/**
 * ROTA DA API DE DADOS
 */
router.get('/api/vitrine-cliente/dados/:slug', async (req, res) => {
    const { slug } = req.params;

    try {
        // 1. Busca a conta (loja)
        const lojas = await db.query(
            "SELECT id, nome, slug, email, whatsapp FROM contas WHERE LOWER(slug) = ? LIMIT 1",
            [slug.toLowerCase()]
        );

        if (!lojas || lojas.length === 0) {
            return res.status(404).json({ error: "Loja não encontrada." });
        }

        const loja = lojas[0];
        const usuarioId = loja.id;

        // 2. Busca as configurações
        const configRows = await db.query(
            "SELECT * FROM config_loja WHERE usuario_id = ? LIMIT 1",
            [usuarioId]
        );

        if (configRows.length > 0) {
            loja.foto_loja = configRows[0].foto_loja; 
        }

        // 3. Busca os serviços
        const servicos = await db.query(
            "SELECT id, nome, descricao, preco, duracao, foto1, foto2 FROM servicos WHERE usuario_id = ?",
            [usuarioId]
        );

        // 4. Busca os funcionários
        // ATUALIZADO: Buscando 'servicos_especializados' que contém a string de IDs (ex: "1,2,5")
        const funcionarios = await db.query(
            "SELECT id, nome, servicos_especializados, dias_trabalho, foto FROM funcionarios WHERE usuario_id = ?",
            [usuarioId]
        );

        res.json({
            loja: loja,
            servicos: servicos || [],
            funcionarios: funcionarios || [],
            configuracoes: configRows.length > 0 ? configRows[0] : null
        });

    } catch (err) {
        console.error("❌ Erro ao processar dados da vitrine:", err.message);
        res.status(500).json({ error: "Erro interno ao carregar a vitrine." });
    }
});

module.exports = router;