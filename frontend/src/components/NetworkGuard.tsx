import type { ReactNode } from "react";
import { useWeb3 } from "../context/Web3Context";
import Alert from "./Alert";
import Button from "./Button";

// Garante carteira conectada + rede correta antes de renderizar conteúdo on-chain.
export default function NetworkGuard({ children }: { children: ReactNode }) {
  const {
    hasMetaMask,
    account,
    connect,
    connecting,
    isCorrectNetwork,
    switchToSepolia,
  } = useWeb3();

  if (!hasMetaMask) {
    return (
      <Alert type="error">
        MetaMask não detectada. Instale a extensão em{" "}
        <a href="https://metamask.io" target="_blank" rel="noreferrer">
          metamask.io
        </a>{" "}
        e recarregue a página.
      </Alert>
    );
  }

  if (!account) {
    return (
      <div className="guard">
        <p>Conecte sua carteira para acessar esta área.</p>
        <Button onClick={connect} disabled={connecting}>
          {connecting ? "Conectando…" : "Conectar MetaMask"}
        </Button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="guard">
        <Alert type="warning">
          Você não está na rede Sepolia.
        </Alert>
        <Button onClick={switchToSepolia}>Trocar para Sepolia</Button>
      </div>
    );
  }

  return <>{children}</>;
}
