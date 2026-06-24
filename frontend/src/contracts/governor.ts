// Utilitários do fluxo de governança (OpenZeppelin Governor).
import {
  Contract as EthersContract,
  Interface,
  JsonRpcProvider,
  Network,
  type Provider,
} from "ethers";
import { ADDRESSES, DAO_ABI, DAO_TARGET_ABI } from "./config";

// RPC público usado exclusivamente para leitura de logs (eth_getLogs), de forma
// independente da MetaMask — assim qualquer navegador lê os eventos da blockchain.
const PUBLIC_RPC = "https://sepolia.drpc.org";
const SEPOLIA_NET = new Network("sepolia", 11155111);

// batchMaxCount:1 evita o batch JSON-RPC (que alguns nós rejeitam → "could not
// coalesce error"); staticNetwork evita o loop de detecção de rede.
function publicProvider() {
  return new JsonRpcProvider(PUBLIC_RPC, SEPOLIA_NET, {
    batchMaxCount: 1,
    staticNetwork: SEPOLIA_NET,
  });
}

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

// ---- Leitura das propostas direto da blockchain ----
// Fonte da verdade: o evento ProposalCreated emitido pela DAO. Assim qualquer
// pessoa, em qualquer navegador, enxerga todas as propostas — não só quem criou.

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const targetIface = new Interface(DAO_TARGET_ABI);

// Extrai item e vendedor decodificando o calldata da própria proposta.
function decodeItemVendedor(calldatas: string[], description: string) {
  try {
    const [item, vendedor] = targetIface.decodeFunctionData(
      "executarDeployLeilao",
      calldatas[0]
    );
    return { item: String(item), vendedor: String(vendedor) };
  } catch {
    // Proposta que não segue nosso formato: usa a descrição como rótulo.
    return { item: description || "Proposta", vendedor: ZERO_ADDR };
  }
}

// Varre os logs usando um RPC público dedicado, independente da MetaMask.
async function scanLogs(
  eventName: string,
  address: string,
  abi: string[],
  injected?: Provider | null
) {
  // Prefere o provider injetado (MetaMask): não sofre bloqueio de CORS no
  // navegador. Sem carteira (ex.: aba anônima), cai no RPC público.
  const rpc = injected ?? publicProvider();
  const contract = new EthersContract(address, abi, rpc);
  const filter = contract.filters[eventName]();
  const latest = await rpc.getBlockNumber();
  const LOOKBACK = 27_000; // ~3-4 dias na Sepolia
  const CHUNK = 9_000; // limite seguro de eth_getLogs em RPC público
  const start = Math.max(latest - LOOKBACK, 0);
  const logs: any[] = [];
  for (let from = start; from <= latest; from += CHUNK + 1) {
    const to = Math.min(from + CHUNK, latest);
    try {
      const part = await contract.queryFilter(filter, from, to);
      logs.push(...part);
    } catch {
      /* ignora janela problemática e segue */
    }
  }
  return logs;
}

export async function fetchProposalsFromChain(
  provider?: Provider | null
): Promise<StoredProposal[]> {
  const logs = await scanLogs("ProposalCreated", ADDRESSES.dao, DAO_ABI, provider);
  const out: StoredProposal[] = [];
  for (const log of logs) {
    const a = log.args;
    if (!a) continue;
    // Acesso POSICIONAL: o evento ProposalCreated tem um parâmetro chamado
    // "values" que colide com o método interno do Result na ethers v6. Por isso
    // lemos por índice: 0=proposalId, 2=targets, 3=values, 5=calldatas, 8=description.
    try {
      const proposalId = a[0];
      const targets: string[] = Array.from(a[2]);
      const valuesArr: bigint[] = Array.from(a[3]);
      const calldatas: string[] = Array.from(a[5]);
      const description: string = a[8];
      const { item, vendedor } = decodeItemVendedor(calldatas, description);
      const tsMatch = description.match(/\[(\d+)\]/);
      out.push({
        id: proposalId.toString(),
        item,
        vendedor,
        description,
        targets,
        values: valuesArr.map((v) => v.toString()),
        calldatas,
        txHash: log.transactionHash,
        createdAt: tsMatch ? Number(tsMatch[1]) : 0,
      });
    } catch {
      /* log fora do formato esperado: ignora e segue */
    }
  }
  return out.sort((x, y) => y.createdAt - x.createdAt);
}

// ---- Leilões criados pela DAO ----
export interface LeilaoCriado {
  address: string;
  item: string;
  vendedor: string;
}

export async function fetchLeiloesFromChain(
  provider?: Provider | null
): Promise<LeilaoCriado[]> {
  const logs = await scanLogs("LeilaoAprovadoECriado", ADDRESSES.dao, DAO_ABI, provider);
  const out: LeilaoCriado[] = [];
  for (const log of logs) {
    const a = log.args;
    if (!a) continue;
    out.push({
      address: a.leilaoAddress,
      item: a.item,
      vendedor: a.vendedor,
    });
  }
  return out;
}
