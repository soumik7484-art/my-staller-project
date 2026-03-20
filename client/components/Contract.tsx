"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createCampaign,
  donate,
  getCampaign,
  getAllCampaigns,
  getDonations,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface Campaign {
  name: string;
  description: string;
  target: string;
  total: string;
  donors: number;
  created: string;
}

interface Donation {
  donor: string;
  amount: string;
}

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#ec4899]/30 focus-within:shadow-[0_0_20px_rgba(236,72,153,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = Math.min((Number(value) / Number(max)) * 100, 100);
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#ec4899] to-[#f472b6] transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// ── Format Helper ────────────────────────────────────────────

function formatXLM(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return (num / 10000000).toFixed(2);
}

function truncate(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Main Component ───────────────────────────────────────────

type Tab = "browse" | "create" | "donate";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Create campaign state
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createTarget, setCreateTarget] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Browse state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Donate state
  const [donateId, setDonateId] = useState("");
  const [donateAmount, setDonateAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAllCampaigns();
      if (result && Array.isArray(result)) {
        setCampaigns(result as Campaign[]);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "browse") {
      loadCampaigns();
    }
  }, [activeTab, loadCampaigns]);

  // Load campaign details when donating
  const handleCampaignSelect = useCallback(async (id: string) => {
    setDonateId(id);
    const campaignId = parseInt(id);
    if (!isNaN(campaignId)) {
      const result = await getCampaign(campaignId);
      if (result) {
        setSelectedCampaign(result as Campaign);
        const donationsResult = await getDonations(campaignId);
        if (donationsResult && Array.isArray(donationsResult)) {
          setDonations(donationsResult as Donation[]);
        }
      }
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!createName.trim() || !createDesc.trim() || !createTarget.trim()) {
      return setError("Fill in all fields");
    }
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      const targetLumens = parseFloat(createTarget) * 10000000;
      await createCampaign(walletAddress, createName.trim(), createDesc.trim(), BigInt(targetLumens));
      setTxStatus("Campaign created on-chain!");
      setCreateName("");
      setCreateDesc("");
      setCreateTarget("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, createName, createDesc, createTarget]);

  const handleDonate = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!donateId.trim() || !donateAmount.trim()) return setError("Fill in all fields");
    setError(null);
    setIsDonating(true);
    setTxStatus("Awaiting signature...");
    try {
      const amountLumens = parseFloat(donateAmount) * 10000000;
      await donate(walletAddress, BigInt(donateId.trim()), BigInt(amountLumens));
      setTxStatus("Donation recorded on-chain!");
      setDonateAmount("");
      await handleCampaignSelect(donateId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsDonating(false);
    }
  }, [walletAddress, donateId, donateAmount, handleCampaignSelect]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "browse", label: "Browse", icon: <SearchIcon />, color: "#ec4899" },
    { key: "create", label: "Create", icon: <PlusIcon />, color: "#34d399" },
    { key: "donate", label: "Donate", icon: <HeartIcon />, color: "#f472b6" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ec4899]/20 to-[#f472b6]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ec4899]">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Charity Donation Tracker</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Browse */}
            {activeTab === "browse" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Active Campaigns</h4>
                  <button
                    onClick={loadCampaigns}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
                  >
                    <RefreshIcon /> Refresh
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <SpinnerIcon />
                    <span className="ml-2 text-sm text-white/40">Loading campaigns...</span>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                    <HeartIcon />
                    <p className="text-sm text-white/40 mt-2">No campaigns yet. Be the first to create one!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {campaigns.map((campaign, idx) => (
                      <div key={idx} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium text-white/90">{campaign.name}</h5>
                            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{campaign.description}</p>
                          </div>
                          <Badge variant="success" className="text-[9px]">#{idx + 1}</Badge>
                        </div>
                        <ProgressBar value={Number(campaign.total)} max={Number(campaign.target)} />
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-white/50">
                            <DollarIcon /> {formatXLM(Number(campaign.total))} / {formatXLM(Number(campaign.target))} XLM
                          </span>
                          <span className="flex items-center gap-1 text-white/50">
                            <UsersIcon /> {campaign.donors} donors
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">New Campaign</h4>
                  <div className="space-y-4">
                    <Input
                      label="Campaign Name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Help Flood Victims"
                    />
                    <Input
                      label="Description"
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      placeholder="Describe your cause..."
                    />
                    <Input
                      label="Target (XLM)"
                      type="number"
                      value={createTarget}
                      onChange={(e) => setCreateTarget(e.target.value)}
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleCreate} disabled={isCreating} shimmerColor="#34d399" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Campaign</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create campaigns
                  </button>
                )}
              </div>
            )}

            {/* Donate */}
            {activeTab === "donate" && (
              <div className="space-y-5">
                <div className="space-y-4">
                  <Input
                    label="Campaign ID"
                    type="number"
                    value={donateId}
                    onChange={(e) => handleCampaignSelect(e.target.value)}
                    placeholder="Enter campaign ID (e.g. 1)"
                  />

                  {selectedCampaign && (
                    <div className="rounded-xl border border-[#ec4899]/20 bg-[#ec4899]/[0.03] p-4 space-y-3">
                      <h4 className="font-medium text-white/90">{selectedCampaign.name}</h4>
                      <p className="text-xs text-white/50">{selectedCampaign.description}</p>
                      <ProgressBar value={Number(selectedCampaign.total)} max={Number(selectedCampaign.target)} />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">{formatXLM(Number(selectedCampaign.total))} / {formatXLM(Number(selectedCampaign.target))} XLM</span>
                        <span className="text-white/50">{selectedCampaign.donors} donors</span>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Amount (XLM)"
                    type="number"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                    placeholder="Enter donation amount"
                  />
                </div>

                {selectedCampaign && donations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Recent Donations</h4>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 max-h-32 overflow-y-auto">
                      {donations.slice(-5).reverse().map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-white/60">{truncate(d.donor)}</span>
                          <span className="text-[#34d399] font-mono">{formatXLM(d.amount)} XLM</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {walletAddress ? (
                  <ShimmerButton onClick={handleDonate} disabled={isDonating || !selectedCampaign} shimmerColor="#f472b6" className="w-full">
                    {isDonating ? <><SpinnerIcon /> Processing...</> : <><HeartIcon /> Donate</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#f472b6]/20 bg-[#f472b6]/[0.03] py-4 text-sm text-[#f472b6]/60 hover:border-[#f472b6]/30 hover:text-[#f472b6]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to donate
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Charity Tracker &middot; Soroban &middot; Permissionless</p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
              <span className="font-mono text-[9px] text-white/15">Anyone can create & donate</span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
