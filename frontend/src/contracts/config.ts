// Configuração da rede e endereços dos contratos implantados na Sepolia.
export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export const ADDRESSES = {
  leilao: "0x17B97B3fBbD56180E58937AC3204BBC161d40aB6",
  token: "0x847b0e870B379c5b3ee3Ef36F2896E8d08AF0a6F",
  dao: "0xF06441B16F7c981a470084f26eBEcA3E31268817",
} as const;

// ABIs mínimas — apenas o que a dApp consome.
export const LEILAO_ABI = [
  "function itemLeiloado() view returns (string)",
  "function maiorLance() view returns (uint256)",
  "function maiorLancador() view returns (address)",
  "function leilaoEncerrado() view returns (bool)",
  "function owner() view returns (address)",
  "function darLance() payable",
  "function encerrarLeilao()",
];

export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function getVotes(address) view returns (uint256)",
  "function delegates(address) view returns (address)",
  "function delegate(address delegatee)",
];

export const DAO_ABI = [
  "function name() view returns (string)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function quorum(uint256 blockNumber) view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
];
