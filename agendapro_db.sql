-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 13/04/2026 às 03:53
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `agendapro_db`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `agendamentos`
--

CREATE TABLE `agendamentos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `funcionario_id` int(11) NOT NULL,
  `servico_id` int(11) NOT NULL,
  `cliente_nome` varchar(255) NOT NULL,
  `cliente_contato` varchar(50) DEFAULT NULL,
  `data_agendada` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fim` time NOT NULL,
  `status` enum('pendente','confirmado','cancelado','concluido') DEFAULT 'pendente',
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `agendamentos`
--

INSERT INTO `agendamentos` (`id`, `usuario_id`, `funcionario_id`, `servico_id`, `cliente_nome`, `cliente_contato`, `data_agendada`, `hora_inicio`, `hora_fim`, `status`, `criado_em`) VALUES
(109, 36, 12, 89, 'BRUNA', '(85) 99604-0748', '2026-04-13', '09:30:00', '10:30:00', 'pendente', '2026-04-12 17:00:09'),
(112, 36, 12, 89, 'agora ', '(85) 99604-0748', '2026-04-13', '10:45:00', '11:45:00', 'pendente', '2026-04-12 17:31:13'),
(113, 36, 12, 89, 'Adre', '(85) 99604-0748', '2026-04-16', '09:45:00', '10:45:00', 'confirmado', '2026-04-12 23:13:16'),
(114, 36, 12, 89, 'BRUNA', '(85) 99604-0748', '2026-04-13', '08:00:00', '09:00:00', 'pendente', '2026-04-13 01:39:16');

-- --------------------------------------------------------

--
-- Estrutura para tabela `config_loja`
--

CREATE TABLE `config_loja` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `hora_abre` time DEFAULT NULL,
  `hora_fecha` time DEFAULT NULL,
  `almoco_ini` time DEFAULT NULL,
  `almoco_fim` time DEFAULT NULL,
  `dias_aberto` text DEFAULT NULL,
  `foto_loja` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `config_loja`
--

INSERT INTO `config_loja` (`id`, `usuario_id`, `hora_abre`, `hora_fecha`, `almoco_ini`, `almoco_fim`, `dias_aberto`, `foto_loja`) VALUES
(59, 36, '08:00:00', '20:00:00', '00:00:00', '00:00:00', 'Seg, Ter, Qua, Qui, Sex, Sáb', 'uploads/lojas/foto_loja-1776044280982-630307315.png');

-- --------------------------------------------------------

--
-- Estrutura para tabela `contas`
--

CREATE TABLE `contas` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `whatsapp` varchar(20) DEFAULT NULL,
  `senha` varchar(255) DEFAULT NULL,
  `tipo` enum('cliente','admin','funcionario') DEFAULT 'cliente',
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `contas`
--

INSERT INTO `contas` (`id`, `nome`, `slug`, `email`, `whatsapp`, `senha`, `tipo`, `criado_em`) VALUES
(36, 'BOCA09', 'boca09', 'andretuf2012@gmail.com', '85996040748', '123', 'admin', '2026-04-12 03:35:53');

-- --------------------------------------------------------

--
-- Estrutura para tabela `funcionarios`
--

CREATE TABLE `funcionarios` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `especialidade` varchar(100) DEFAULT NULL,
  `hora_abre` time DEFAULT NULL,
  `hora_fecha` time DEFAULT NULL,
  `almoco_inicio` time DEFAULT NULL,
  `almoco_fim` time DEFAULT NULL,
  `dias_trabalho` varchar(50) DEFAULT '1,2,3,4,5,6',
  `foto` varchar(255) DEFAULT NULL,
  `servicos_especializados` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `funcionarios`
--

INSERT INTO `funcionarios` (`id`, `usuario_id`, `nome`, `especialidade`, `hora_abre`, `hora_fecha`, `almoco_inicio`, `almoco_fim`, `dias_trabalho`, `foto`, `servicos_especializados`) VALUES
(12, 36, 'andre', '', '08:00:00', '16:00:00', '00:00:00', '00:00:00', '1,2,3,4,5,6,0', 'uploads/funcionarios/1775965026448-819182239.jpg', '89');

-- --------------------------------------------------------

--
-- Estrutura para tabela `servicos`
--

CREATE TABLE `servicos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `preco` decimal(10,2) NOT NULL,
  `duracao` int(11) DEFAULT 30,
  `foto1` varchar(255) DEFAULT NULL,
  `foto2` varchar(255) DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `servicos`
--

INSERT INTO `servicos` (`id`, `usuario_id`, `nome`, `descricao`, `preco`, `duracao`, `foto1`, `foto2`, `criado_em`) VALUES
(89, 36, 'Corte sufista + barba', 'BOCA DE 09', 15.00, 60, 'uploads/servicos/fotos-1776038471543-921055685.jpg', NULL, '2026-04-12 03:36:38');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `agendamentos`
--
ALTER TABLE `agendamentos`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `config_loja`
--
ALTER TABLE `config_loja`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `contas`
--
ALTER TABLE `contas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Índices de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `servicos`
--
ALTER TABLE `servicos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `agendamentos`
--
ALTER TABLE `agendamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT de tabela `config_loja`
--
ALTER TABLE `config_loja`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT de tabela `contas`
--
ALTER TABLE `contas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de tabela `funcionarios`
--
ALTER TABLE `funcionarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de tabela `servicos`
--
ALTER TABLE `servicos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `config_loja`
--
ALTER TABLE `config_loja`
  ADD CONSTRAINT `config_loja_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `funcionarios`
--
ALTER TABLE `funcionarios`
  ADD CONSTRAINT `funcionarios_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `servicos`
--
ALTER TABLE `servicos`
  ADD CONSTRAINT `servicos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `contas` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
