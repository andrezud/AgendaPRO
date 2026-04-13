document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('agendapro_user_id');
    
    // Elementos da Interface
    const drawer = document.getElementById('drawerMenu');
    const overlay = document.getElementById('overlay');
    const btnOpen = document.getElementById('btnOpenMenu');
    const btnClose = document.getElementById('btnCloseMenu');
    const btnLogout = document.getElementById('btnLogout');
    const btnSino = document.getElementById('btnNotificacoes');
    const badge = document.getElementById('badgeNotif');

    // 1. Verificação de Autenticação
    if (!userId) {
        window.location.replace("/agendapro/login");
        return;
    }

    // --- CONFIGURAÇÃO DO ÁUDIO E REALTIME ---
    const somAlerta = new Audio('/assets/alerta.mp3');
    somAlerta.load();

    const desbloquearAudio = () => {
        somAlerta.play().then(() => {
            somAlerta.pause();
            somAlerta.currentTime = 0;
            console.log("🔊 Sistema de áudio liberado!");
            document.removeEventListener('click', desbloquearAudio);
        }).catch(e => console.log("Aguardando interação para liberar som..."));
    };
    document.addEventListener('click', desbloquearAudio);

    const socket = io();

    socket.on(`notificacao_novo_agendamento_${userId}`, (data) => {
        somAlerta.currentTime = 0;
        somAlerta.play().catch(e => console.warn("Áudio bloqueado!"));

        if(badge) badge.style.display = 'block';

        Swal.fire({
            title: 'Novo Agendamento!',
            text: `Cliente ${data.cliente} agendou para às ${data.hora}.`,
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 10000,
            timerProgressBar: true
        });

        carregarDadosDashboard(); 
    });

    // --- LÓGICA DO MODAL DO SINO ---
    if (btnSino) {
        btnSino.addEventListener('click', async () => {
            if (badge) badge.style.display = 'none';

            Swal.fire({ title: 'Carregando...', didOpen: () => { Swal.showLoading(); } });

            try {
                const response = await fetch(`/api/agendamentos/loja/${userId}`);
                const dados = await response.json();
                const ultimos = dados.slice(0, 5);

                let html = '<div style="margin-top:10px">';
                if (ultimos.length === 0) {
                    html += '<p>Nenhum agendamento hoje.</p>';
                } else {
                    ultimos.forEach(item => {
                        html += `
                            <div class="item-resumo">
                                <div class="resumo-info">
                                    <b>${item.cliente_nome}</b>
                                    <span>${item.servico_nome}</span>
                                </div>
                                <div class="resumo-hora">${item.hora_inicio.substring(0,5)}</div>
                            </div>`;
                    });
                }
                html += '</div>';

                Swal.fire({
                    title: 'Últimos Agendamentos',
                    html: html,
                    confirmButtonText: 'Ver Agenda Completa',
                    confirmButtonColor: '#2563eb',
                    showCloseButton: true
                }).then((result) => {
                    if (result.isConfirmed) window.location.href = "/agendapro/agendamentos";
                });
            } catch (err) {
                Swal.fire('Erro', 'Não foi possível carregar.', 'error');
            }
        });
    }

    async function carregarDadosDashboard() {
        try {
            const [resUser, resStats] = await Promise.all([
                fetch(`/api/me/${userId}`),
                fetch(`/api/dashboard/stats/${userId}`)
            ]);

            if (!resUser.ok) throw new Error("Sessão expirada");

            const usuario = await resUser.json();
            const stats = await resStats.json();

            const nomeCompleto = usuario.nome || "Usuário";
            const primeiroNome = nomeCompleto.split(' ')[0];
            const inicial = nomeCompleto.charAt(0).toUpperCase() || "?";
            
            if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').innerText = nomeCompleto;
            if(document.getElementById('userFirstName')) document.getElementById('userFirstName').innerText = primeiroNome;
            
            const avatarLarge = document.getElementById('userAvatar');
            const avatarSmall = document.getElementById('userAvatarSmall');
            if(avatarLarge) avatarLarge.innerText = inicial;
            if(avatarSmall) avatarSmall.innerText = inicial;

            const elTotal = document.getElementById('totalAgendamentos');
            const elFaturamento = document.getElementById('faturamentoMensal');

            if(elTotal) elTotal.innerText = stats.total || 0;
            if(elFaturamento) {
                elFaturamento.innerText = Number(stats.faturamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            const slugLoja = usuario.slug || usuario.id;
            const linkCompleto = `${window.location.origin}/v/${slugLoja}`;
            if(document.getElementById('linkVitrine')) document.getElementById('linkVitrine').value = linkCompleto;
            if(document.getElementById('btnVerVitrine')) document.getElementById('btnVerVitrine').href = linkCompleto;

        } catch (err) { console.error(err); }
    }

    carregarDadosDashboard();

    const toggleMenu = () => {
        if (drawer && overlay) {
            drawer.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', toggleMenu);
    if (btnClose) btnClose.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Sair?',
                text: "Você precisará logar novamente.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sim, sair'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.replace("/agendapro/");
                }
            });
        });
    }
});

function copiarLink() {
    const input = document.getElementById('linkVitrine');
    const btn = document.querySelector('.btn-copy');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        const iconOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.background = "#22c55e"; 
        setTimeout(() => {
            btn.innerHTML = iconOriginal;
            btn.style.background = "";
        }, 2000);
    });
}