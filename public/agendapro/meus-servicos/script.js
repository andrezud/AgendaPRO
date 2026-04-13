const userId = localStorage.getItem('agendapro_user_id');
let servicoEmEdicao = null;

// Popula os selects de horários (00:00 até 23:30)
function popularHorarios() {
    const selects = document.querySelectorAll('.select-time');
    const horas = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    selects.forEach(select => {
        let options = select.id.includes('pausa') ? '<option value="">Sem pausa</option>' : '';
        horas.forEach(hora => {
            options += `<option value="${hora}">${hora}</option>`;
        });
        select.innerHTML = options;
    });
}

function abrirModal(id) { 
    document.getElementById(id).style.display = "block"; 
    document.body.style.overflow = "hidden"; 
}

function fecharModal(id) { 
    document.getElementById(id).style.display = "none"; 
    document.body.style.overflow = "auto"; 
}

function validarQuantidadeFotos(input) {
    const aviso = document.getElementById('aviso_fotos');
    if (input.files.length > 2) {
        aviso.innerText = "⚠️ Máximo de 2 fotos permitido!";
        input.value = ""; 
    } else {
        aviso.innerText = "";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    popularHorarios();
    if (!userId) { window.location.href = "/agendapro/login"; return; }
    
    carregarDadosIniciais();

    // SALVAR CONFIGURAÇÕES DA LOJA
    document.getElementById('formLoja').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        
        const diasSelecionados = Array.from(document.querySelectorAll('input[name="dia"]:checked'))
            .map(el => el.value).join(', ');

        const formData = new FormData();
        formData.append('usuario_id', userId);
        formData.append('abre', document.getElementById('loja_abre').value);
        formData.append('fecha', document.getElementById('loja_fecha').value);
        formData.append('pausa_ini', document.getElementById('loja_pausa_ini').value || "00:00");
        formData.append('pausa_fim', document.getElementById('loja_pausa_fim').value || "00:00");
        formData.append('dias_aberto', diasSelecionados);

        const inputFotoLoja = document.getElementById('foto_loja_input');
        if (inputFotoLoja.files[0]) {
            formData.append('foto_loja', inputFotoLoja.files[0]);
        }

        try {
            const res = await fetch('/api/config-loja', {
                method: 'POST',
                body: formData 
            });

            if (res.ok) {
                Swal.fire('Sucesso!', 'Vitrine atualizada!', 'success');
                fecharModal('modalLoja');
                carregarLoja();
            }
        } catch (err) {
            Swal.fire('Erro', 'Não foi possível salvar.', 'error');
        } finally { btn.disabled = false; }
    };

    // SALVAR/EDITAR SERVIÇO
    document.getElementById('formServico').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        
        const formData = new FormData();
        formData.append('usuario_id', userId);
        formData.append('nome', document.getElementById('nome_servico').value);
        formData.append('preco', document.getElementById('preco_servico').value);
        formData.append('descricao', document.getElementById('desc_servico').value);
        formData.append('duracao', document.getElementById('duracao_servico').value);

        const inputFoto = document.getElementById('fotos_servico');
        for (let i = 0; i < inputFoto.files.length; i++) {
            formData.append('fotos', inputFoto.files[i]);
        }

        const url = servicoEmEdicao ? `/api/servicos/${servicoEmEdicao}` : '/api/servicos';
        const method = servicoEmEdicao ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method: method, body: formData });
            if (res.ok) { 
                Swal.fire('Sucesso!', 'Catálogo atualizado!', 'success'); 
                fecharModal('modalServico'); 
                carregarServicos(); 
            }
        } catch (err) {
            Swal.fire('Erro', 'Erro ao salvar serviço.', 'error');
        } finally { btn.disabled = false; }
    };
});

async function carregarDadosIniciais() {
    carregarNomeLoja();
    carregarLoja();
    carregarServicos();
}

async function carregarNomeLoja() {
    try {
        const res = await fetch(`/api/me/${userId}`);
        const data = await res.json();
        document.getElementById('display_nome_loja').innerText = data.nome || "Minha Loja";
    } catch (e) { console.error(e); }
}

async function carregarLoja() {
    try {
        const res = await fetch(`/api/config-loja/${userId}`);
        const h = await res.json();
        if (h && h.usuario_id) {
            document.getElementById('loja_abre').value = h.hora_abre ? h.hora_abre.substring(0,5) : "08:00";
            document.getElementById('loja_fecha').value = h.hora_fecha ? h.hora_fecha.substring(0,5) : "18:00";
            document.getElementById('loja_pausa_ini').value = h.almoco_ini ? h.almoco_ini.substring(0,5) : "";
            document.getElementById('loja_pausa_fim').value = h.almoco_fim ? h.almoco_fim.substring(0,5) : "";
            
            const diasArr = h.dias_aberto ? h.dias_aberto.split(', ') : [];
            document.querySelectorAll('input[name="dia"]').forEach(box => {
                box.checked = diasArr.includes(box.value);
            });

            const diasTxt = h.dias_aberto || "Pendente";
            const horasTxt = h.hora_abre ? `${h.hora_abre.substring(0,5)} - ${h.hora_fecha.substring(0,5)}` : "";
            document.getElementById('display_horario').innerHTML = `<i class="far fa-clock"></i> ${diasTxt}: ${horasTxt}`;
        }
    } catch (e) { console.error(e); }
}

async function carregarServicos() {
    try {
        const res = await fetch(`/api/servicos/usuario/${userId}`);
        const servicos = await res.json();
        const lista = document.getElementById('listaServicos');
        document.getElementById('contador').innerText = servicos.length;
        
        lista.innerHTML = servicos.map(s => {
            const fotoPath = s.foto1 ? (s.foto1.startsWith('/') ? s.foto1 : '/' + s.foto1) : '';
            return `
                <div class="card-servico" onclick='prepararEdicao(${JSON.stringify(s)})'>
                    <img src="${fotoPath}" onerror="this.src='https://via.placeholder.com/80?text=Serviço'">
                    <div class="info">
                        <strong>${s.nome}</strong>
                        <p>${s.descricao || 'Sem descrição'}</p>
                        <small>R$ ${parseFloat(s.preco).toFixed(2)} • ${s.duracao} min</small>
                    </div>
                    <button onclick="event.stopPropagation(); excluirServico(${s.id})" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

function prepararEdicao(servico) {
    servicoEmEdicao = servico.id; 
    document.getElementById('nome_servico').value = servico.nome;
    document.getElementById('preco_servico').value = servico.preco;
    document.getElementById('desc_servico').value = servico.descricao || "";
    document.getElementById('duracao_servico').value = servico.duracao || "";
    
    const container = document.getElementById('preview_foto_container');
    if (container) {
        if (servico.foto1 || servico.foto2) {
            container.style.display = "block";
            document.getElementById('preview_foto_1').src = servico.foto1 ? (servico.foto1.startsWith('/') ? servico.foto1 : '/' + servico.foto1) : '';
            document.getElementById('preview_foto_2').src = servico.foto2 ? (servico.foto2.startsWith('/') ? servico.foto2 : '/' + servico.foto2) : '';
        } else {
            container.style.display = "none";
        }
    }

    document.getElementById('tituloModalServico').innerHTML = `<i class="fas fa-edit"></i> Editar Serviço`;
    abrirModal('modalServico');
}

function abrirModalNovoServico() {
    servicoEmEdicao = null; 
    document.getElementById('formServico').reset();
    const container = document.getElementById('preview_foto_container');
    if (container) container.style.display = "none";
    document.getElementById('tituloModalServico').innerHTML = `<i class="fas fa-plus-circle"></i> Novo Serviço`;
    abrirModal('modalServico');
}

async function excluirServico(id) {
    const confirmacao = await Swal.fire({
        title: 'Excluir serviço?',
        text: "Isso removerá o serviço do catálogo. Certifique-se de atualizar os funcionários vinculados a ele depois.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, excluir'
    });

    if (confirmacao.isConfirmed) {
        try {
            const res = await fetch(`/api/servicos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                carregarServicos();
                Swal.fire('Deletado!', 'Serviço removido com sucesso.', 'success');
            } else {
                Swal.fire('Erro', 'Não foi possível excluir o serviço.', 'error');
            }
        } catch (err) { 
            console.error(err); 
            Swal.fire('Erro', 'Erro de conexão ao excluir.', 'error');
        }
    }
}