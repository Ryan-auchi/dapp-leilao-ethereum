import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Alert from "./components/Alert";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Leilao from "./pages/Leilao";
import Governanca from "./pages/Governanca";
import { useWeb3 } from "./context/Web3Context";

export default function App() {
  const { error, clearError } = useWeb3();
  return (
    <div className="app">
      <Navbar />
      {error && (
        <div className="global-alert">
          <Alert onClose={clearError}>{error}</Alert>
        </div>
      )}
      <main className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leilao" element={<Leilao />} />
          <Route path="/governanca" element={<Governanca />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
      <footer className="footer">
        Curadoria DAO · Sepolia Testnet · TEP — Trabalho 04
      </footer>
    </div>
  );
}
