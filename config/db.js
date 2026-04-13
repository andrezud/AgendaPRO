const mysql = require('mysql2/promise');

/**
 * CONFIGURAÇÃO DO BANCO DE DADOS - AGENDA PRO
 * Utilizando Pool de conexões para melhor performance e segurança.
 */
const pool = mysql.createPool({
    host: '127.0.0.1',           // IP local direto (mais estável que 'localhost')
    user: 'root',                // Usuário padrão do XAMPP
    password: '',                // Senha padrão do XAMPP (vazia)
    database: 'agendapro_db',    // Nome do seu banco de dados
    port: 3306,                  // Porta padrão confirmada no seu XAMPP
    waitForConnections: true,    // Aguarda se todas as conexões do pool estiverem ocupadas
    connectionLimit: 10,         // Limite de conexões simultâneas
    queueLimit: 0,               // Sem limite de fila para requisições
    connectTimeout: 30000,       // 30 segundos de paciência para o handshake inicial
    enableKeepAlive: true,       // Mantém a conexão ativa para evitar ETIMEDOUT
    keepAliveInitialDelay: 10000 // Inicia o keep-alive após 10 segundos
});

module.exports = {
    /**
     * Função Query padronizada para o projeto
     * @param {string} sql - Comando SQL (ex: SELECT * FROM contas WHERE id = ?)
     * @param {array} params - Valores para substituir os '?' (evita SQL Injection)
     */
    async query(sql, params) {
        try {
            // O .execute é mais seguro que o .query pois usa Prepared Statements
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (err) {
            // Log detalhado para facilitar seu debug no terminal
            console.error("❌ [DB ERROR]:", err.message);

            if (err.code === 'ECONNREFUSED') {
                console.log("👉 DICA: O MySQL no XAMPP caiu ou está em outra porta.");
            } else if (err.code === 'ER_BAD_DB_ERROR') {
                console.log("👉 DICA: O banco 'agendapro_db' não existe no seu phpMyAdmin.");
            } else if (err.code === 'ETIMEDOUT') {
                console.log("👉 DICA: O Firewall do Windows ou Antivírus bloqueou a conexão.");
            }

            throw err;
        }
    }
};