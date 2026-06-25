import { NavLink } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import Button from "./Button";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Navbar() {
  const {
    account,
    connect,
    disconnect,
    connecting,
    isCorrectNetwork,
    switchToSepolia,
  } = useWeb3();

  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        CURADORIA<span>DAO</span>
      </NavLink>

      <nav className="nav-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/leilao">Leilão</NavLink>
        <NavLink to="/governanca">Governança</NavLink>
      </nav>

      <div className="nav-actions">
        {account && !isCorrectNetwork && (
          <button className="net-badge net-wrong" onClick={switchToSepolia}>
            Rede errada — trocar
          </button>
        )}
        {account && isCorrectNetwork && (
          <span className="net-badge net-ok">Sepolia</span>
        )}
        {account ? (
          <Button variant="dark" onClick={disconnect}>
            {short(account)}
          </Button>
        ) : (
          <Button onClick={connect} disabled={connecting}>
            {connecting ? "Conectando…" : "Conectar MetaMask"}
          </Button>
        )}
      </div>
    </header>
  );
}
