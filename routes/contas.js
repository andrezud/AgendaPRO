const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * FUNÇÃO AUXILIAR: Gerar Slug
 * Transforma "Barbearia do Andre" em "barbearia-do-andre"
 */
function gerarSlug(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, '-')     // Substitui símbolos por hífen
        .replace(/-+/g, '-')             // Remove hífens duplicados
        .replace(/^-+|-+$/g, '');        // Remove hífens das extremidades
}

// ==========================================
// 1. ROTA: CADASTRAR (POST /api/register)
// ==========================================
router.post('/api/register', async (req, res) => {
    const { businessName, email, whatsapp, password } = req.body;

    if (!businessName || !email || !password) {
        return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    }

    try {
        const slug = gerarSlug(businessName);
        const sql = "INSERT INTO contas (nome, slug, email, whatsapp, senha, tipo) VALUES (?, ?, ?, ?, ?, 'admin')";
        
        const result = await db.query(sql, [businessName, slug, email, whatsapp, password]);
        
        console.log(`✅ [CADASTRO] Novo usuário: ${businessName}`);
        res.status(201).json({ message: "Conta criada com sucesso!", id: result.insertId });
    } catch (err) {
        console.error("❌ [ERRO CADASTRO]:", err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Este e-mail ou nome de negócio já está em uso." });
        }
        res.status(500).json({ error: "Erro interno ao criar conta." });
    }
});

// ==========================================
// 2. ROTA: LOGIN (POST /api/login)
// ==========================================
router.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const sql = "SELECT id, nome, slug, senha FROM contas WHERE email = ? LIMIT 1";
        const rows = await db.query(sql, [email]);

        if (rows.length === 0 || rows[0].senha !== password) {
            return res.status(401).json({ error: "E-mail ou senha incorretos." });
        }

        res.json({
            message: "Login realizado!",
            user: { id: rows[0].id, nome: rows[0].nome, slug: rows[0].slug }
        });
    } catch (err) {
        res.status(500).json({ error: "Erro ao processar login." });
    }
});

// ==========================================
// 3. ROTA: BUSCAR PERFIL (GET /api/me/:id)
// ==========================================
router.get('/api/me/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await db.query("SELECT id, nome, slug, email, whatsapp, tipo FROM contas WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar perfil." });
    }
});

// ==========================================
// 4. ROTA: ATUALIZAR (PUT /api/contas/:id)
// ==========================================
router.put('/api/contas/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, whatsapp, senhaAtual, novaSenha } = req.body;
    try {
        const rows = await db.query("SELECT senha FROM contas WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });

        let senhaFinal = rows[0].senha;
        if (novaSenha) {
            if (senhaAtual !== rows[0].senha) return res.status(401).json({ error: "Senha atual incorreta." });
            senhaFinal = novaSenha;
        }

        const novoSlug = gerarSlug(nome);
        await db.query("UPDATE contas SET nome=?, slug=?, email=?, whatsapp=?, senha=? WHERE id=?", 
        [nome, novoSlug, email, whatsapp, senhaFinal, id]);

        res.json({ message: "Dados atualizados!", user: { id, nome, slug: novoSlug } });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar." });
    }
});

// ==========================================
// 5. ROTA: EXCLUIR CONTA (DELETE /api/contas/:id)
// ==========================================
router.delete('/api/contas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log(`⚠️ Iniciando exclusão total da conta ID: ${id}`);

        // ORDEM DE EXCLUSÃO (Cascata Manual)
        // 1. Apaga agendamentos (pois dependem de serviços e funcionários)
        await db.query("DELETE FROM agendamentos WHERE usuario_id = ?", [id]);
        
        // 2. Apaga serviços e funcionários
        await db.query("DELETE FROM servicos WHERE usuario_id = ?", [id]);
        await db.query("DELETE FROM funcionarios WHERE usuario_id = ?", [id]);
        
        // 3. Apaga configurações da loja (se houver a tabela)
        try {
            await db.query("DELETE FROM config_loja WHERE usuario_id = ?", [id]);
        } catch (e) {
            // Ignora se a tabela não existir ainda
        }

        // 4. Por fim, apaga a conta do usuário
        const result = await db.query("DELETE FROM contas WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Conta não encontrada para exclusão." });
        }

        console.log(`✅ Conta ${id} e todos os seus dados foram removidos.`);
        res.json({ message: "Sua conta foi excluída permanentemente junto com todos os dados." });

    } catch (err) {
        console.error("❌ ERRO AO EXCLUIR CONTA:", err);
        res.status(500).json({ 
            error: "Erro interno ao tentar excluir a conta.",
            details: err.message 
        });
    }
});

module.exports = router;