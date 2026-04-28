/** Canonical attack history shared between the landing-page LiveAttacks
 *  card and the /chronicle page's full receipts table.
 *
 *  Append a new entry per attack per `docs/planning/DAILY_ATTACK_CADENCE.md`.
 *  Each entry's tx hashes are immutable on-chain; never edit a row except to
 *  flip the `outcome` field once scar-enforced defense ships and a defended
 *  attack is captured.
 */

export interface Attack {
  num: number;
  utc: string;
  cause: string;
  target: string;
  outcome: "resurrected" | "defended";
  /** death tx — Registry.recordDeath emit. null when the chain write
   *  failed (e.g. nonce collision on the shared deployer wallet); the
   *  consensus + resurrection still completed correctly off-chain. */
  deathTx: string | null;
  /** scar tx — Registry.recordScar emit (rule string in the event) */
  scarTx: string;
  /** scar iNFT mint tx — HydraScars.mintScar (v2 contract) */
  inftMintTx: string;
  /** the two born events that follow each death */
  bornTxs: [string, string];
  /** optional 0G Storage upload tx for the new scar — present when
   *  OG_STORAGE_LIVE=1 and uploadJsonToOG returned a receipt */
  storageTx?: string;
  /** optional note for unusual outcomes (e.g. partial chain settlement) */
  note?: string;
}

export const ATTACKS: Attack[] = [
  {
    num: 1,
    utc: "2026-04-28 11:52",
    cause: "process_killed",
    target: "h2 (univ4_lp)",
    outcome: "resurrected",
    deathTx:
      "0xed1c91804448c8701f9c26aa4e3c55e9485ab566cd87d8370abecfa6a077e59b",
    scarTx:
      "0x857e9f1234abbd35aa146adedc36e9b51fc2edf783ed288b364b4229dfa6099c",
    inftMintTx:
      "0x26d45f5a98e8fe77470a90d0a727617e543a4586723c6e5ff58ee0c82e19d926",
    bornTxs: [
      "0x9350a6fbc33d958cc78a3319c0ffe5b5059fe51a1d4d63e90136940c8489866d",
      "0xd2120eb6cbe7d8a99b7a6ed278d2d30fa554d6112bb11e9e8d90ccf465f00822",
    ],
  },
  {
    num: 2,
    utc: "2026-04-28 12:45",
    cause: "wallet_drained",
    target: "h1 (aave_deposit)",
    outcome: "resurrected",
    deathTx:
      "0x98c068d469c9929ebad399aa8e4d5663b3008a44ed93458edfa6d33ff5b6edf2",
    scarTx:
      "0x808b6ee22dfbcb4f8fd64a56d0ff064ee4f7f134eb1f9df462cc272d0d95ea17",
    inftMintTx:
      "0x995f2c88072ec25b74b7cb940d4553a3145400552a0ee9ccfe9928adb436e94f",
    bornTxs: [
      "0x4fc4eb26a827b3f8e80f3de430548ff4cac9419692f85e530c742ae0646981db",
      "0xb2e8ac840aac23bf3fea787ba906cde64c33ccfbc504591a97ff7f6677bccbff",
    ],
  },
  {
    num: 3,
    utc: "2026-04-28 18:18",
    cause: "api_timeout",
    target: "h3 (payroll)",
    outcome: "resurrected",
    deathTx:
      "0x368cef572f9c5de7f47d41d087e677a4ce27d58bf6ee7e0693e92a1589e3a5ad",
    scarTx:
      "0x629183202db745311262a6421278386475f6dfc42b8a335aa71ab74829cb442d",
    inftMintTx:
      "0x94bea901534439ec6a795036f1311593ce5d6ca71ee4294001376d1673f6b326",
    bornTxs: [
      "0xdfe2d5986be505fd701b2c26a5b83eb8933a99adb17aa91f3879a4ced8c63912",
      "0x002e116de740767a72b3185c769b5c0572230f0c36a0311c423f7e484fdc4fb9",
    ],
  },
  {
    num: 4,
    utc: "2026-04-28 18:40",
    cause: "key_revoked",
    target: "h2 (univ4_lp, revived for soft reset)",
    outcome: "resurrected",
    deathTx: null,
    scarTx:
      "0xa838ef84f03e41fa1732dddc8e62823ea1bec4bbaeb370b431057f26127e27c2",
    inftMintTx:
      "0xd04c5ac218341de3890ee14977f92a5608c4b6617d52a3f9593af0220332bba3",
    bornTxs: [
      "0x54e39c7f217ea299a401e36fe76f5fc2879b62fd79bb05b309a51a3457f9be25",
      "0xdebd0520c28e053ae439f2af9298c2e3dfb6a8eb678fb6a926f1991a76770781",
    ],
    note: "death record raced shared-wallet nonce — consensus + resurrection completed off-chain (see docs/ADVERSARIAL_TESTING.md). Scar uploaded to 0G Storage Indexer (root 0x188f4ff70727d5…, tx 0x8496b1d3…) — first live agent-driven 0G Storage write.",
  },
];

export const CHAINSCAN_TX = "https://chainscan-galileo.0g.ai/tx/";

export function shortenTx(hash: string): string {
  return hash.slice(0, 10) + "…";
}
