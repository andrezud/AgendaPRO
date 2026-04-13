document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = e.target.querySelector('.btn-login');
    const msgContainer = document.getElementById('msgContainer');
    const originalContent = btn.innerHTML;

    const mostrarMsg = (texto, tipo) => {
        msgContainer.innerHTML = `<div class="msg ${tipo}">${texto}</div>`;
        if (tipo === 'error') {
            msgContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { msgContainer.innerHTML = ''; }, 5000);
        }
    };

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Autenticando...';
    btn.disabled = true;
    msgContainer.innerHTML = '';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 1. Limpa tudo para garantir que não haja dados de outras contas
            localStorage.clear();

            // 2. SALVAMOS APENAS O ID (A nossa chave de consulta)
            // Não salvamos nome, slug ou whatsapp aqui. O Dashboard buscará isso do banco.
            localStorage.setItem('agendapro_user_id', data.user.id);

            mostrarMsg(`👋 Sucesso! Entrando no painel...`, 'success');
            
            setTimeout(() => {
                window.location.replace("/agendapro/dashboard");
            }, 1000);
        } else {
            mostrarMsg(`⚠️ ${data.error || 'Credenciais inválidas.'}`, 'error');
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    } catch (error) {
        mostrarMsg('❌ Erro de conexão com o servidor.', 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
});