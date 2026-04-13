document.addEventListener('DOMContentLoaded', async () => {
    const serverText = document.getElementById('server-text');
    const pulse = document.querySelector('.pulse');

    async function checkStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                serverText.innerText = "Sistemas Online";
                pulse.style.background = "#22c55e";
            }
        } catch (e) {
            serverText.innerText = "Monitorando...";
        }
    }
    checkStatus();
    setInterval(checkStatus, 60000);
});