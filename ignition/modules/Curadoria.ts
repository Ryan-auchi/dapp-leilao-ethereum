import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CuradoriaModule", (m) => {
  const dono = m.getAccount(0);

  // Deploy Token
  const token = m.contract("CuradoriaToken", [dono]);

  // Deploy DAO
  const dao = m.contract("CuradoriaDAO", [token]);

  return { token, dao };
});
