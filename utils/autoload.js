const fs = require('fs');
const path = require('path');

/**
 * Módulo de carregamento automático de rotas
 * Lê todos os arquivos da pasta /routes e registra no app Express
 */
module.exports = (app) => {
    const routesPath = path.join(__dirname, '../routes');

    // Verifica se a pasta routes existe para evitar erro de sistema
    if (!fs.existsSync(routesPath)) {
        console.log('⚠️  Aviso: Pasta /routes não encontrada.');
        return;
    }

    // Lê todos os arquivos dentro de /routes
    const routeFiles = fs.readdirSync(routesPath);

    routeFiles.forEach(file => {
        // Filtra apenas arquivos que terminam em .js
        if (file.endsWith('.js')) {
            try {
                // Importa o arquivo de rota (ex: contas.js, me.js)
                const route = require(path.join(routesPath, file));
                
                // Ativa a rota no Express
                // O app.use(route) permite que as rotas internas usem caminhos próprios
                app.use(route);
                
                console.log(`  📦 [ROTA] -> ${file} carregada com sucesso`);
            } catch (error) {
                console.log(`  ❌ [ERRO] -> Falha ao carregar o arquivo ${file}:`);
                console.log(`     Motivo: ${error.message}`);
            }
        }
    });
};