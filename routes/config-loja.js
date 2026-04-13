const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ==========================================
//    CONFIGURAÇÃO DO MULTER (UPLOADS)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Define a pasta baseada no campo que vem do formulário
        let folder = './uploads/servicos';
        if (file.fieldname === 'foto_loja') {
            folder = './uploads/lojas';
        }

        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Auxiliar para apagar fotos físicas do servidor (Evita lixo no servidor)
const apagarArquivosFisicos = (fotosArray) => {
    fotosArray.forEach(fotoPath => {
        if (fotoPath && typeof fotoPath === 'string') {
            // Remove a barra inicial se existir para o path.join funcionar corretamente
            const cleanPath = fotoPath.startsWith('/') ? fotoPath.substring(1) : fotoPath;
            const caminhoAbsoluto = path.join(process.cwd(), cleanPath);
            
            if (fs.existsSync(caminhoAbsoluto)) {
                try {
                    fs.unlinkSync(caminhoAbsoluto);
                    console.log(`✅ Arquivo removido: ${cleanPath}`);
                } catch (err) {
                    console.error(`❌ Erro ao deletar arquivo: ${err.message}`);
                }
            }
        }
    });
};

// ==========================================
//   1. ROTAS DE CONFIGURAÇÃO GERAL DA LOJA
// ==========================================

// Salvar ou Atualizar (Horários + Foto da Loja)
router.post('/api/config-loja', upload.single('foto_loja'), async (req, res) => {
    const { usuario_id, abre, fecha, pausa_ini, pausa_fim, dias_aberto } = req.body;
    
    if (!usuario_id) return res.status(400).json({ error: "ID do usuário é obrigatório" });

    try {
        let fotoCaminho = null;
        if (req.file) {
            fotoCaminho = req.file.path.replace(/\\/g, "/");
            
            // Opcional: Apagar a foto antiga antes de salvar a nova
            const configAntiga = await db.query("SELECT foto_loja FROM config_loja WHERE usuario_id = ?", [usuario_id]);
            if (configAntiga.length > 0 && configAntiga[0].foto_loja) {
                apagarArquivosFisicos([configAntiga[0].foto_loja]);
            }
        }

        // Preparamos a query de inserção ou atualização (UPSERT)
        // Se houver foto nova, ela entra no update, se não, mantemos a atual
        let sql = `
            INSERT INTO config_loja 
            (usuario_id, hora_abre, hora_fecha, almoco_ini, almoco_fim, dias_aberto, foto_loja)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            hora_abre=VALUES(hora_abre), 
            hora_fecha=VALUES(hora_fecha), 
            almoco_ini=VALUES(almoco_ini), 
            almoco_fim=VALUES(almoco_fim), 
            dias_aberto=VALUES(dias_aberto)
            ${fotoCaminho ? ", foto_loja=VALUES(foto_loja)" : ""}
        `;

        let params = [usuario_id, abre, fecha, pausa_ini, pausa_fim, dias_aberto, fotoCaminho];

        await db.query(sql, params);
        res.json({ message: "Configurações salvas com sucesso!", foto: fotoCaminho });
    } catch (err) {
        console.error("❌ Erro em POST /api/config-loja:", err);
        res.status(500).json({ error: "Erro ao salvar configurações." });
    }
});

// Buscar configurações da loja
router.get('/api/config-loja/:id', async (req, res) => {
    try {
        const rows = await db.query("SELECT * FROM config_loja WHERE usuario_id = ?", [req.params.id]);
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar horários da loja" });
    }
});

// ==========================================
//          2. ROTAS DE SERVIÇOS
// ==========================================

// Listar todos os serviços de um usuário
router.get('/api/servicos/usuario/:id', async (req, res) => {
    try {
        const rows = await db.query("SELECT * FROM servicos WHERE usuario_id = ? ORDER BY id DESC", [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao listar serviços" });
    }
});

// Criar Novo Serviço
router.post('/api/servicos', upload.array('fotos', 2), async (req, res) => {
    const { usuario_id, nome, preco, descricao, duracao } = req.body;
    const fotos = req.files ? req.files.map(f => f.path.replace(/\\/g, "/")) : [];

    try {
        const sql = `INSERT INTO servicos (usuario_id, nome, descricao, preco, duracao, foto1, foto2) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await db.query(sql, [
            usuario_id, nome, descricao || null, 
            parseFloat(preco) || 0, parseInt(duracao) || 30, 
            fotos[0] || null, fotos[1] || null
        ]);
        res.status(201).json({ message: "Serviço criado com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao inserir serviço" });
    }
});

// Editar Serviço
router.put('/api/servicos/:id', upload.array('fotos', 2), async (req, res) => {
    const { id } = req.params;
    const { nome, preco, descricao, duracao } = req.body;
    const novasFotos = req.files ? req.files.map(f => f.path.replace(/\\/g, "/")) : [];

    try {
        // Se enviou novas fotos, apaga as antigas do disco
        if (novasFotos.length > 0) {
            const rows = await db.query("SELECT foto1, foto2 FROM servicos WHERE id = ?", [id]);
            if (rows.length > 0) {
                apagarArquivosFisicos([rows[0].foto1, rows[0].foto2]);
            }
        }

        let sql = "UPDATE servicos SET nome = ?, preco = ?, descricao = ?, duracao = ? ";
        let params = [nome, parseFloat(preco) || 0, descricao || null, parseInt(duracao) || 30];

        if (novasFotos.length > 0) {
            sql += ", foto1 = ?, foto2 = ? ";
            params.push(novasFotos[0] || null, novasFotos[1] || null);
        }

        sql += " WHERE id = ?";
        params.push(id);

        await db.query(sql, params);
        res.json({ message: "Serviço atualizado com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar serviço" });
    }
});

// Deletar Serviço
router.delete('/api/servicos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await db.query("SELECT foto1, foto2 FROM servicos WHERE id = ?", [id]);
        if (rows.length > 0) {
            apagarArquivosFisicos([rows[0].foto1, rows[0].foto2]);
        }
        await db.query("DELETE FROM servicos WHERE id = ?", [id]);
        res.json({ message: "Serviço removido com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir serviço" });
    }
});

// ==========================================
//   3. ADICIONADO: ROTA DE ESTATÍSTICAS REAIS
// ==========================================
router.get('/api/dashboard/stats/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;
    try {
        // Faz o JOIN para buscar o preço real da tabela servicos
        const sql = `
            SELECT 
                COUNT(a.id) as total_agendamentos,
                IFNULL(SUM(s.preco), 0) as faturamento_total
            FROM agendamentos a
            INNER JOIN servicos s ON a.servico_id = s.id
            WHERE a.usuario_id = ?
        `;
        const rows = await db.query(sql, [usuario_id]);
        res.json({
            total: rows[0].total_agendamentos,
            faturamento: rows[0].faturamento_total
        });
    } catch (err) {
        console.error("❌ Erro stats:", err);
        res.status(500).json({ error: "Erro ao calcular faturamento real" });
    }
});

module.exports = router;