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

    // Mint tokens to Alice and Bob so they can vote
    await token.mint(alice.address, ethers.parseEther("1000"));
    await token.mint(bob.address, ethers.parseEther("1000"));

    // Delegate voting power to themselves
    await token.connect(alice).delegate(alice.address);
    await token.connect(bob).delegate(bob.address);

    return { ethers, network, token, dao, dono, alice, bob };
  }

  it("Deve realizar o ciclo completo: propor, votar, e executar deploy do leilao", async function () {
    const { ethers, network, token, dao, alice, bob } = await deploy();
    const daoAddress = await dao.getAddress();

    // 1. Propose
    const item = "Honda Bros 150 2008";
    const vendedor = alice.address;
    
    // Encodes the calldata for `executarDeployLeilao`
    const daoInterface = dao.interface;
    const encodedFunctionCall = daoInterface.encodeFunctionData("executarDeployLeilao", [item, vendedor]);

    const description = "Aprovar a criacao de um leilao para uma Honda Bros 150 2008";
    
    const proposeTx = await dao.connect(alice).propose(
      [daoAddress],
      [0],
      [encodedFunctionCall],
      description
    );

    const proposeReceipt = await proposeTx.wait();
    
    // Extract Proposal ID from event
    const logs = await dao.queryFilter(dao.filters.ProposalCreated(), proposeReceipt?.blockNumber, proposeReceipt?.blockNumber);
    const proposalId = logs[0].args[0];

    // 2. Voting Delay (Avançar 1 bloco, configurado no GovernorSettings)
    await ethers.provider.send("evm_mine", []);

    // 3. Vote
    // 1 = For
    await dao.connect(alice).castVote(proposalId, 1);
    await dao.connect(bob).castVote(proposalId, 1);

    // 4. Voting Period (Avançar os blocos necessários, configurado como 100 no GovernorSettings)
    // To speed up tests, we mine 100 blocks
    for (let i = 0; i < 101; i++) {
        await ethers.provider.send("evm_mine", []);
    }

    // 5. Execute
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    
    const executeTx = await dao.execute(
      [daoAddress],
      [0],
      [encodedFunctionCall],
      descriptionHash
    );
    const executeReceipt = await executeTx.wait();

    // Verify if Leilao was created
    const leilaoLogs = await dao.queryFilter(dao.filters.LeilaoAprovadoECriado(), executeReceipt?.blockNumber, executeReceipt?.blockNumber);
    expect(leilaoLogs.length).to.equal(1);
    
    const novoLeilaoAddress = leilaoLogs[0].args.leilaoAddress;
    const novoLeilaoItem = leilaoLogs[0].args.item;
    const novoLeilaoVendedor = leilaoLogs[0].args.vendedor;

    expect(novoLeilaoItem).to.equal(item);
    expect(novoLeilaoVendedor).to.equal(vendedor);

    // Check Leilao contract
    const leilaoContract = await ethers.getContractAt("LeilaoSimples", novoLeilaoAddress);
    expect(await leilaoContract.itemLeiloado()).to.equal(item);
    expect(await leilaoContract.owner()).to.equal(vendedor);
  });
});
