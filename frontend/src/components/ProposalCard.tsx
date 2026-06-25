import { useCallback, useEffect, useState } from "react";
import { Contract, formatUnits, id as keccakId } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { ADDRESSES, DAO_ABI } from "../contracts/config";
import {
  PROPOSAL_STATES,
  stateClass,
  VOTE_SUPPORT,
  type StoredProposal,
} from "../contracts/governor";
import Card from "./Card";
import Button from "./Button";

interface Props {
  proposal: StoredProposal;
  votingPower: number;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
  onChanged?: () => void;
}

export default function ProposalCard({
  proposal,
  votingPower,
  onError,
  onInfo,
  onChanged,
}: Props) {
  const { provider, account } = useWeb3();
  const [state, setState] = useState<number | null>(null);
  const [votes, setVotes] = useState({ a_favor: "0", contra: "0", abst: "0" });
  const [hasVoted, setHasVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!provider || !account) return;
    try {
      const dao = new Contract(ADDRESSES.dao, DAO_ABI, provider);
      const [st, pv, voted] = await Promise.all([
        dao.state(proposal.id),
        dao.proposalVotes(proposal.id),
        dao.hasVoted(proposal.id, account),
      ]);
      setState(Number(st));
      setVotes({
        contra: formatUnits(pv[0], 18),
        a_favor: formatUnits(pv[1], 18),
        abst: formatUnits(pv[2], 18),
      });
      setHasVoted(voted);
    } catch (e: any) {
      onError(e?.shortMessage ?? "Falha ao ler estado da proposta.");
    }
  }, [provider, account, proposal.id, onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function votar(support: number) {
    if (!provider) return;
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const dao = new Contract(ADDRESSES.dao, DAO_ABI, signer);
      const tx = await dao.castVote(proposal.id, support);
      onInfo("Voto enviado. Aguardando confirmação…");
      await tx.wait();
      onInfo("Voto confirmado! ✅");
      await refresh();
      onChanged?.();
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        onError("Voto rejeitado na MetaMask.");
      } else {
        onError(e?.reason ?? e?.shortMessage ?? "Falha ao votar.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function executar() {
    if (!provider) return;
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const dao = new Contract(ADDRESSES.dao, DAO_ABI, signer);
      const tx = await dao.execute(
        proposal.targets,
        proposal.values.map((v) => BigInt(v)),
        proposal.calldatas,
        keccakId(proposal.description)
      );
      onInfo("Execução enviada. Aguardando confirmação…");
      await tx.wait();
      onInfo("Proposta executada! Novo leilão criado on-chain. 🎉");
      await refresh();
      onChanged?.();
    } catch (e: any) {
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
        onError("Execução rejeitada na MetaMask.");
      } else {
        onError(e?.reason ?? e?.shortMessage ?? "Falha ao executar.");
      }
    } finally {
      setBusy(false);
    }
  }

  const isActive = state === 1;
  const isSucceeded = state === 4;

  return (
    <Card className="proposal-card">
      <div className="proposal-head">
        <strong>{proposal.item}</strong>
        <span className={`status ${state !== null ? stateClass(state) : ""}`}>
          {state !== null ? PROPOSAL_STATES[state] : "…"}
        </span>
      </div>

      <p className="hint">
        Vendedor: {proposal.vendedor.slice(0, 6)}…{proposal.vendedor.slice(-4)}
      </p>

      <div className="vote-counts">
        <span>👍 A favor: {Number(votes.a_favor).toFixed(0)}</span>
        <span>👎 Contra: {Number(votes.contra).toFixed(0)}</span>
        <span>🤚 Abstenção: {Number(votes.abst).toFixed(0)}</span>
      </div>

      {isActive && !hasVoted && votingPower > 0 && (
        <div className="vote-actions">
          <Button onClick={() => votar(VOTE_SUPPORT.A_FAVOR)} disabled={busy}>
            A favor
          </Button>
          <Button
            variant="ghost"
            onClick={() => votar(VOTE_SUPPORT.CONTRA)}
            disabled={busy}
          >
            Contra
          </Button>
          <Button
            variant="dark"
            onClick={() => votar(VOTE_SUPPORT.ABSTENCAO)}
            disabled={busy}
          >
            Abster
          </Button>
        </div>
      )}

      {isActive && !hasVoted && votingPower <= 0 && (
        <p className="hint vote-warning">
          ⚠️ Você não tem poder de voto. É preciso ter CTK e delegá-lo antes de
          votar (veja o card "Seu poder de voto" acima).
        </p>
      )}

      {isActive && hasVoted && (
        <p className="hint">Você já votou nesta proposta. ✅</p>
      )}

      {isSucceeded && (
        <Button block onClick={executar} disabled={busy}>
          {busy ? "Executando…" : "Executar (criar leilão)"}
        </Button>
      )}

      <div className="proposal-foot">
        <a
          href={`https://sepolia.etherscan.io/tx/${proposal.txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          ver transação
        </a>
        <button className="link-btn" onClick={refresh}>
          atualizar estado
        </button>
      </div>
    </Card>
  );
}
