import { expect } from "chai";
import { network } from "hardhat";

describe("LeilaoSimples", function () {
  async function deploy() {
    const { ethers } = await network.getOrCreate();
    const [dono, usuario1, usuario2] = await ethers.getSigners();
    const Leilao = await ethers.getContractFactory("LeilaoSimples");
    const leilao = await Leilao.deploy("Fiat Uno 2010", dono.address);
    return { ethers, leilao, dono, usuario1, usuario2 };
  }

  it("Deve registrar o primeiro lance corretamente", async function () {
    const { ethers, leilao, usuario1 } = await deploy();

    const valorLance = ethers.parseEther("1.0");
    await leilao.connect(usuario1).darLance({ value: valorLance });

    expect(await leilao.maiorLancador()).to.equal(usuario1.address);
    expect(await leilao.maiorLance()).to.equal(valorLance);
  });

  it("Deve rejeitar lance menor ou igual ao maior lance atual", async function () {
    const { ethers, leilao, usuario1, usuario2 } = await deploy();

    await leilao.connect(usuario1).darLance({ value: ethers.parseEther("1.0") });

    await expect(
      leilao.connect(usuario2).darLance({ value: ethers.parseEther("0.5") })
    ).to.be.revertedWith("O lance precisa ser maior que o atual.");
  });

  it("Deve devolver o dinheiro ao lance anterior quando superado", async function () {
    const { ethers, leilao, usuario1, usuario2 } = await deploy();

    const lance1 = ethers.parseEther("1.0");
    const lance2 = ethers.parseEther("2.0");

    await leilao.connect(usuario1).darLance({ value: lance1 });

    const saldoAntes = await ethers.provider.getBalance(usuario1.address);
    await leilao.connect(usuario2).darLance({ value: lance2 });
    const saldoDepois = await ethers.provider.getBalance(usuario1.address);

    expect(saldoDepois).to.be.greaterThan(saldoAntes);
    expect(await leilao.maiorLancador()).to.equal(usuario2.address);
    expect(await leilao.maiorLance()).to.equal(lance2);
  });

  it("Deve encerrar o leilao e transferir o valor ao dono", async function () {
    const { ethers, leilao, dono, usuario1 } = await deploy();

    await leilao.connect(usuario1).darLance({ value: ethers.parseEther("1.0") });

    const saldoAntes = await ethers.provider.getBalance(dono.address);
    await leilao.connect(dono).encerrarLeilao();
    const saldoDepois = await ethers.provider.getBalance(dono.address);

    expect(await leilao.leilaoEncerrado()).to.equal(true);
    expect(saldoDepois).to.be.greaterThan(saldoAntes);
  });

  it("Deve rejeitar encerramento por conta que nao e o dono", async function () {
    const { leilao, usuario1 } = await deploy();

    await expect(
      leilao.connect(usuario1).encerrarLeilao()
    ).to.be.revertedWithCustomError(leilao, "OwnableUnauthorizedAccount");
  });

  it("Deve rejeitar lance apos o leilao encerrado", async function () {
    const { ethers, leilao, dono, usuario1, usuario2 } = await deploy();

    await leilao.connect(usuario1).darLance({ value: ethers.parseEther("1.0") });
    await leilao.connect(dono).encerrarLeilao();

    await expect(
      leilao.connect(usuario2).darLance({ value: ethers.parseEther("2.0") })
    ).to.be.revertedWith("O leilao ja foi encerrado.");
  });
});
