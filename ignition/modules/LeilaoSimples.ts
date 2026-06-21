import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LeilaoModule", (m) => {
  const leilao = m.contract("LeilaoSimples", ["Fiat Uno 2010", m.getAccount(0)]);
  return { leilao };
});
