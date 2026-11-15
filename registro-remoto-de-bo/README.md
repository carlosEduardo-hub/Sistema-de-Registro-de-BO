# 📄Sistema de Registro de B.O. com Reconhecimento de Voz — Raspberry Pi
Este projeto implementa um Sistema de Registro de Boletim de Ocorrência (B.O.) integrado com uma Raspberry Pi, oferecendo uma interface simples e acessível para registro de ocorrências por:

- ✅ Reconhecimento de voz — Permite que o usuário forneça informações verbalmente, com conversão automática de fala para texto.
- ✅ Entrada manual — Formulário simplificado para digitação das informações.
- ✅ Registro por cliques — Opções pré-configuradas para ocorrências comuns, agilizando o preenchimento.

## Fluxo Visual do Sistema
![image](https://github.com/user-attachments/assets/e04829e0-3191-4cf3-8c74-f97e33549e28)

## Descrição Rápida do Sistema
Sistema leve para registro de Boletins de Ocorrência em uma Raspberry Pi, combinando reconhecimento de voz e interface web responsiva. Usuários podem ditar informações (fala → texto), preencher campos manualmente ou usar botões pré-configurados para agilizar o registro. As entradas são validadas e armazenadas localmente (ex.: SQLite/JSON) com opção de exportação (CSV/JSON) e logs de auditoria.

Principais pontos:
- Captura de áudio via microfone USB/3.5mm e transcrição em tempo real (modelo local ou serviço na nuvem).
- Formulários simplificados e templates para ocorrências comuns.
- Armazenamento local, exportação e histórico consultável.
- Interface acessível pela rede local (navegador), otimizada para Raspberry Pi.
- Foco em implantação simples (Node.js), baixa latência e privacidade dos dados.


## 🚀 Como Rodar o Projeto

### ✅ Pré-requisitos
- [Node.js](https://nodejs.org/) (versão recomendada: 16 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### ⚙️ Instalação

1. Clone o repositório:
   ```bash
   git clone [link repositorio]
   cd registro-remoto-de-bo
2. Instale as dependências:
   ```bash
   npm install
3. Para iniciar o ambiente de desenvolvimento:
   ```bash
   npm run dev

