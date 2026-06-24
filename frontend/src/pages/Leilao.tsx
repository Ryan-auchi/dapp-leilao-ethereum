import { useCallback, useEffect, useState } from "react";
import { Contract, formatEther, parseEther } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { ADDRESSES, LEILAO_ABI } from "../contracts/config";
import { fetchLeiloesFromChain } from "../contracts/governor";
import NetworkGuard from "../components/NetworkGuard";
import Card from "../components/Card";
import Stat from "../components/Stat";
import Button from "../components/Button";
import Alert from "../components/Alert";

const ZERO = "0x0000000000000000000000000000000000000000";

// Um leilão da lista: o original (T02) ou um criado pela DAO (T03/T04).
interface LeilaoRef {
  address: string;
  origem: "T02" | "DAO";
}

interface LeilaoData {
  item: string;
  maiorLance: string;
  maiorLancador: string;
  encerrado: boolean;
}

// Card de um único leilão: lê os dados on-chain e permite dar lance.
function LeilaoItem({
  leilao,
  onError,
  onInfo,
}: {
  leilao: LeilaoRef;
  onError: (m: string) => void;
  onInfo: (m: string) => void;
}) {
  const { provider, account, refreshBalance } = useWeb3();
  const [data, setData] = useState<LeilaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const c = new Contract(leilao.address, LEILAO_ABI, provider);
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
      onError(e?.shortMessage ?? "Falha ao ler o leilão.");
    } finally {
      setLoading(false);
    }
  }, [provider, leilao.address, onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function darLance() {
    if (!provider) return;
    if (!bid || Number(bid) <= 0) {
      onError("Informe um valor de lance válido em ETH.");
      return;
    }
    if (data && Number(bid) <= Number(data.maiorLance)) {
      onError(`O lance precisa ser maior que ${data.maiorLance} ETH.`);
      return;
    }
    setSending(true);
    try {
      const signer = await provider.getSigner();
      const c = new Contract(leilao.address, LEILAO_ABI, signer);
      const tx = await c.darLance({ value: parseEther(bid) });
      onInfo("Transação enviada. Aguardando confirmação…");
      await tx.wait();
      onInfo("Lance confirmado com sucesso! 🎉");
      setBid("");
      await load();
      await refreshBalance();
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        onError("Transação rejeitada na MetaMask.");
      } else if (e?.code === "INSUFFICIENT_FUNDS") {
        onError("Saldo de ETH insuficiente para este lance.");
      } else {
        onError(e?.reason ?? e?.shortMessage ?? "Falha ao enviar o lance.");
      }
    } finally {
      setSending(false);
    }
  }

  const isLeader =
    account &&
    data &&
    data.maiorLancador.toLowerCase() === account.toLowerCase();

  return (
    <Card className="leilao-item">
      <div className="proposal-head">
        <strong>{loading ? "Carregando…" : data?.item || "Item do leilão"}</strong>
        <span className="origem-badge">
          {leilao.origem === "T02" ? "Leilão inicial" : "Criado pela DAO"}
        </span>
      </div>

      {data && (
        <>
          <span
            className={`status ${
              data.encerrado ? "status-closed" : "status-open"
            }`}
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
                  : `${data.maiorLancador.slice(0, 6)}…${data.maiorLancador.slice(
                      -4
                    )}`
              }
            />
          </div>

          {isLeader && !data.encerrado && (
            <p className="leader-note">Você está vencendo este leilão. 👑</p>
          )}

          {data.encerrado ? (
            <p className="hint">
              Este leilão já foi encerrado. Não é possível dar lances.
            </p>
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
        </>
      )}

      <div className="proposal-foot">
        <a
          href={`https://sepolia.etherscan.io/address/${leilao.address}`}
          target="_blank"
          rel="noreferrer"
        >
          ver contrato
        </a>
        <button className="link-btn" onClick={load} disabled={loading}>
          atualizar
        </button>
      </div>
    </Card>
  );
}

function LeilaoInner() {
  const { provider } = useWeb3();
  const [leiloes, setLeiloes] = useState<LeilaoRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    // O leilão original (T02) está sempre na lista.
    const lista: LeilaoRef[] = [{ address: ADDRESSES.leilao, origem: "T02" }];
    try {
      const criados = await fetchLeiloesFromChain(provider);
      for (const c of criados) {
        // Evita duplicar caso algum endereço se repita.
        if (!lista.some((l) => l.address.toLowerCase() === c.address.toLowerCase())) {
          lista.push({ address: c.address, origem: "DAO" });
        }
      }
    } catch {
      /* se a busca on-chain falhar, mostra ao menos o leilão original */
    }
    setLeiloes(lista);
    setLoading(false);
  }, [provider]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="page">
      <div className="section-head">
        <h2 className="page-title">Leilões</h2>
        <button className="link-btn" onClick={carregar} disabled={loading}>
          {loading ? "carregando…" : "atualizar lista"}
        </button>
      </div>

      {err && <Alert onClose={() => setErr(null)}>{err}</Alert>}
      {ok && (
        <Alert type="success" onClose={() => setOk(null)}>
          {ok}
        </Alert>
      )}

      <p className="hint" style={{ marginTop: 0 }}>
        Lista o leilão inicial e todos os leilões publicados pela DAO quando uma
        proposta é aprovada e executada.
      </p>

      {loading && leiloes.length <= 1 ? (
        <Card>Lendo leilões da blockchain…</Card>
      ) : (
        <div className="proposals-grid">
          {leiloes.map((l) => (
            <LeilaoItem
              key={l.address}
              leilao={l}
              onError={setErr}
              onInfo={setOk}
            />
          ))}
        </div>
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
