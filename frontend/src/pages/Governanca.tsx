import { useEffect, useState } from "react";
import { Contract, formatUnits, parseUnits } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { ADDRESSES, DAO_ABI, TOKEN_ABI } from "../contracts/config";
import {
  buildLeilaoProposal,
  fetchProposalsFromChain,
  loadProposals,
  saveProposal,
  type StoredProposal,
} from "../contracts/governor";
import NetworkGuard from "../components/NetworkGuard";
import Card from "../components/Card";
import Stat from "../components/Stat";
import Button from "../components/Button";
import Alert from "../components/Alert";
import ProposalCard from "../components/ProposalCard";

const ZERO = "0x0000000000000000000000000000000000000000";

function GovernancaInner() {
  const { provider, account } = useWeb3();
  const [name, setName] = useState("—");
  const [votingDelay, setVotingDelay] = useState("—");
  const [votingPeriod, setVotingPeriod] = useState("—");
  const [quorum, setQuorum] = useState("—");
  const [votes, setVotes] = useState("0");
  const [delegatee, setDelegatee] = useState<string>(ZERO);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Estado do formulário de proposta + lista lida da blockchain.
  const [item, setItem] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [proposals, setProposals] = useState<StoredProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  // Painel de mint (visível só pro dono do token)
  const [tokenOwner, setTokenOwner] = useState<string | null>(null);
  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("");

  // Lê as propostas da blockchain (fonte da verdade) e mescla com qualquer
  // proposta salva localmente — assim todo mundo vê todas as propostas.
  async function carregarPropostas() {
    setLoadingProposals(true);
    try {
      // Usa a MetaMask (sem CORS) quando conectada; senão, RPC público.
      const onchain = await fetchProposalsFromChain(provider);
      const porId = new Map<string, StoredProposal>();
      // local primeiro; on-chain sobrescreve (dado mais confiável).
      for (const p of loadProposals()) porId.set(p.id, p);
      for (const p of onchain) porId.set(p.id, p);
      setProposals(
        [...porId.values()].sort((a, b) => b.createdAt - a.createdAt)
      );
    } catch {
      // Se a leitura on-chain falhar, ao menos mostra o cache local.
      setProposals(loadProposals());
    } finally {
      setLoadingProposals(false);
    }
  }

  async function load() {
    if (!provider || !account) return;
    setLoading(true);
    setErr(null);
    try {
      const dao = new Contract(ADDRESSES.dao, DAO_ABI, provider);
      const token = new Contract(ADDRESSES.token, TOKEN_ABI, provider);
      const bn = await provider.getBlockNumber();
      const [nm, vd, vp, vts, dec, del, tOwner] = await Promise.all([
        dao.name(),
        dao.votingDelay(),
        dao.votingPeriod(),
        token.getVotes(account),
        token.decimals(),
        token.delegates(account),
        token.owner(),
      ]);
      setName(nm);
      setVotingDelay(`${vd} bloco(s)`);
      setVotingPeriod(`${vp} bloco(s)`);
      setVotes(formatUnits(vts, dec));
      setDelegatee(del);
      setTokenOwner(tOwner);

      // Quórum é lido à parte: exige um bloco no passado. Damos margem para
      // evitar erro ERC5805FutureLookup quando o nó RPC está alguns blocos atrás.
      try {
        const q = await dao.quorum(BigInt(Math.max(bn - 10, 0)));
        setQuorum(`${formatUnits(q, dec)} CTK`);
      } catch {
        setQuorum("indisponível");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao ler a DAO.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    carregarPropostas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, account]);

  async function delegarParaMim() {
    setErr(null);
    setOk(null);
    if (!provider || !account) return;
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const token = new Contract(ADDRESSES.token, TOKEN_ABI, signer);
      const tx = await token.delegate(account);
      setOk("Delegação enviada. Aguardando confirmação…");
      await tx.wait();
      setOk("Voto delegado para você mesmo. Agora seu CTK conta como voto.");
      await load();
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        setErr("Transação rejeitada na MetaMask.");
      } else {
        setErr(e?.reason ?? e?.shortMessage ?? "Falha ao delegar.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function criarProposta() {
    setErr(null);
    setOk(null);
    if (!provider || !account) return;
    if (!item.trim()) {
      setErr("Informe o nome do item para leilão.");
      return;
    }
    const dest = vendedor.trim() || account;
    if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      setErr("Endereço do vendedor inválido.");
      return;
    }
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const dao = new Contract(ADDRESSES.dao, DAO_ABI, signer);
      const { targets, values, calldatas } = buildLeilaoProposal(
        item.trim(),
        dest
      );
      // Descrição única evita colisão de proposalId entre propostas iguais.
      const description = `Leiloar "${item.trim()}" - vendedor ${dest} [${Date.now()}]`;

      const tx = await dao.propose(targets, values, calldatas, description);
      setOk("Proposta enviada. Aguardando confirmação…");
      const receipt = await tx.wait();

      // Recupera o proposalId do evento ProposalCreated emitido na transação.
      let proposalId = "";
      for (const log of receipt.logs) {
        try {
          const parsed = dao.interface.parseLog(log);
          if (parsed?.name === "ProposalCreated") {
            proposalId = parsed.args.proposalId.toString();
            break;
          }
        } catch {
          /* log de outro contrato */
        }
      }
      if (!proposalId) throw new Error("Não foi possível obter o ID da proposta.");

      const stored: StoredProposal = {
        id: proposalId,
        item: item.trim(),
        vendedor: dest,
        description,
        targets,
        values: values.map((v) => v.toString()),
        calldatas,
        txHash: tx.hash,
        createdAt: Date.now(),
      };
      saveProposal(stored);
      await carregarPropostas();
      setItem("");
      setVendedor("");
      setOk("Proposta criada on-chain com sucesso! 🎉");
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        setErr("Transação rejeitada na MetaMask.");
      } else {
        setErr(e?.reason ?? e?.shortMessage ?? "Falha ao criar proposta.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function mintCTK() {
    setErr(null);
    setOk(null);
    if (!provider || !account) return;
    const dest = mintTo.trim() || account;
    if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      setErr("Endereço de destino inválido.");
      return;
    }
    if (!mintAmount || Number(mintAmount) <= 0) {
      setErr("Informe a quantidade de CTK a mintar.");
      return;
    }
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const token = new Contract(ADDRESSES.token, TOKEN_ABI, signer);
      const dec = await token.decimals();
      const tx = await token.mint(dest, parseUnits(mintAmount, dec));
      setOk("Mint enviado. Aguardando confirmação…");
      await tx.wait();
      setOk(`${mintAmount} CTK mintados para ${dest.slice(0, 6)}…${dest.slice(-4)}. ✅`);
      setMintTo("");
      setMintAmount("");
      await load();
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        setErr("Transação rejeitada na MetaMask.");
      } else {
        setErr(e?.reason ?? e?.shortMessage ?? "Falha ao mintar.");
      }
    } finally {
      setBusy(false);
    }
  }

  const semDelegacao = delegatee === ZERO;
  const isTokenOwner = tokenOwner !== null && account !== null &&
    tokenOwner.toLowerCase() === account.toLowerCase();

  return (
    <div className="page">
      <h2 className="page-title">Governança DAO</h2>
      {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}
      {ok && (
        <Alert type="success" onClose={() => setOk(null)}>
          {ok}
        </Alert>
      )}

      <div className="grid-stats">
        <Card>
          <Stat label="DAO" value={loading ? "…" : name} />
        </Card>
        <Card>
          <Stat label="Voting delay" value={loading ? "…" : votingDelay} />
        </Card>
        <Card>
          <Stat label="Voting period" value={loading ? "…" : votingPeriod} />
        </Card>
        <Card>
          <Stat label="Quórum atual" value={loading ? "…" : quorum} />
        </Card>
      </div>

      <Card title="Seu poder de voto">
        <Stat label="Votos ativos" value={Number(votes).toFixed(2)} suffix="votos" />
        {semDelegacao ? (
          <>
            <p className="hint">
              Seu CTK ainda não está delegado, por isso não conta como voto.
              Delegue para você mesmo para ativá-lo.
            </p>
            <Button onClick={delegarParaMim} disabled={busy}>
              {busy ? "Processando…" : "Delegar voto para mim"}
            </Button>
          </>
        ) : (
          <p className="hint">
            Voto delegado para{" "}
            {delegatee.toLowerCase() === account?.toLowerCase()
              ? "você mesmo"
              : `${delegatee.slice(0, 6)}…${delegatee.slice(-4)}`}
            .
          </p>
        )}
      </Card>

      <Card title="Criar proposta de leilão">
        <p className="hint" style={{ marginTop: 0 }}>
          A proposta pede à DAO que crie um novo <code>LeilaoSimples</code>.
          Depois de aprovada pela votação, pode ser executada.
        </p>
        <label className="field-label">Nome do item</label>
        <input
          className="input"
          placeholder="Ex.: Notebook Dell"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          disabled={busy}
        />
        <label className="field-label" style={{ marginTop: 12 }}>
          Endereço do vendedor (vazio = você)
        </label>
        <input
          className="input"
          placeholder={account ?? "0x..."}
          value={vendedor}
          onChange={(e) => setVendedor(e.target.value)}
          disabled={busy}
        />
        <Button block onClick={criarProposta} disabled={busy}>
          {busy ? "Enviando…" : "Criar proposta"}
        </Button>
      </Card>

      <div className="section-head">
        <h3 className="section-title">Propostas</h3>
        <button
          className="link-btn"
          onClick={carregarPropostas}
          disabled={loadingProposals}
        >
          {loadingProposals ? "carregando…" : "atualizar lista"}
        </button>
      </div>
      {loadingProposals && proposals.length === 0 ? (
        <Card>Lendo propostas da blockchain…</Card>
      ) : proposals.length === 0 ? (
        <Card>Nenhuma proposta encontrada na DAO ainda.</Card>
      ) : (
        <div className="proposals-grid">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              votingPower={Number(votes)}
              onError={setErr}
              onInfo={setOk}
              onChanged={carregarPropostas}
            />
          ))}
        </div>
      )}

      {isTokenOwner && (
        <Card title="Mintar CTK (somente dono do contrato)">
          <p className="hint" style={{ marginTop: 0 }}>
            Você é o dono do contrato CTK. Distribua tokens para quem precisar votar.
          </p>
          <label className="field-label">Endereço de destino (vazio = você)</label>
          <input
            className="input"
            placeholder={account ?? "0x..."}
            value={mintTo}
            onChange={(e) => setMintTo(e.target.value)}
            disabled={busy}
          />
          <label className="field-label" style={{ marginTop: 12 }}>
            Quantidade de CTK
          </label>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Ex.: 100"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            disabled={busy}
          />
          <Button block onClick={mintCTK} disabled={busy}>
            {busy ? "Processando…" : "Mintar CTK"}
          </Button>
        </Card>
      )}

      <Card title="Como funciona" className="addr-card">
        <ol className="flow-list">
          <li>Detentores de CTK delegam o voto (ativando o poder de voto).</li>
          <li>Cria-se uma proposta de novo leilão (item + vendedor).</li>
          <li>
            Após o <em>voting delay</em>, a proposta fica <strong>Ativa</strong>{" "}
            e a comunidade vota.
          </li>
          <li>
            Atingido o quórum e com maioria a favor, ela fica{" "}
            <strong>Aprovada</strong> e pode ser executada — a DAO publica o novo{" "}
            <code>LeilaoSimples</code> on-chain.
          </li>
        </ol>
      </Card>
    </div>
  );
}

export default function Governanca() {
  return (
    <NetworkGuard>
      <GovernancaInner />
    </NetworkGuard>
  );
}
