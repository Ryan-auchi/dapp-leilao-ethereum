// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "./LeilaoSimples.sol";

contract CuradoriaDAO is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    event LeilaoAprovadoECriado(address leilaoAddress, string item, address vendedor);

    constructor(IVotes _token)
        Governor("CuradoriaDAO")
        GovernorSettings(1 /* 1 block */, 100 /* 100 blocks */, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
    {}

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function executarDeployLeilao(string memory nomeItem, address vendedor) public {
        require(msg.sender == address(this), "Apenas a DAO pode executar");
        
        LeilaoSimples novoLeilao = new LeilaoSimples(nomeItem, vendedor);
        
        emit LeilaoAprovadoECriado(address(novoLeilao), nomeItem, vendedor);
    }
}