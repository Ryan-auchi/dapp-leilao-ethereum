# DApp Leilão Ethereum

Aplicação descentralizada (DApp) de leilão desenvolvida com Solidity e Hardhat 3, implantada na testnet Sepolia. Trabalho 02 da disciplina de Tópicos Especiais em Computação - Blockchain (IFPI).

## Contrato na Sepolia

**Endereço:** `0x17B97B3fBbD56180E58937AC3204BBC161d40aB6`

Verificar em: https://sepolia.etherscan.io/address/0x17B97B3fBbD56180E58937AC3204BBC161d40aB6

## Como funciona

O contrato implementa um leilão simples onde:

- Qualquer pessoa pode dar um lance enviando Ether para o contrato
- O lance precisa ser maior que o atual
- Quem é superado recebe o dinheiro de volta automaticamente
- Apenas o dono do contrato pode encerrar o leilão
- Ao encerrar, o maior lance é transferido para o dono

## Tecnologias

- Solidity 0.8.28
- Hardhat 3
- ethers.js v6
- OpenZeppelin Contracts v5
- TypeScript / Mocha

## Pré-requisitos

- Node.js 18+
- npm

## Instalação

```bash
npm install
```

## Rodar os testes

```bash
npx hardhat test
```

Os testes cobrem os seguintes cenários:

- Primeiro lance registrado corretamente
- Lance menor que o atual é rejeitado
- Lance anterior devolvido automaticamente quando superado
- Encerramento transfere o saldo ao dono
- Conta que não é o dono não pode encerrar
- Lance após leilão encerrado é rejeitado

## Deploy na Sepolia

1. Crie um arquivo `.env` na raiz do projeto:

```
PRIVATE_KEY=sua_chave_privada_da_metamask
```

2. Obtenha ETH de teste em https://cloud.google.com/application/web3/faucet/ethereum/sepolia

3. Execute o deploy:

```bash
npx hardhat ignition deploy ignition/modules/LeilaoSimples.ts --network sepolia
```

## Interagir com o contrato via Remix

1. Acesse https://remix.ethereum.org
2. Crie um arquivo `LeilaoSimples.sol` na pasta `contracts` e cole o código do contrato
3. Compile o contrato (aba Solidity Compiler)
4. Na aba Deploy & Run:
   - Selecione **Browser Extension** como ambiente
   - Conecte a MetaMask na rede **Sepolia**
   - Em **Deployed Contracts**, clique em **+ Add Contract**
   - Cole o endereço: `0x17B97B3fBbD56180E58937AC3204BBC161d40aB6`
5. Use as funções disponíveis:
   - `darLance` — envie ETH para dar um lance
   - `encerrarLeilao` — encerra o leilão (apenas o dono)
   - `maiorLance` — consulta o valor do maior lance
   - `maiorLancador` — consulta o endereço do maior lancador
   - `leilaoEncerrado` — verifica se o leilão foi encerrado

## Integrantes

- (adicionar nomes do grupo)
