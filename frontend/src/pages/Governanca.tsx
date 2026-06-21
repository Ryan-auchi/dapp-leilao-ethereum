import { useEffect, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { ADDRESSES, DAO_ABI, TOKEN_ABI } from "../contracts/config";
import NetworkGuard from "../components/NetworkGuard";
import Card from "../components/Card";
import Stat from "../components/Stat";
import Button from "../components/Button";
import Alert from "../components/Alert";

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

  async function load() {
    if (!provider || !account) return;
    setLoading(true);
    setErr(null);
    try {
      const dao = new Contract(ADDRESSES.dao, DAO_ABI, provider);
      const token = new Contract(ADDRESSES.token, TOKEN_ABI, provider);
      const bn = await provider.getBlockNumber();
      const [nm, vd, vp, q, vts, dec, del] = await Promise.all([
        dao.name(),
        dao.votingDelay(),
        dao.votingPeriod(),
        dao.quorum(BigInt(Math.max(bn - 1, 0))),
        token.getVotes(account),
        token.decimals(),
        token.delegates(account),
      ]);
      setName(nm);
      setVotingDelay(`${vd} bloco(s)`);
      setVotingPeriod(`${vp} bloco(s)`);
      setQuorum(`${formatUnits(q, dec)} CTK`);
      setVotes(formatUnits(vts, dec));
      setDelegatee(del);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao ler a DAO.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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

  const semDelegacao = delegatee === ZERO;

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

      <Card title="Como funciona" className="addr-card">
        <ol className="flow-list">
          <li>Detentores de CTK delegam o voto (ativando o poder de voto).</li>
          <li>Uma proposta de novo leilão é criada na DAO.</li>
          <li>A comunidade vota durante o período de votação.</li>
          <li>
            Aprovada e atingido o quórum, a execução chama{" "}
            <code>executarDeployLeilao</code> e o leilão nasce on-chain.
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
