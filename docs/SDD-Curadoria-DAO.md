# Software Design Document (SDD) - Curadoria de Leilões via DAO

## 1. Visão Geral (Overview)
A plataforma atualmente permite leilões simples e diretos através do contrato `LeilaoSimples.sol`. O novo objetivo é adicionar uma camada de governança descentralizada (DAO). O fluxo passará a ser: qualquer usuário propõe a criação do leilão de um item (ex: "Honda Bros 150 2008"), os usuários que possuem um Token de Governança votam e, se a proposta for aprovada e o prazo expirar, o próprio contrato da DAO realiza o deploy automático de um novo `LeilaoSimples` para aquele item.

## 2. Arquitetura do Sistema
O sistema será composto por 3 contratos principais:
1. **CuradoriaToken (ERC20Votes)**: Um token ERC20 padrão OpenZeppelin com a extensão `ERC20Votes`, que permite rastrear o poder de voto (snapshot) dos usuários e fazer delegação.
2. **CuradoriaDAO (Governor)**: O contrato principal de governança. Vai gerenciar o ciclo de vida das propostas (Criação, Votação, Encerramento e Execução). 
3. **LeilaoSimples (Modificado)**: O contrato do leilão em si, que receberá um pequeno ajuste no construtor.

## 3. Mudanças no Código Atual (`LeilaoSimples.sol`)
Atualmente, o `LeilaoSimples` herda de `Ownable` e no construtor define `msg.sender` (quem fez o deploy) como o `owner`. 
Se a DAO fizer o deploy, a DAO será a dona do contrato, impossibilitando que um usuário encerre o leilão e resgate os fundos (a menos que a DAO votasse para isso).

**Ajuste Necessário:**
Permitir que a DAO passe o endereço do "vendedor" (beneficiário/owner) como parâmetro no construtor.

```solidity
// Novo Construtor no LeilaoSimples.sol
constructor(string memory _nomeDoItem, address _vendedor) Ownable(_vendedor) {
    itemLeiloado = _nomeDoItem;
}
```

## 4. Design da CuradoriaDAO

O contrato da DAO será construído usando a biblioteca `Governor` do OpenZeppelin para segurança e padronização. 

**Estrutura da Proposta (Proposal):**
Quando alguém quiser leiloar um item, a pessoa enviará uma transação para a DAO criar uma proposta contendo:
*   `targets`: O endereço da própria DAO (ou de uma Factory) que tem a função de deploy.
*   `values`: 0 (Não enviaremos ETH na chamada de criação).
*   `calldatas`: O encode da chamada da função `deployLeilao(string memory nomeItem, address vendedor)`.
*   `description`: "Aprovar a criacao de um leilao para uma Honda Bros 150 2008".

**Função de Deploy na DAO:**
A DAO precisará de uma função pública que só pode ser chamada por ela mesma (durante o momento de execução da proposta) para fazer o deploy do contrato:

```solidity
contract CuradoriaDAO is Governor ... {
    // Evento para indexar o leilão criado no front-end
    event LeilaoAprovadoECriado(address leilaoAddress, string item, address vendedor);

    // Função que a proposta vai chamar caso aprovada
    function executarDeployLeilao(string memory nomeItem, address vendedor) public {
        // Apenas a própria DAO via execute() pode chamar
        require(msg.sender == address(this), "Apenas a DAO pode executar");
        
        // Deploy automático do contrato
        LeilaoSimples novoLeilao = new LeilaoSimples(nomeItem, vendedor);
        
        emit LeilaoAprovadoECriado(address(novoLeilao), nomeItem, vendedor);
    }
}
```

## 5. Ciclo de Vida da Proposta (Fluxo do Usuário)
1. **Propor (Propose)**: O usuário "Alice" (que quer vender a moto) chama a função `propose` na DAO. Ela inclui a descrição e o calldata apontando para `executarDeployLeilao("Honda Bros 150 2008", address(Alice))`.
2. **Período de Votação (Voting Period)**: Os detentores do `CuradoriaToken` invocam `castVote`.
   *   Opções: `0` (Contra), `1` (A Favor), `2` (Abstenção).
3. **Fim da Votação**: O tempo limite especificado no contrato (ex: 3 dias ou um número de blocos) expira.
4. **Executar (Execute)**: Se os votos "A Favor" vencerem e o Quórum mínimo for atingido, qualquer pessoa pode chamar a função `execute` na DAO.
5. **Resultado Mágico**: A função `execute` da DAO verifica que a proposta passou e dispara automaticamente o calldata, chamando a sua função interna `executarDeployLeilao`. O `LeilaoSimples` é criado e a Alice é definida como dona (`owner`) e recebedora dos fundos ao final daquele leilão.

## 6. Requisitos de Implementação
*   **Instalação**: Atualizar ou instalar as extensões de governança (`@openzeppelin/contracts`).
*   **Testes**: Atualizar a suíte do Hardhat/Chai no arquivo `test/Leilao.ts` para testar o ciclo completo da DAO: `Mint Token -> Propor -> Avançar Blocos -> Votar -> Avançar Blocos -> Executar -> Validar criação do Leilão`.
*   **Parâmetros do Governor**:
    *   `Voting Delay`: 1 bloco (Tempo entre propor e começar a votar).
    *   `Voting Period`: X blocos (Equivalente a alguns minutos/horas em testnet, customizável).
    *   `Proposal Threshold`: Quantidade mínima de tokens que alguém precisa ter para criar uma proposta (pode ser 0 para começar).
    *   `Quorum`: Percentual mínimo de tokens que precisam votar para a proposta ser válida (ex: 4%).
