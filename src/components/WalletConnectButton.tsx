"use client";

import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-12 w-40 bg-white/5 rounded-xl animate-pulse" />;
  }

  return (
    <div className="wallet-btn-container">
      <WalletMultiButton className="!bg-solana-purple hover:!bg-solana-purple/80 !rounded-xl !h-12 !px-6 !transition-all" />
    </div>
  );
}
