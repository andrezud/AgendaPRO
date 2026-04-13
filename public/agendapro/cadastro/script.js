document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const togglePass = document.getElementById('togglePass');
    const msgContainer = document.getElementById('msgContainer');

    // Alternar visibilidade da senha
    if (togglePass) {
        togglePass.addEventListener('click', () => {
            const passInput = document.getElementById('password');
            const icon = togglePass.querySelector('i');
            const isPass = passInput.type === 'password';
            
            passInput.type = isPass ? 'text' : 'password';
            icon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    // Manipular envio do formulário
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = signupForm.querySelector('.btn-submit');
        const originalText = btn.innerHTML;
        
        const mostrarMsg = (texto, tipo) => {
            msgContainer.innerHTML = `<div class="msg ${tipo}">${texto}</div>`;
            msgContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };

        // Estado de Carregamento
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Criando sua vitrine...';
        btn.disabled = true;
        msgContainer.innerHTML = '';

        const data = {
            businessName: document.getElementById('businessName').value,
            email: document.getElementById('email').value,
            whatsapp: document.getElementById('whatsapp').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // SUCESSO: Não salvamos nada no localStorage aqui por segurança.
                // Forçamos o usuário a passar pela tela de login para validar as credenciais.
                mostrarMsg(`✅ Conta criada com sucesso! Redirecionando...`, "success");
                
                setTimeout(() => {
                    window.location.replace("/agendapro/login");
                }, 2000);
            } else {
                let errorMsg = result.error || "Erro ao criar conta.";
                
                // Tratamento amigável para duplicidade de slug ou email
                if(errorMsg.includes("já está em uso") || errorMsg.includes("já existe")) {
                    errorMsg = "⚠️ Este e-mail ou nome de loja já possui cadastro.";
                }
                
                mostrarMsg(errorMsg, "error");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }

        } catch (error) {
            console.error("Erro no cadastro:", error);
            mostrarMsg("❌ Falha na conexão com o servidor.", "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
});