// Utilitários do fluxo de governança (OpenZeppelin Governor).
import { Interface } from "ethers";
import { ADDRESSES, DAO_TARGET_ABI } from "./config";

// Enum de estados do Governor (mesma ordem do contrato OpenZeppelin).
export const PROPOSAL_STATES = [
  "Pendente",
  "Ativa",
  "Cancelada",
  "Derrotada",
  "Aprovada",
  "Na fila",
  "Expirada",
  "Executada",
] as const;

export type ProposalState = (typeof PROPOSAL_STATES)[number];

// Cor do badge por estado, para a UI.
export function stateClass(state: number): string {
  switch (state) {
    case 1: // Ativa
      return "status-open";
    case 4: // Aprovada
    case 7: // Executada
      return "status-ok";
    case 2: // Cancelada
    case 3: // Derrotada
    case 6: // Expirada
      return "status-closed";
    default:
      return "status-pending";
  }
}

// Suporte ao voto: 0 = Contra, 1 = A favor, 2 = Abstenção.
export const VOTE_SUPPORT = { CONTRA: 0, A_FAVOR: 1, ABSTENCAO: 2 } as const;

// Monta os parâmetros de uma proposta que manda a DAO criar um novo leilão.
// O alvo é a própria DAO, pois executarDeployLeilao exige msg.sender == address(this).
export function buildLeilaoProposal(item: string, vendedor: string) {
  const iface = new Interface(DAO_TARGET_ABI);
  const calldata = iface.encodeFunctionData("executarDeployLeilao", [
    item,
    vendedor,
  ]);
  return {
    targets: [ADDRESSES.dao],
    values: [0n],
    calldatas: [calldata],
  };
}

// ---- Persistência local das propostas criadas pela dApp ----
// Guardamos os parâmetros porque são necessários para executar (e calcular o hash).
export interface StoredProposal {
  id: string; // proposalId como string (uint256)
  item: string;
  vendedor: string;
  description: string;
  targets: string[];
  values: string[]; // bigint serializado como string
  calldatas: string[];
  txHash: string;
  createdAt: number;
}

const KEY = "curadoria_proposals";

export function loadProposals(): StoredProposal[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveProposal(p: StoredProposal) {
  const all = loadProposals();
  if (all.some((x) => x.id === p.id)) return;
  localStorage.setItem(KEY, JSON.stringify([p, ...all]));
}
