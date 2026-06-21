import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { BrowserProvider, formatEther } from "ethers";
import {
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CHAIN_ID_HEX,
  SEPOLIA_PARAMS,
} from "../contracts/config";

interface Web3State {
  provider: BrowserProvider | null;
  account: string | null;
  chainId: bigint | null;
  ethBalance: string;
  isCorrectNetwork: boolean;
  hasMetaMask: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  clearError: () => void;
}

const Web3Context = createContext<Web3State | undefined>(undefined);

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMetaMask =
    typeof window !== "undefined" && Boolean(window.ethereum);
  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  const clearError = useCallback(() => setError(null), []);

  const refreshBalance = useCallback(async () => {
    if (!window.ethereum || !account) return;
    try {
      const p = new BrowserProvider(window.ethereum);
      const bal = await p.getBalance(account);
      setEthBalance(formatEther(bal));
    } catch {
      /* ignore */
    }
  }, [account]);

  const loadState = useCallback(async () => {
    if (!window.ethereum) return;
    const p = new BrowserProvider(window.ethereum);
    setProvider(p);
    const net = await p.getNetwork();
    setChainId(net.chainId);
    const accounts: string[] = await window.ethereum.request({
      method: "eth_accounts",
    });
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      const bal = await p.getBalance(accounts[0]);
      setEthBalance(formatEther(bal));
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask não encontrada. Instale a extensão para continuar.");
      return;
    }
    setConnecting(true);
    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      await loadState();
      setAccount(accounts[0]);
    } catch (err: any) {
      if (err?.code === 4001) {
        setError("Conexão rejeitada pelo usuário.");
      } else {
        setError(err?.message ?? "Falha ao conectar a carteira.");
      }
    } finally {
      setConnecting(false);
    }
  }, [loadState]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    setError(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
    } catch (err: any) {
      // 4902 = rede não adicionada
      if (err?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_PARAMS],
          });
        } catch {
          setError("Não foi possível adicionar a rede Sepolia.");
        }
      } else {
        setError("Não foi possível trocar para a rede Sepolia.");
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setEthBalance("0");
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    loadState();
    const onAccounts = (accounts: string[]) => {
      setAccount(accounts[0] ?? null);
      if (!accounts[0]) setEthBalance("0");
    };
    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccounts);
      window.ethereum?.removeListener("chainChanged", onChain);
    };
  }, [loadState]);

  useEffect(() => {
    refreshBalance();
  }, [account, refreshBalance]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        account,
        chainId,
        ethBalance,
        isCorrectNetwork,
        hasMetaMask,
        connecting,
        error,
        connect,
        disconnect,
        switchToSepolia,
        refreshBalance,
        clearError,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 deve ser usado dentro de Web3Provider");
  return ctx;
}
