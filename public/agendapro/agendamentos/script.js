const userId = localStorage.getItem('agendapro_user_id');
let agendamentosData = [];
let fData = 'hoje';
let fFunc = null;
let nomeDaLojaReal = "Minha Loja"; // Nome padrão caso a busca falhe

document.addEventListener('DOMContentLoaded', () => {
    if (!userId) return window.location.href = '/agendapro/login';
    carregarDadosIniciais();
});

// Busca o nome da loja e os agendamentos
async function carregarDadosIniciais() {
    try {
        // 1. Busca os dados do perfil (para pegar o nome da loja real para o WhatsApp)
        const resPerfil = await fetch(`/api/me/${userId}`);
        if (resPerfil.ok) {
            const dadosPerfil = await resPerfil.json();
            nomeDaLojaReal = dadosPerfil.nome; 
            
            const elNomeLoja = document.getElementById('nomeLoja');
            if (elNomeLoja) elNomeLoja.innerText = nomeDaLojaReal;
        }

        // 2. Carrega o dashboard (estatísticas e agendamentos)
        await carregarDashboard();
    } catch (e) {
        console.error("Erro ao carregar dados iniciais:", e);
    }
}

async function carregarDashboard() {
    try {
        const [resA, resE] = await Promise.all([
            fetch(`/api/agendamentos/loja/${userId}`),
            fetch(`/api/agendamentos/estatisticas/${userId}`)
        ]);
        
        agendamentosData = await resA.json();
        
        gerarFiltroFuncionarios();
        renderizarStats(await resE.json());
        aplicarFiltros();
    } catch (e) { 
        console.error("Erro ao carregar dashboard:", e); 
    }
}

function gerarFiltroFuncionarios() {
    const container = document.getElementById('listaFuncionarios');
    if (!container) return;

    const funcsMap = {};
    agendamentosData.forEach(a => {
        if (!funcsMap[a.funcionario_id]) funcsMap[a.funcionario_id] = a.funcionario_nome;
    });

    let html = `<div class="staff-item active" onclick="filtrarFunc(null, this)"><div class="staff-avatar"><i class="fas fa-users"></i></div><span>Todos</span></div>`;
    for (let id in funcsMap) {
        html += `<div class="staff-item" onclick="filtrarFunc(${id}, this)"><div class="staff-avatar"><i class="fas fa-user"></i></div><span>${funcsMap[id].split(' ')[0]}</span></div>`;
    }
    container.innerHTML = html;
}

function filtrarData(tipo, btn) {
    document.querySelectorAll('.btn-date').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fData = tipo;
    aplicarFiltros();
}

function filtrarFunc(id, el) {
    document.querySelectorAll('.staff-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    fFunc = id;
    aplicarFiltros();
}

function aplicarFiltros() {
    const hoje = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
    const filtrados = agendamentosData.filter(a => {
        const dataA = a.data_agendada.split('T')[0];
        const matchData = fData === 'hoje' ? dataA === hoje : true;
        const matchFunc = fFunc ? a.funcionario_id == fFunc : true;
        return matchData && matchFunc;
    });
    renderizarCards(filtrados);
}

function renderizarCards(lista) {
    const container = document.getElementById('containerAgendamentos');
    const badgeTotal = document.getElementById('badge-total');
    if(badgeTotal) badgeTotal.innerText = lista.length;

    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;"><i class="fas fa-calendar-times fa-3x"></i><p style="margin-top:10px;">Nenhum agendamento encontrado.</p></div>';
        return;
    }

    container.innerHTML = lista.map(a => {
        const dataF = new Date(a.data_agendada).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
        return `
        <div class="card-appointment status-${a.status}">
            <div class="card-header-info">
                <span class="date-tag"><i class="far fa-calendar-alt"></i> ${dataF}</span>
                <span class="time-tag">${a.hora_inicio.substring(0,5)} às ${a.hora_fim.substring(0,5)}</span>
            </div>
            <div class="card-info">
                <h4>${a.cliente_nome}</h4>
                <div class="client-contact">
                    <a href="https://api.whatsapp.com/send?phone=55${a.cliente_contato.replace(/\D/g,'')}" target="_blank">
                        <i class="fab fa-whatsapp"></i> ${a.cliente_contato}
                    </a>
                </div>
                <div class="service-details">
                    <p><i class="fas fa-tag"></i> <b>Serviço:</b> ${a.servico_nome}</p>
                    <p><i class="fas fa-user-tie"></i> <b>Prof:</b> ${a.funcionario_nome}</p>
                </div>
            </div>
            <div class="card-actions">
                ${a.status === 'pendente' ? `<button class="btn-ok" onclick="mudarStatus(${a.id}, 'confirmado')"><i class="fas fa-check"></i> Confirmar</button>` : ''}
                <button class="btn-no" onclick="mudarStatus(${a.id}, 'cancelado')"><i class="fas fa-ban"></i> Cancelar</button>
                <button class="btn-del" onclick="excluir(${a.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

async function mudarStatus(id, novoStatus) {
    try {
        const res = await fetch(`/api/agendamentos/${id}/status`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: novoStatus })
        });

        if (res.ok) {
            const agend = agendamentosData.find(a => a.id === id);
            const dataF = new Date(agend.data_agendada).toLocaleDateString('pt-BR');

            // Feedback visual rápido
            Swal.fire({
                title: novoStatus === 'confirmado' ? 'Confirmado!' : 'Cancelado!',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false
            });

            // Lógica da mensagem
            let msg = "";
            if (novoStatus === 'confirmado') {
                msg = `*Confirma\u00e7\u00e3o de Agendamento* \u2705\n\n` +
                      `Ol\u00e1, *${agend.cliente_nome}*!\n` +
                      `Seu hor\u00e1rio na *${nomeDaLojaReal}* foi confirmado com sucesso.\n\n` +
                      `\ud83d\udcc5 *DATA:* ${dataF}\n` +
                      `\u23f0 *HOR\u00c1RIO:* ${agend.hora_inicio.substring(0,5)}\n` +
                      `\u2702\ufe0f *SERVI\u00c7O:* ${agend.servico_nome}\n` +
                      `\ud83d\udc64 *PROFISSIONAL:* ${agend.funcionario_nome}\n\n` +
                      `Estamos te esperando!`;
            } else {
                msg = `*Aviso de Agendamento* \u26a0\ufe0f\n\n` +
                      `Ol\u00e1, *${agend.cliente_nome}*.\n` +
                      `Infelizmente seu agendamento na *${nomeDaLojaReal}* do dia ${dataF} precisou ser cancelado.\n\n` +
                      `Por favor, entre em contato para reagendarmos.`;
            }

            // Pergunta de notificação - Usando o .then() para garantir sincronia no mobile
            Swal.fire({
                title: 'Notificar cliente?',
                text: "Enviar mensagem para o WhatsApp?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sim, enviar',
                cancelButtonText: 'Agora não',
                confirmButtonColor: '#25d366'
            }).then((resultNotif) => {
                if (resultNotif.isConfirmed) {
                    const fone = agend.cliente_contato.replace(/\D/g,'');
                    // Usando api.whatsapp.com que é mais compatível com redirecionamento de sistema
                    const url = `https://api.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(msg)}`;
                    
                    // IMPORTANTE: location.href funciona melhor que window.open em fluxos de confirmação mobile
                    window.location.href = url;
                } else {
                    carregarDashboard();
                }
            });
        }
    } catch (e) { 
        console.error(e); 
        Swal.fire('Erro', 'Não foi possível atualizar o status.', 'error');
    }
}

async function excluir(id) {
    const result = await Swal.fire({
        title: 'Excluir agendamento?',
        text: "Essa ação não pode ser desfeita.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, apagar'
    });
    
    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/agendamentos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Excluído!', '', 'success');
                carregarDashboard();
            }
        } catch (e) {
            console.error(e);
        }
    }
}

function renderizarStats(data) {
    const statsFunc = document.getElementById('statsFunc');
    const statsServ = document.getElementById('statsServ');
    
    if(statsFunc && data.funcionarios) {
        statsFunc.innerHTML = data.funcionarios.map(f => `
            <div class="stat-row">
                <span>${f.nome}</span> 
                <strong>${f.total}</strong>
            </div>`).join('');
    }
    
    if(statsServ && data.servicos) {
        statsServ.innerHTML = data.servicos.map(s => `
            <div class="stat-row">
                <span>${s.nome}</span> 
                <strong>${s.total}</strong>
            </div>`).join('');
    }
}