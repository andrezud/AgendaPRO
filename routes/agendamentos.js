const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- FUNÇÕES AUXILIARES ---

function somarMinutos(hora, minutos) {
    if (!hora) return "00:00";
    let [h, m] = hora.split(':').map(Number);
    let totalMinutos = h * 60 + m + minutos;
    let novoH = Math.floor(totalMinutos / 60);
    let novoM = totalMinutos % 60;
    return `${String(novoH).padStart(2, '0')}:${String(novoM).padStart(2, '0')}`;
}

function formatarHora(valor) {
    if (!valor) return "00:00";
    return valor.toString().substring(0, 5);
}

// --- ROTAS DE AGENDAMENTO ---

// 1. BUSCAR HORÁRIOS DISPONÍVEIS (Com trava de especialidade)
router.get('/api/agendamentos/disponiveis', async (req, res) => {
    const { funcionario_id, servico_id, data } = req.query;

    if (!funcionario_id || !servico_id || !data) {
        return res.status(400).json({ error: "Faltam parâmetros obrigatórios." });
    }

    try {
        const funcs = await db.query(
            "SELECT hora_abre, hora_fecha, almoco_inicio, almoco_fim, servicos_especializados FROM funcionarios WHERE id = ?", 
            [funcionario_id]
        );

        const servs = await db.query(
            "SELECT duracao FROM servicos WHERE id = ?", 
            [servico_id]
        );

        if (!funcs.length || !servs.length) {
            return res.status(404).json({ error: "Dados não encontrados." });
        }

        const func = funcs[0];

        // --- VALIDAÇÃO DE ESPECIALIDADE ---
        const listaPermitida = func.servicos_especializados ? func.servicos_especializados.split(',') : [];
        if (!listaPermitida.includes(servico_id.toString())) {
            return res.json([]); 
        }

        const ocupados = await db.query(
            `SELECT hora_inicio, hora_fim FROM agendamentos 
             WHERE funcionario_id = ? AND data_agendada = ? AND status != 'cancelado'
             ORDER BY hora_inicio ASC`,
            [funcionario_id, data]
        );

        const duracaoSolicitada = parseInt(servs[0].duracao);
        let horariosDisponiveis = [];
        let horaAtual = formatarHora(func.hora_abre);
        const expedienteFim = formatarHora(func.hora_fecha);
        const almocoInicio = formatarHora(func.almoco_inicio);
        const almocoFim = formatarHora(func.almoco_fim);

        while (somarMinutos(horaAtual, duracaoSolicitada) <= expedienteFim) {
            let fimDesejado = somarMinutos(horaAtual, duracaoSolicitada);
            const conflitaAlmoco = (horaAtual < almocoFim && fimDesejado > almocoInicio);

            const agendamentoConflitante = ocupados.find(agend => {
                const agendInicio = formatarHora(agend.hora_inicio);
                const agendFim = formatarHora(agend.hora_fim);
                return (horaAtual < agendFim && fimDesejado > agendInicio);
            });

            if (!conflitaAlmoco && !agendamentoConflitante) {
                horariosDisponiveis.push(horaAtual);
                horaAtual = somarMinutos(horaAtual, 15);
            } 
            else if (agendamentoConflitante) {
                horaAtual = formatarHora(agendamentoConflitante.hora_fim);
            } 
            else if (conflitaAlmoco) {
                horaAtual = almocoFim;
            } else {
                horaAtual = somarMinutos(horaAtual, 15);
            }
        }

        res.json(horariosDisponiveis);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao processar horários." });
    }
});

// 2. SALVAR NOVO AGENDAMENTO (Com Notificação Realtime)
router.post('/api/agendamentos', async (req, res) => {
    const { 
        usuario_id, funcionario_id, servico_id, 
        cliente_nome, cliente_contato, data_agendada, hora_inicio 
    } = req.body;

    try {
        // Validação de especialidade
        const funcData = await db.query("SELECT servicos_especializados FROM funcionarios WHERE id = ?", [funcionario_id]);
        
        if (funcData.length > 0) {
            const lista = funcData[0].servicos_especializados ? funcData[0].servicos_especializados.split(',') : [];
            if (!lista.includes(servico_id.toString())) {
                return res.status(400).json({ error: "Este funcionário não está habilitado para este serviço." });
            }
        }

        const servs = await db.query("SELECT duracao FROM servicos WHERE id = ?", [servico_id]);
        if (!servs.length) return res.status(404).json({ error: "Serviço inválido." });

        const hora_fim = somarMinutos(hora_inicio, parseInt(servs[0].duracao));

        const sql = `INSERT INTO agendamentos 
            (usuario_id, funcionario_id, servico_id, cliente_nome, cliente_contato, data_agendada, hora_inicio, hora_fim, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`;

        await db.query(sql, [
            usuario_id, funcionario_id, servico_id, 
            cliente_nome, cliente_contato, data_agendada, hora_inicio, hora_fim
        ]);

        // --- DISPARO DO SOM E NOTIFICAÇÃO (REALTIME) ---
        const io = req.app.get('io');
        if (io) {
            io.emit(`notificacao_novo_agendamento_${usuario_id}`, {
                cliente: cliente_nome,
                hora: hora_inicio
            });
        }
        
        res.status(201).json({ message: "✅ Agendamento realizado!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar agendamento." });
    }
});

// 3. LISTAR AGENDAMENTOS DA LOJA
router.get('/api/agendamentos/loja/:usuario_id', async (req, res) => {
    try {
        const sql = `
            SELECT a.*, f.nome as funcionario_nome, s.nome as servico_nome 
            FROM agendamentos a
            LEFT JOIN funcionarios f ON a.funcionario_id = f.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.usuario_id = ? 
            ORDER BY a.data_agendada DESC, a.hora_inicio ASC`;
        const rows = await db.query(sql, [req.params.usuario_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar agendamentos." });
    }
});

// 4. ATUALIZAR STATUS
router.put('/api/agendamentos/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query("UPDATE agendamentos SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ message: `Agendamento ${status} com sucesso!` });
    } catch (err) {
        res.status(500).json({ error: "Erro ao atualizar status." });
    }
});

// 5. EXCLUIR AGENDAMENTO
router.delete('/api/agendamentos/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM agendamentos WHERE id = ?", [req.params.id]);
        res.json({ message: "🗑️ Agendamento removido permanentemente!" });
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir agendamento." });
    }
});

// 6. GERAR ESTATÍSTICAS
router.get('/api/agendamentos/estatisticas/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth() + 1;

    try {
        const rankingFuncionarios = await db.query(`
            SELECT f.nome, COUNT(a.id) as total 
            FROM agendamentos a
            JOIN funcionarios f ON a.funcionario_id = f.id
            WHERE a.usuario_id = ? AND MONTH(a.data_agendada) = ? AND YEAR(a.data_agendada) = ? AND a.status != 'cancelado'
            GROUP BY f.id ORDER BY total DESC`, [usuario_id, mes, ano]
        );

        const rankingServicos = await db.query(`
            SELECT s.nome, COUNT(a.id) as total 
            FROM agendamentos a
            JOIN servicos s ON a.servico_id = s.id
            WHERE a.usuario_id = ? AND MONTH(a.data_agendada) = ? AND YEAR(a.data_agendada) = ? AND a.status != 'cancelado'
            GROUP BY s.id ORDER BY total DESC`, [usuario_id, mes, ano]
        );

        res.json({ funcionarios: rankingFuncionarios, servicos: rankingServicos });
    } catch (err) {
        res.status(500).json({ error: "Erro ao gerar estatísticas." });
    }
});

module.exports = router;