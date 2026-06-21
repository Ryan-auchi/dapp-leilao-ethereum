import { useCallback, useEffect, useState } from "react";
import { Contract, formatEther, parseEther } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { ADDRESSES, LEILAO_ABI } from "../contracts/config";
import NetworkGuard from "../components/NetworkGuard";
import Card from "../components/Card";
import Stat from "../components/Stat";
import Button from "../components/Button";
import Alert from "../components/Alert";

interface LeilaoData {
  item: string;
  maiorLance: string;
  maiorLancador: string;
  encerrado: boolean;
}

const ZERO = "0x0000000000000000000000000000000000000000";

function LeilaoInner() {
  const { provider, account, refreshBalance } = useWeb3();
  const [data, setData] = useState<LeilaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const c = new Contract(ADDRESSES.leilao, LEILAO_ABI, provider);
      const [item, maior, lancador, encerrado] = await Promise.all([
        c.itemLeiloado(),
        c.maiorLance(),
        c.maiorLancador(),
        c.leilaoEncerrado(),
      ]);
      setData({
        item,
        maiorLance: formatEther(maior),
        maiorLancador: lancador,
        encerrado,
      });
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao ler o leilão.");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    load();
  }, [load]);

  async function darLance() {
    setErr(null);
    setOk(null);
    if (!provider) return;
    if (!bid || Number(bid) <= 0) {
      setErr("Informe um valor de lance válido em ETH.");
      return;
    }
    if (data && Number(bid) <= Number(data.maiorLance)) {
      setErr(`O lance precisa ser maior que ${data.maiorLance} ETH.`);
      return;
    }
    setSending(true);
    try {
      const signer = await provider.getSigner();
      const c = new Contract(ADDRESSES.leilao, LEILAO_ABI, signer);
      const tx = await c.darLance({ value: parseEther(bid) });
      setOk("Transação enviada. Aguardando confirmação…");
      await tx.wait();
      setOk("Lance confirmado com sucesso! 🎉");
      setBid("");
      await load();
      await refreshBalance();
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        setErr("Transação rejeitada na MetaMask.");
      } else if (e?.code === "INSUFFICIENT_FUNDS") {
        setErr("Saldo de ETH insuficiente para este lance.");
      } else {
        setErr(e?.reason ?? e?.shortMessage ?? "Falha ao enviar o lance.");
      }
    } finally {
      setSending(false);
    }
  }

  const isLeader =
    account && data && data.maiorLancador.toLowerCase() === account.toLowerCase();

  return (
    <div className="page">
      <h2 className="page-title">Leilão</h2>
      {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}
      {ok && (
        <Alert type="success" onClose={() => setOk(null)}>
          {ok}
        </Alert>
      )}

      {loading ? (
        <Card>Carregando dados do leilão…</Card>
      ) : data ? (
        <div className="leilao-grid">
          <Card title={data.item || "Item do leilão"} className="leilao-main">
            <span
              className={`status ${data.encerrado ? "status-closed" : "status-open"}`}
            >
              {data.encerrado ? "ENCERRADO" : "EM ANDAMENTO"}
            </span>
            <div className="grid-stats">
              <Stat label="Maior lance" value={data.maiorLance} suffix="ETH" />
              <Stat
                label="Maior lançador"
                value={
                  data.maiorLancador === ZERO
                    ? "Nenhum ainda"
                    : `${data.maiorLancador.slice(0, 6)}…${data.maiorLancador.slice(-4)}`
                }
              />
            </div>
            {isLeader && !data.encerrado && (
              <p className="leader-note">Você está vencendo este leilão. 👑</p>
            )}
          </Card>

          <Card title="Dar um lance">
            {data.encerrado ? (
              <p>Este leilão já foi encerrado. Não é possível dar lances.</p>
            ) : (
              <>
                <label className="field-label">Valor em ETH</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder={`> ${data.maiorLance}`}
                  value={bid}
                  onChange={(e) => setBid(e.target.value)}
                  disabled={sending}
                />
                <Button block onClick={darLance} disabled={sending}>
                  {sending ? "Enviando…" : "Enviar lance"}
                </Button>
                <p className="hint">
                  O lance anterior é devolvido automaticamente pelo contrato.
                </p>
              </>
            )}
          </Card>
        </div>
      ) : (
        <Card>Nenhum dado disponível.</Card>
      )}
    </div>
  );
}

export default function Leilao() {
  return (
    <NetworkGuard>
      <LeilaoInner />
    </NetworkGuard>
  );
}
