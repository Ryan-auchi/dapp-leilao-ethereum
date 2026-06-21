# Curadoria DAO — Frontend (React + Vite + TypeScript)

dApp para interagir com os contratos implantados na **Sepolia**:

| Contrato        | Endereço                                     |
| --------------- | -------------------------------------------- |
| LeilaoSimples   | `0x17B97B3fBbD56180E58937AC3204BBC161d40aB6` |
| CuradoriaToken  | `0x847b0e870B379c5b3ee3Ef36F2896E8d08AF0a6F` |
| CuradoriaDAO    | `0xF06441B16F7c981a470084f26eBEcA3E31268817` |

## Stack

- React 18 + Vite + TypeScript
- ethers.js v6
- React Router
- CSS neo-brutalista (laranja / branco / preto), responsivo

## Funcionalidades

- Conexão MetaMask + detecção da rede Sepolia (com botão de troca/adição)
- Exibe endereço, saldo ETH, saldo CTK e poder de voto
- **Leilão**: lê `itemLeiloado`, `maiorLance`, `maiorLancador`, `leilaoEncerrado` e envia lance via `darLance()`
- **Governança**: parâmetros da DAO (delay, período, quórum) e delegação de voto
- Tratamento de erros: MetaMask ausente, rede incorreta, transação rejeitada/saldo insuficiente

## Rodando

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço exibido (ex.: http://localhost:5173), conecte a MetaMask na
rede Sepolia e use ETH de teste de um faucet.

## Telas

- `/` Landing Page
- `/dashboard` Dashboard
- `/leilao` Leilão
- `/governanca` Governança DAO
