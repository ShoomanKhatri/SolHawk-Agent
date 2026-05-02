"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletConnectButton() {
  return (
    <div className="wallet-btn-container">
      <WalletMultiButton className="!bg-solana-purple hover:!bg-solana-purple/80 !rounded-xl !h-12 !px-6 !transition-all" />
    </div>
  );
}
