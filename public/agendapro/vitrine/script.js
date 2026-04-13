const urlParts = window.location.pathname.split('/');
const slugLoja = urlParts.filter(p => p && p !== 'v' && p !== 'vitrine').pop()?.toLowerCase();
let dadosVitrine = null;
let agendamento = { servico_id: null, funcionario_id: null, data: null, hora: null, servico_nome: "" };

document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('inputData');
    if (inputData) inputData.setAttribute('min', new Date().toISOString().split('T')[0]);
    
    document.getElementById('telCliente')?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 11);
        let x = val.match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });

    buscarDadosLoja();
});

async function buscarDadosLoja() {
    if (!slugLoja) return;
    try {
        const res = await fetch(`/api/vitrine-cliente/dados/${slugLoja}`);
        dadosVitrine = await res.json();
        document.getElementById('nomeLoja').innerText = dadosVitrine.loja.nome;
        
        if (dadosVitrine.loja.foto_loja) {
            const path = dadosVitrine.loja.foto_loja.startsWith('/') ? dadosVitrine.loja.foto_loja : '/' + dadosVitrine.loja.foto_loja;
            document.getElementById('logoLoja').innerHTML = `<img src="${path}">`;
            document.getElementById('bannerLoja').style.backgroundImage = `url('${path}')`;
        }
        renderizarServicos();
        document.getElementById('containerPrincipal').style.display = 'block';
    } catch (err) { console.error("Erro ao carregar dados:", err); }
}

function renderizarServicos() {
    const grid = document.getElementById('listaServicosVitrine');
    if (!grid || !dadosVitrine.servicos) return;

    grid.innerHTML = dadosVitrine.servicos.map(s => {
        const preco = parseFloat(s.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const foto = s.foto1 ? (s.foto1.startsWith('/') ? s.foto1 : '/' + s.foto1) : 'https://placehold.co/400x200?text=Sem+Foto';

        return `
            <div class="card-servico" onclick="abrirDetalhesServico(${s.id})">
                <img src="${foto}" class="foto-servico" onerror="this.src='https://placehold.co/400x200?text=${s.nome}'">
                <div class="info-servico">
                    <h3>${s.nome}</h3>
                    <span class="preco">${preco}</span>
                    <button class="btn-agendar">Ver Detalhes</button>
                </div>
            </div>
        `;
    }).join('');
}

function abrirDetalhesServico(id) {
    const s = dadosVitrine.servicos.find(serv => serv.id === id);
    if (!s) return;

    document.getElementById('detalhesNomeServico').innerText = s.nome;
    document.getElementById('detalhesPrecoServico').innerText = parseFloat(s.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('detalhesDescricaoServico').innerText = s.descricao || "Sem descrição disponível.";

    const fotosContainer = document.getElementById('detalhesFotos');
    let htmlFotos = "";
    
    [s.foto1, s.foto2].forEach(f => {
        if(f) {
            const path = f.startsWith('/') ? f : '/' + f;
            htmlFotos += `<img src="${path}">`;
        }
    });
    
    if(!htmlFotos) htmlFotos = `<img src="https://placehold.co/400x200?text=${s.nome}">`;
    fotosContainer.innerHTML = htmlFotos;

    const btn = document.getElementById('btnAgendarDoDetalhe');
    btn.onclick = () => {
        fecharModalDetalhes();
        abrirAgendamento(s.id, s.nome, s.preco);
    };

    document.getElementById('modalDetalhesServico').style.display = 'block';
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhesServico').style.display = 'none';
}

/**
 * ATUALIZADO: Filtra profissionais com base no ID do serviço
 */
function abrirAgendamento(id, nome, preco) {
    agendamento.servico_id = id;
    agendamento.servico_nome = nome;
    document.getElementById('servicoNome').innerText = nome;
    document.getElementById('servicoDetalhes').innerText = `R$ ${parseFloat(preco).toFixed(2)}`;
    
    // FILTRAR PROFISSIONAIS: Apenas os que possuem o ID deste serviço na coluna servicos_especializados
    const select = document.getElementById('selectProfissional');
    
    const profissionaisFiltrados = dadosVitrine.funcionarios.filter(p => {
        if (!p.servicos_especializados) return false;
        
        // Verifica se o ID do serviço está na lista separada por vírgulas do funcionário
        const listaIds = p.servicos_especializados.split(',');
        return listaIds.includes(id.toString());
    });

    if (profissionaisFiltrados.length === 0) {
        select.innerHTML = '<option value="">Nenhum profissional disponível para este serviço</option>';
    } else {
        select.innerHTML = '<option value="">Quem vai te atender?</option>' + 
            profissionaisFiltrados.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    }

    irParaPasso(1);
    document.getElementById('modalAgendamento').style.display = 'block';
}

function atualizarFotoEVerificar() {
    const funcId = document.getElementById('selectProfissional').value;
    const container = document.getElementById('fotoSelecaoProfissional');
    const prof = dadosVitrine.funcionarios.find(f => f.id == funcId);

    if (prof && prof.foto) {
        const pathFotoProf = prof.foto.startsWith('/') ? prof.foto : '/' + prof.foto;
        container.innerHTML = `<img src="${pathFotoProf}">`;
    } else {
        container.innerHTML = '<i class="fas fa-user-tie"></i>';
    }
    verificarSelecao();
}

function verificarSelecao() {
    const fId = document.getElementById('selectProfissional').value;
    const data = document.getElementById('inputData').value;
    if (fId && data) carregarHorarios();
}

async function carregarHorarios() {
    const fId = document.getElementById('selectProfissional').value;
    const dataInput = document.getElementById('inputData').value;
    const grid = document.getElementById('gridHorarios');

    const prof = dadosVitrine.funcionarios.find(f => f.id == fId);
    if (prof && prof.dias_trabalho) {
        const [ano, mes, dia] = dataInput.split('-');
        const diaSemana = new Date(ano, mes - 1, dia).getDay(); 
        const diasTrabalhoArr = prof.dias_trabalho.split(',');

        if (!diasTrabalhoArr.includes(diaSemana.toString())) {
            irParaPasso(2);
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:20px; color:#ef4444;">
                    <i class="fas fa-calendar-times" style="font-size:2rem; margin-bottom:10px;"></i><br>
                    Este profissional não atende neste dia.
                </div>`;
            return;
        }
    }

    irParaPasso(2);
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Buscando horários...</div>';

    try {
        const res = await fetch(`/api/agendamentos/disponiveis?funcionario_id=${fId}&servico_id=${agendamento.servico_id}&data=${dataInput}`);
        const horários = await res.json();
        
        if (horários.length === 0) {
            grid.innerHTML = "<p style='grid-column: span 3; text-align:center; color:red;'>Indisponível para esta data.</p>";
        } else {
            grid.innerHTML = horários.map(h => `<div class="hora-item" onclick="selecionarHora(this, '${h}')">${h}</div>`).join('');
        }
    } catch (e) { 
        grid.innerHTML = 'Erro ao carregar.'; 
    }
}

function selecionarHora(el, hora) {
    document.querySelectorAll('.hora-item').forEach(h => h.classList.remove('selecionado'));
    el.classList.add('selecionado');
    agendamento.hora = hora;
    agendamento.data = document.getElementById('inputData').value;
    const select = document.getElementById('selectProfissional');
    const profNome = select.options[select.selectedIndex].text;
    
    document.getElementById('resumoFinal').innerHTML = `
        <div style="font-size: 0.95rem; line-height: 1.6;">
            <strong>Resumo:</strong><br>
            📅 ${agendamento.data.split('-').reverse().join('/')} às ${hora}<br>
            👤 Com ${profNome}
        </div>
    `;
    irParaPasso(3);
}

function irParaPasso(p) {
    document.getElementById('passo1').style.display = p === 1 ? 'block' : 'none';
    document.getElementById('passo2').style.display = p === 2 ? 'block' : 'none';
    document.getElementById('passo3').style.display = p === 3 ? 'block' : 'none';
}

function fecharModal() { 
    document.getElementById('modalAgendamento').style.display = 'none'; 
}

async function salvarAgendamento() {
    const nome = document.getElementById('nomeCliente').value;
    const tel = document.getElementById('telCliente').value;
    if (!nome || tel.length < 14) {
        Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Por favor, preencha seu nome e WhatsApp corretamente.', confirmButtonColor: '#4f46e5' });
        return;
    }

    const btn = document.getElementById('btnFinalizar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

    try {
        const res = await fetch('/api/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: dadosVitrine.loja.usuario_id || dadosVitrine.loja.id,
                funcionario_id: document.getElementById('selectProfissional').value,
                servico_id: agendamento.servico_id,
                cliente_nome: nome,
                cliente_contato: tel,
                data_agendada: agendamento.data,
                hora_inicio: agendamento.hora
            })
        });

        if (res.ok) {
            Swal.fire({
                title: 'Tudo pronto!',
                html: `Seu agendamento para <b>${agendamento.servico_nome}</b> foi confirmado.<br><br>Nos vemos em breve!`,
                icon: 'success',
                confirmButtonText: 'Ótimo!',
                confirmButtonColor: '#10b981'
            }).then(() => location.reload());
        } else {
            const errorData = await res.json();
            Swal.fire({ icon: 'error', title: 'Ops!', text: errorData.error || 'Não conseguimos salvar seu horário.', confirmButtonColor: '#4f46e5' });
            btn.disabled = false;
            btn.innerHTML = 'Confirmar Agendamento <i class="fas fa-check-circle" style="margin-left: 8px;"></i>';
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro de conexão', text: 'Verifique sua internet.', confirmButtonColor: '#4f46e5' });
        btn.disabled = false;
        btn.innerHTML = 'Confirmar Agendamento <i class="fas fa-check-circle" style="margin-left: 8px;"></i>';
    }
}