// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LeilaoSimples is Ownable {
    string public itemLeiloado;
    address payable public maiorLancador;
    uint public maiorLance;
    bool public leilaoEncerrado;

    constructor(string memory _nomeDoItem) Ownable(msg.sender) {
        itemLeiloado = _nomeDoItem;
    }

    function darLance() public payable {
        require(!leilaoEncerrado, "O leilao ja foi encerrado.");
        require(msg.value > maiorLance, "O lance precisa ser maior que o atual.");

        if (maiorLance > 0) {
            (bool sucesso, ) = maiorLancador.call{value: maiorLance}("");
            require(sucesso, "Falha ao devolver o fundo.");
        }

        maiorLancador = payable(msg.sender);
        maiorLance = msg.value;
    }

    function encerrarLeilao() public onlyOwner {
        require(!leilaoEncerrado, "O leilao ja foi encerrado.");
        leilaoEncerrado = true;

        if (maiorLance > 0) {
            (bool sucesso, ) = owner().call{value: maiorLance}("");
            require(sucesso, "Falha ao transferir o saldo.");
        }
    }
}