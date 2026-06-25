import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import { useWeb3 } from "../context/Web3Context";

export default function Landing() {
  const navigate = useNavigate();
  const { account, connect, connecting } = useWeb3();

  return (
    <div className="landing">
      <section className="hero">
        <span className="tag">SEPOLIA · WEB3 · DAO</span>
        <h1>
          Leilões aprovados pela <span className="hl">comunidade</span>.
        </h1>
        <p>
          Uma curadoria descentralizada: detentores do token CTK propõem,
          votam e executam leilões on-chain. Transparência total na blockchain
          Ethereum.
        </p>
        <div className="hero-actions">
          {account ? (
            <Button onClick={() => navigate("/dashboard")}>
              Abrir Dashboard →
            </Button>
          ) : (
            <Button onClick={connect} disabled={connecting}>
              {connecting ? "Conectando…" : "Conectar MetaMask"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate("/leilao")}>
            Ver leilão ativo
          </Button>
        </div>
      </section>

      <section className="features">
        <Card title="01 · Token CTK">
          Token ERC20 com poder de voto (ERC20Votes). Quem detém CTK governa a
          curadoria.
        </Card>
        <Card title="02 · DAO Governor">
          Propostas, votação por quórum e execução automática — padrão
          OpenZeppelin Governor.
        </Card>
        <Card title="03 · Leilão Simples">
          Lances em ETH com devolução automática ao lance anterior. Vence o
          maior lance.
        </Card>
      </section>
    </div>
  );
}
