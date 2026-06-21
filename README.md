# DApp Leilão + DAO de Curadoria

Aplicação descentralizada (DApp) desenvolvida com Solidity e Hardhat 3, implantada na testnet Sepolia. Trabalhos 02 e 03 da disciplina de Tópicos Especiais em Computação - Blockchain (IFPI).

## Contratos na Sepolia

### Trabalho 02 — Leilão
| Contrato | Endereço |
|---|---|
| LeilaoSimples | `0x17B97B3fBbD56180E58937AC3204BBC161d40aB6` |

🔍 https://sepolia.etherscan.io/address/0x17B97B3fBbD56180E58937AC3204BBC161d40aB6

### Trabalho 03 — DAO
| Contrato | Endereço |
|---|---|
| CuradoriaToken | `0x847b0e870B379c5b3ee3Ef36F2896E8d08AF0a6F` |
| CuradoriaDAO | `0xF06441B16F7c981a470084f26eBEcA3E31268817` |

---

## Trabalho 02 — Leilão

### Como funciona

- Qualquer pessoa pode dar um lance enviando Ether para o contrato
- O lance precisa ser maior que o atual
- Quem é superado recebe o dinheiro de volta automaticamente
- Apenas o dono do contrato pode encerrar o leilão
- Ao encerrar, o maior lance é transferido para o dono

### Testes (6 cenários)

- Primeiro lance registrado corretamente
- Lance menor que o atual é rejeitado
- Lance anterior devolvido automaticamente quando superado
- Encerramento transfere o saldo ao dono
- Conta que não é o dono não pode encerrar
- Lance após leilão encerrado é rejeitado

---

## Trabalho 03 — DAO de Curadoria

### Como funciona

A DAO permite que detentores do token `CuradoriaToken` votem em propostas. Quando uma proposta é aprovada, a DAO automaticamente publica um novo contrato `LeilaoSimples` para o item aprovado.

**Fluxo completo:**
1. Qualquer pessoa propõe um item para leilão informando o nome e o endereço do vendedor
2. Detentores do token votam a favor ou contra durante 100 blocos (~20 min na Sepolia)
3. Se aprovada com quórum mínimo de 4%, qualquer pessoa pode executar a proposta
4. A DAO publica automaticamente um novo `LeilaoSimples` com o vendedor como dono

**Parâmetros de governança:**
- Voting Delay: 1 bloco
- Voting Period: 100 blocos
- Quórum: 4% do total de tokens
- Proposal Threshold: 0 (qualquer um pode propor)

### Testes (6 cenários)

- Ciclo completo: propor → votar → executar → leilão criado
- Proposta rejeitada não pode ser executada
- Voto duplo do mesmo eleitor é rejeitado
- Execução antes do período de votação terminar é rejeitada
- Mint de token por conta que não é o dono é rejeitado
- Chamada direta a `executarDeployLeilao` sem passar pela DAO é rejeitada

---

## Trabalho 04 — Frontend Web3 (React + Vite)

Interface descentralizada que integra os três contratos já implantados na Sepolia.
Todo o código está na pasta [`frontend/`](frontend/).

### O que foi feito

- **Conexão MetaMask** com detecção automática da rede Sepolia (botão para trocar/adicionar a rede)
- **Dashboard**: endereço da carteira, saldo ETH, saldo do token CTK e poder de voto
- **Leilão**: leitura de `itemLeiloado`, `maiorLance`, `maiorLancador`, `leilaoEncerrado` e envio de lance via `darLance()` (payable)
- **Governança**: parâmetros do Governor (voting delay, voting period, quórum) e delegação de voto (`delegate`)
- **Tratamento de erros**: MetaMask ausente, rede incorreta e transações rejeitadas/saldo insuficiente
- Identidade visual **neo-brutalista** (laranja, branco e preto), responsiva para desktop e mobile
- **React Router** com 4 telas: Landing, Dashboard, Leilão e Governança
- Componentes reutilizáveis (`Button`, `Card`, `Stat`, `Alert`, `Navbar`, `NetworkGuard`) e **TypeScript**

### Stack

- React 18 + Vite + TypeScript
- ethers.js v6
- React Router v6

### Como rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço exibido (ex.: http://localhost:5173), conecte a MetaMask na rede
**Sepolia** e use ETH de teste de um faucet.

---

## Tecnologias

- Solidity 0.8.28
- Hardhat 3
- ethers.js v6
- OpenZeppelin Contracts v5 (Ownable, Governor, ERC20Votes)
- TypeScript / Mocha

## Instalação

```bash
npm install
```

Crie um arquivo `.env` na raiz:

```
PRIVATE_KEY=sua_chave_privada_da_metamask
```

## Rodar os testes

```bash
npx hardhat test
```

## Deploy na Sepolia

**Leilão (T02):**
```bash
npx hardhat ignition deploy ignition/modules/LeilaoSimples.ts --network sepolia
```

**DAO (T03):**
```bash
npx hardhat ignition deploy ignition/modules/Curadoria.ts --network sepolia
```

## Interagir via Remix

1. Acesse https://remix.ethereum.org
2. Cole o código do contrato, compile e vá na aba **Deploy & Run**
3. Selecione **Browser Extension**, conecte a MetaMask na rede **Sepolia**
4. Em **Deployed Contracts**, clique em **+ Add Contract** e cole o endereço

**Funções do LeilaoSimples:**
- `darLance` — envia ETH para dar um lance
- `encerrarLeilao` — encerra o leilão (apenas o dono)
- `maiorLance` — consulta o maior lance atual
- `maiorLancador` — consulta quem está ganhando
- `leilaoEncerrado` — verifica se o leilão foi encerrado

## Integrantes

- (adicionar nomes do grupo)
