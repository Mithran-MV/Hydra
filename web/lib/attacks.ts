/** Canonical attack history shared between the landing-page LiveAttacks
 *  card and the /evidence page's full receipts table.
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
  /** death tx — Registry.recordDeath emit */
  deathTx: string;
  /** scar tx — Registry.recordScar emit (rule string in the event) */
  scarTx: string;
  /** scar iNFT mint tx — HydraScars.mintScar (v2 contract) */
  inftMintTx: string;
  /** the two born events that follow each death */
  bornTxs: [string, string];
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
];

export const CHAINSCAN_TX = "https://chainscan-galileo.0g.ai/tx/";

export function shortenTx(hash: string): string {
  return hash.slice(0, 10) + "…";
}
