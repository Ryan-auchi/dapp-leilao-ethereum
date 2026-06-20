import { expect } from "chai";
import { network } from "hardhat";

describe("CuradoriaDAO", function () {
  async function deploy() {
    const { ethers } = await network.getOrCreate();
    const [dono, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("CuradoriaToken");
    const token = await Token.deploy(dono.address);
    await token.waitForDeployment();

    const DAO = await ethers.getContractFactory("CuradoriaDAO");
    const dao = await DAO.deploy(await token.getAddress());
    await dao.waitForDeployment();

    await token.mint(alice.address, ethers.parseEther("1000"));
    await token.mint(bob.address, ethers.parseEther("1000"));

    await token.connect(alice).delegate(alice.address);
    await token.connect(bob).delegate(bob.address);

    return { ethers, network, token, dao, dono, alice, bob };
  }

  async function criarProposta(dao: any, ethers: any, alice: any, item: string, vendedor: string) {
    const daoAddress = await dao.getAddress();
    const encodedCall = dao.interface.encodeFunctionData("executarDeployLeilao", [item, vendedor]);
    const description = `Aprovar leilao: ${item}`;

    const tx = await dao.connect(alice).propose([daoAddress], [0], [encodedCall], description);
    const receipt = await tx.wait();
    const logs = await dao.queryFilter(dao.filters.ProposalCreated(), receipt?.blockNumber, receipt?.blockNumber);
    const proposalId = logs[0].args[0];

    return { proposalId, encodedCall, description, daoAddress };
  }

  it("Deve realizar o ciclo completo: propor, votar, e executar deploy do leilao", async function () {
    const { ethers, dao, alice, bob } = await deploy();
    const item = "Honda Bros 150 2008";
    const { proposalId, encodedCall, description, daoAddress } = await criarProposta(dao, ethers, alice, item, alice.address);

    await ethers.provider.send("evm_mine", []);

    await dao.connect(alice).castVote(proposalId, 1);
    await dao.connect(bob).castVote(proposalId, 1);

    for (let i = 0; i < 101; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    const executeTx = await dao.execute([daoAddress], [0], [encodedCall], descriptionHash);
    const executeReceipt = await executeTx.wait();

    const leilaoLogs = await dao.queryFilter(dao.filters.LeilaoAprovadoECriado(), executeReceipt?.blockNumber, executeReceipt?.blockNumber);
    expect(leilaoLogs.length).to.equal(1);

    const leilaoContract = await ethers.getContractAt("LeilaoSimples", leilaoLogs[0].args.leilaoAddress);
    expect(await leilaoContract.itemLeiloado()).to.equal(item);
    expect(await leilaoContract.owner()).to.equal(alice.address);
  });

  it("Deve rejeitar execucao de proposta reprovada por votos contra", async function () {
    const { ethers, dao, alice, bob } = await deploy();
    const item = "Carro Rejeitado";
    const { proposalId, encodedCall, description, daoAddress } = await criarProposta(dao, ethers, alice, item, alice.address);

    await ethers.provider.send("evm_mine", []);

    // 0 = Against
    await dao.connect(alice).castVote(proposalId, 0);
    await dao.connect(bob).castVote(proposalId, 0);

    for (let i = 0; i < 101; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    await expect(
      dao.execute([daoAddress], [0], [encodedCall], descriptionHash)
    ).to.be.revertedWithCustomError(dao, "GovernorUnexpectedProposalState");
  });

  it("Deve rejeitar voto duplo do mesmo eleitor", async function () {
    const { ethers, dao, alice } = await deploy();
    const { proposalId } = await criarProposta(dao, ethers, alice, "Moto Teste", alice.address);

    await ethers.provider.send("evm_mine", []);

    await dao.connect(alice).castVote(proposalId, 1);

    await expect(
      dao.connect(alice).castVote(proposalId, 1)
    ).to.be.revertedWithCustomError(dao, "GovernorAlreadyCastVote");
  });

  it("Deve rejeitar execucao antes do periodo de votacao terminar", async function () {
    const { ethers, dao, alice, bob } = await deploy();
    const item = "Execucao Antecipada";
    const { proposalId, encodedCall, description, daoAddress } = await criarProposta(dao, ethers, alice, item, alice.address);

    await ethers.provider.send("evm_mine", []);

    await dao.connect(alice).castVote(proposalId, 1);
    await dao.connect(bob).castVote(proposalId, 1);

    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    await expect(
      dao.execute([daoAddress], [0], [encodedCall], descriptionHash)
    ).to.be.revertedWithCustomError(dao, "GovernorUnexpectedProposalState");
  });

  it("Deve rejeitar mint de token por conta que nao e o dono", async function () {
    const { ethers, token, alice } = await deploy();

    await expect(
      token.connect(alice).mint(alice.address, ethers.parseEther("1000"))
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("Deve rejeitar chamada direta a executarDeployLeilao sem passar pela DAO", async function () {
    const { ethers, dao, alice } = await deploy();

    await expect(
      dao.connect(alice).executarDeployLeilao("Carro Direto", alice.address)
    ).to.be.revertedWith("Apenas a DAO pode executar");
  });
});
