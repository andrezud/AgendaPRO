document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('agendapro_user_id');

    if (!userId) {
        window.location.replace("/agendapro/login");
        return;
    }

    // --- CARREGAMENTO INICIAL (DEPENDENTE DO BACKEND) ---
    async function carregarPerfil() {
        try {
            const response = await fetch(`/api/me/${userId}`);
            if (!response.ok) throw new Error("Erro ao buscar dados");

            const usuario = await response.json();

            // Preenche os campos com a "Verdade do Banco"
            document.getElementById('nome_conta').value = usuario.nome || '';
            document.getElementById('email_conta').value = usuario.email || '';
            document.getElementById('whatsapp_conta').value = usuario.whatsapp || '';
            
            // Mostra o link atualizado
            document.getElementById('slug_preview').value = `agendapro.dev.br/v/${usuario.slug}`;

        } catch (error) {
            console.error(error);
            localStorage.clear();
            window.location.replace("/agendapro/login");
        }
    }

    await carregarPerfil();

    // --- SALVAR ALTERAÇÕES ---
    document.getElementById('formConta').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('.btn-save');
        const originalText = btn.innerHTML;

        const nome = document.getElementById('nome_conta').value;
        const email = document.getElementById('email_conta').value;
        const whatsapp = document.getElementById('whatsapp_conta').value;
        const senhaAtual = document.getElementById('senha_atual').value;
        const novaSenha = document.getElementById('nova_senha').value;
        const confirmaSenha = document.getElementById('confirmar_nova_senha').value;

        if (novaSenha && novaSenha !== confirmaSenha) {
            return Swal.fire('Erro', 'As senhas novas não coincidem!', 'error');
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        const dadosParaEnviar = {
            nome, email, whatsapp,
            senhaAtual: senhaAtual || null,
            novaSenha: novaSenha || null
        };

        try {
            const response = await fetch(`/api/contas/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaEnviar)
            });

            const resultado = await response.json();

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Dados Atualizados!',
                    text: 'Suas informações e link da vitrine foram salvos.',
                    timer: 2000,
                    showConfirmButton: false
                });
                window.location.href = "/agendapro/dashboard";
            } else {
                Swal.fire('Erro', resultado.error || 'Erro ao atualizar.', 'error');
            }
        } catch (error) {
            Swal.fire('Erro', 'Falha na conexão com o servidor.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
});

// --- EXCLUSÃO DE CONTA ---
async function excluirMinhaConta() {
    const userId = localStorage.getItem('agendapro_user_id');
    
    const { isConfirmed } = await Swal.fire({
        title: 'TEM CERTEZA?',
        text: "Essa ação é irreversível e apagará tudo!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir permanentemente'
    });

    if (isConfirmed) {
        try {
            const response = await fetch(`/api/contas/${userId}`, { method: 'DELETE' });
            if (response.ok) {
                localStorage.clear();
                await Swal.fire('Conta Excluída', 'Seus dados foram removidos.', 'success');
                window.location.replace("/agendapro/");
            }
        } catch (error) {
            Swal.fire('Erro', 'Não foi possível excluir a conta.', 'error');
        }
    }
}