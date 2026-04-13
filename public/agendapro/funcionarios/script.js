const userId = localStorage.getItem('agendapro_user_id');
let funcionarioIdEdicao = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!userId) {
        Swal.fire('Erro', 'Usuário não identificado. Faça login novamente.', 'error');
        return;
    }
    popularHorarios();
    carregarFuncionarios();
});

function popularHorarios() {
    const selects = document.querySelectorAll('.select-time');
    selects.forEach(s => s.innerHTML = '<option value="">---</option>');
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            selects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = hora;
                opt.textContent = hora;
                s.appendChild(opt);
            });
        }
    }
}

/**
 * ATUALIZADO: Agora lida com IDs em vez de nomes
 */
async function carregarServicosParaSelecao(selecionadosStr = "") {
    const container = document.getElementById('servicosParaAtribuir');
    container.innerHTML = "Carregando...";

    try {
        const res = await fetch(`/api/servicos/usuario/${userId}`);
        const servicos = await res.json();
        
        // Transformamos a string de IDs "89,90" em um array ["89", "90"]
        const arraySelecionados = selecionadosStr ? selecionadosStr.split(',') : [];

        if (!servicos || servicos.length === 0) {
            container.innerHTML = "<p style='font-size:12px; color:red;'>Cadastre serviços primeiro.</p>";
            return;
        }

        container.innerHTML = servicos.map(s => `
            <label class="check-item">
                <input type="checkbox" name="servicos_vinc" value="${s.id}" ${arraySelecionados.includes(s.id.toString()) ? 'checked' : ''}>
                <span>${s.nome}</span>
            </label>
        `).join('');
    } catch (e) { 
        container.innerHTML = "Erro ao carregar serviços.";
    }
}

document.getElementById('formFuncionario').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Processando...";

    // Coleta os IDs dos serviços selecionados
    const servicosSelecionados = Array.from(document.querySelectorAll('input[name="servicos_vinc"]:checked'))
        .map(el => el.value).join(',');

    const diasSelecionados = Array.from(document.querySelectorAll('input[name="dia_sem"]:checked'))
        .map(el => el.value).join(',');

    const formData = new FormData();
    formData.append('usuario_id', userId);
    formData.append('nome', document.getElementById('nome_func').value);
    
    // ATENÇÃO: Enviando para a nova coluna servicos_especializados
    formData.append('servicos_especializados', servicosSelecionados);
    
    formData.append('dias_trabalho', diasSelecionados);
    formData.append('hora_abre', document.getElementById('hora_abre').value);
    formData.append('hora_fecha', document.getElementById('hora_fecha').value);
    formData.append('almoco_inicio', document.getElementById('almoco_inicio').value);
    formData.append('almoco_fim', document.getElementById('almoco_fim').value);
    
    const fotoFile = document.getElementById('foto_func').files[0];
    if (fotoFile) formData.append('foto', fotoFile);

    const url = funcionarioIdEdicao ? `/api/funcionarios/${funcionarioIdEdicao}` : '/api/funcionarios';
    const method = funcionarioIdEdicao ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method: method, body: formData });
        if (res.ok) {
            Swal.fire('Sucesso!', 'Profissional salvo!', 'success');
            fecharModal();
            carregarFuncionarios();
        } else {
            throw new Error();
        }
    } catch (err) {
        Swal.fire('Erro', 'Houve um problema ao salvar.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = "Salvar Alterações";
    }
};

async function carregarFuncionarios() {
    try {
        const res = await fetch(`/api/funcionarios/usuario/${userId}`);
        const funcs = await res.json();
        const lista = document.getElementById('listaFuncionarios');
        
        if (!funcs || funcs.length === 0) {
            lista.innerHTML = "<p style='text-align:center; color:#94a3b8;'>Nenhum profissional cadastrado.</p>";
            return;
        }

        // Nota: No "map" abaixo, a coluna 'especialidade' do seu banco deve 
        // agora conter os IDs. Se quiser mostrar os NOMES na lista, a sua API
        // teria que fazer um JOIN. Por enquanto, mostraremos o que está salvo.
        lista.innerHTML = funcs.map(f => `
            <div class="card-func">
                <img src="/${f.foto || 'img/default-user.png'}" class="img-perfil-list" onerror="this.src='https://via.placeholder.com/60?text=User'">
                <div class="info">
                    <strong>${f.nome}</strong>
                    <p style="font-size:11px; color:#64748b; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        IDs vinculados: ${f.servicos_especializados || 'Nenhum'}
                    </p>
                    <small><i class="far fa-clock"></i> ${f.hora_abre.substring(0,5)} - ${f.hora_fecha.substring(0,5)}</small>
                </div>
                <div class="acoes">
                    <button onclick='prepararEdicao(${JSON.stringify(f)})' class="btn-edit"><i class="fas fa-edit"></i></button>
                    <button onclick="excluirFunc(${f.id})" class="btn-del"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) { 
        console.error(e);
    }
}

function prepararEdicao(f) {
    funcionarioIdEdicao = f.id;
    document.getElementById('modalTitle').innerText = "Editar Profissional";
    document.getElementById('nome_func').value = f.nome;
    document.getElementById('hora_abre').value = f.hora_abre.substring(0,5);
    document.getElementById('hora_fecha').value = f.hora_fecha.substring(0,5);
    document.getElementById('almoco_inicio').value = f.almoco_inicio ? f.almoco_inicio.substring(0,5) : "";
    document.getElementById('almoco_fim').value = f.almoco_fim ? f.almoco_fim.substring(0,5) : "";
    
    const diasSalvos = f.dias_trabalho ? f.dias_trabalho.split(',') : [];
    document.querySelectorAll('input[name="dia_sem"]').forEach(check => {
        check.checked = diasSalvos.includes(check.value);
    });

    // Passamos a coluna de IDs para marcar os checkboxes corretamente
    carregarServicosParaSelecao(f.servicos_especializados);
    document.getElementById('modalFuncionario').style.display = 'block';
}

function abrirModalFuncionario() {
    funcionarioIdEdicao = null;
    document.getElementById('formFuncionario').reset();
    document.getElementById('modalTitle').innerText = "Cadastrar Profissional";
    
    document.querySelectorAll('input[name="dia_sem"]').forEach(check => {
        check.checked = check.value !== "0"; 
    });

    carregarServicosParaSelecao(""); 
    document.getElementById('modalFuncionario').style.display = 'block';
}

function fecharModal() {
    document.getElementById('modalFuncionario').style.display = 'none';
}

async function excluirFunc(id) {
    const result = await Swal.fire({
        title: 'Excluir?',
        text: "Deseja remover este funcionário?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, remover'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`/api/funcionarios/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Removido!', '', 'success');
                carregarFuncionarios();
            }
        } catch (e) {
            Swal.fire('Erro', 'Não foi possível excluir.', 'error');
        }
    }
}

window.onclick = (event) => {
    const modal = document.getElementById('modalFuncionario');
    if (event.target == modal) fecharModal();
}