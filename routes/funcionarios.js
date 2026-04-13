const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==========================================
//    CONFIGURAÇÃO DO MULTER (UPLOADS)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/funcionarios';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const apagarFotoFisica = (fotoPath) => {
    if (fotoPath && typeof fotoPath === 'string') {
        const caminhoAbsoluto = path.join(process.cwd(), fotoPath);
        if (fs.existsSync(caminhoAbsoluto)) {
            try { fs.unlinkSync(caminhoAbsoluto); } catch (err) { console.error("Erro ao deletar foto:", err); }
        }
    }
};

// ==========================================
//             ROTAS
// ==========================================

// 1. LISTAR FUNCIONÁRIOS
router.get('/api/funcionarios/usuario/:id', async (req, res) => {
    try {
        const rows = await db.query(
            "SELECT * FROM funcionarios WHERE usuario_id = ? ORDER BY id DESC", 
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao listar funcionários" });
    }
});

// 2. CADASTRAR FUNCIONÁRIO (Atualizado com servicos_especializados)
router.post('/api/funcionarios', upload.single('foto'), async (req, res) => {
    const { 
        usuario_id, nome, especialidade, 
        hora_abre, hora_fecha, almoco_inicio, almoco_fim,
        dias_trabalho,
        servicos_especializados // Novo campo: string de IDs (ex: "89,90")
    } = req.body;

    const fotoPath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    try {
        const sql = `INSERT INTO funcionarios 
            (usuario_id, nome, especialidade, hora_abre, hora_fecha, almoco_inicio, almoco_fim, dias_trabalho, servicos_especializados, foto) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.query(sql, [
            usuario_id, 
            nome, 
            especialidade || "", 
            hora_abre || "08:00", 
            hora_fecha || "18:00", 
            (almoco_inicio && almoco_inicio !== "") ? almoco_inicio : "00:00", 
            (almoco_fim && almoco_fim !== "") ? almoco_fim : "00:00",
            dias_trabalho || "1,2,3,4,5,6",
            servicos_especializados || "", // Salva os serviços vinculados
            fotoPath
        ]);
        
        res.status(201).json({ message: "Funcionário cadastrado!" });
    } catch (err) {
        console.error(err);
        if (fotoPath) apagarFotoFisica(fotoPath);
        res.status(500).json({ error: "Erro ao inserir funcionário" });
    }
});

// 3. EDITAR FUNCIONÁRIO (Atualizado com servicos_especializados)
router.put('/api/funcionarios/:id', upload.single('foto'), async (req, res) => {
    const { id } = req.params;
    const { 
        nome, especialidade, hora_abre, hora_fecha, 
        almoco_inicio, almoco_fim, dias_trabalho,
        servicos_especializados 
    } = req.body;
    const novaFoto = req.file ? req.file.path.replace(/\\/g, "/") : null;

    try {
        if (novaFoto) {
            const resultados = await db.query("SELECT foto FROM funcionarios WHERE id = ?", [id]);
            if (resultados.length > 0 && resultados[0].foto) {
                apagarFotoFisica(resultados[0].foto);
            }
        }

        let sql = `UPDATE funcionarios SET 
            nome = ?, especialidade = ?, hora_abre = ?, 
            hora_fecha = ?, almoco_inicio = ?, almoco_fim = ?, 
            dias_trabalho = ?, servicos_especializados = ?`;
        
        let params = [
            nome, 
            especialidade || "", 
            hora_abre, 
            hora_fecha, 
            (almoco_inicio && almoco_inicio !== "") ? almoco_inicio : "00:00", 
            (almoco_fim && almoco_fim !== "") ? almoco_fim : "00:00",
            dias_trabalho || "1,2,3,4,5,6",
            servicos_especializados || ""
        ];

        if (novaFoto) {
            sql += ", foto = ?";
            params.push(novaFoto);
        }

        sql += " WHERE id = ?";
        params.push(id);

        await db.query(sql, params);
        res.json({ message: "Funcionário atualizado com sucesso!" });
    } catch (err) {
        console.error(err);
        if (novaFoto) apagarFotoFisica(novaFoto);
        res.status(500).json({ error: "Erro ao editar funcionário" });
    }
});

// 4. DELETAR FUNCIONÁRIO
router.delete('/api/funcionarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultados = await db.query("SELECT foto FROM funcionarios WHERE id = ?", [id]);
        if (resultados.length > 0 && resultados[0].foto) {
            apagarFotoFisica(resultados[0].foto);
        }
        
        await db.query("DELETE FROM funcionarios WHERE id = ?", [id]);
        res.json({ message: "Funcionário removido!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir funcionário" });
    }
});

module.exports = router;