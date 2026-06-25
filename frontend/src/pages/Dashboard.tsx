import { useEffect, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { ADDRESSES, TOKEN_ABI } from "../contracts/config";
import NetworkGuard from "../components/NetworkGuard";
import Card from "../components/Card";
import Stat from "../components/Stat";
import Alert from "../components/Alert";

function DashboardInner() {
  const { provider, account, ethBalance } = useWeb3();
  const [ctk, setCtk] = useState("0");
  const [votes, setVotes] = useState("0");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!provider || !account) return;
      setLoading(true);
      setErr(null);
      try {
        const token = new Contract(ADDRESSES.token, TOKEN_ABI, provider);
        const [bal, vts, dec] = await Promise.all([
          token.balanceOf(account),
          token.getVotes(account),
          token.decimals(),
        ]);
        if (!active) return;
        setCtk(formatUnits(bal, dec));
        setVotes(formatUnits(vts, dec));
      } catch (e: any) {
        if (active) setErr(e?.message ?? "Falha ao ler dados do token.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [provider, account]);

  return (
    <div className="page">
      <h2 className="page-title">Dashboard</h2>
      {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}

      <div className="grid-stats">
        <Card>
          <Stat label="Carteira" value={account ?? "—"} />
        </Card>
        <Card>
          <Stat
            label="Saldo ETH"
            value={Number(ethBalance).toFixed(4)}
            suffix="ETH"
          />
        </Card>
        <Card>
          <Stat
            label="Saldo CTK"
            value={loading ? "…" : Number(ctk).toFixed(2)}
            suffix="CTK"
          />
        </Card>
        <Card>
          <Stat
            label="Poder de voto"
            value={loading ? "…" : Number(votes).toFixed(2)}
            suffix="votos"
          />
        </Card>
      </div>

      <Card title="Contratos (Sepolia)" className="addr-card">
        <ul className="addr-list">
          <li>
            <strong>LeilaoSimples</strong>
            <a
              href={`https://sepolia.etherscan.io/address/${ADDRESSES.leilao}`}
              target="_blank"
              rel="noreferrer"
            >
              {ADDRESSES.leilao}
            </a>
          </li>
          <li>
            <strong>CuradoriaToken</strong>
            <a
              href={`https://sepolia.etherscan.io/address/${ADDRESSES.token}`}
              target="_blank"
              rel="noreferrer"
            >
              {ADDRESSES.token}
            </a>
          </li>
          <li>
            <strong>CuradoriaDAO</strong>
            <a
              href={`https://sepolia.etherscan.io/address/${ADDRESSES.dao}`}
              target="_blank"
              rel="noreferrer"
            >
              {ADDRESSES.dao}
            </a>
          </li>
        </ul>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <NetworkGuard>
      <DashboardInner />
    </NetworkGuard>
  );
}
