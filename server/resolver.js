import "dotenv/config";
import express from "express";
import {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, SystemProgram, clusterApiUrl
} from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import bs58 from "bs58";

// ── CONFIG ────────────────────────────────────────────────────
const PROGRAM_ID      = new PublicKey(process.env.PROGRAM_ID);
const PLATFORM_AUTH   = Keypair.fromSecretKey(bs58.decode(process.env.PLATFORM_AUTHORITY_SECRET));
const PLATFORM_WALLET = new PublicKey(process.env.PLATFORM_WALLET);
const NETWORK         = process.env.NETWORK || "devnet";
const MATCH_SEED      = Buffer.from("match");
const PORT            = process.env.PORT || 3001;

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=6b56ae36-a263-4599-a807-43a5289701dc", "confirmed");
const supabase   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log(`\n⚔️  Clawd Arena Resolver`);
console.log(`   Network:   ${NETWORK}`);
console.log(`   Program:   ${PROGRAM_ID.toString()}`);
console.log(`   Authority: ${PLATFORM_AUTH.publicKey.toString()}\n`);

// ── DEDUP GUARD ───────────────────────────────────────────────
const processing = new Set();

// ── PDA ───────────────────────────────────────────────────────
function getMatchPDA(matchId) {
  const seedId = matchId.replace(/-/g, "").slice(0, 16);
  const [pda] = PublicKey.findProgramAddressSync(
    [MATCH_SEED, Buffer.from(seedId)],
    PROGRAM_ID
  );
  return pda;
}

// ── ANCHOR DISCRIMINATORS ─────────────────────────────────────
const RESOLVE_DISCRIMINATOR = Buffer.from([73, 0, 15, 197, 178, 47, 21, 193]);
const REFUND_DISCRIMINATOR  = Buffer.from([70, 82, 201, 64, 138, 28, 129, 252]);

function encodeString(str) {
  const bytes = Buffer.from(str, "utf8");
  const buf   = Buffer.alloc(4 + bytes.length);
  buf.writeUInt32LE(bytes.length, 0);
  bytes.copy(buf, 4);
  return buf;
}

// ── RESOLVE ───────────────────────────────────────────────────
async function resolveOnChain(matchId, winnerWallet, player1Wallet) {
  const matchPDA  = getMatchPDA(matchId);
  const winnerKey = new PublicKey(winnerWallet);

  console.log(`[RESOLVE] Match: ${matchId}`);
  console.log(`[RESOLVE] PDA:   ${matchPDA.toString()}`);
  console.log(`[RESOLVE] Winner: ${winnerWallet}`);

  const pdaInfo = await connection.getAccountInfo(matchPDA);
  if (!pdaInfo) throw new Error(`PDA not found for match ${matchId}`);
  console.log(`[RESOLVE] Balance: ${pdaInfo.lamports} lamports`);

  const data = Buffer.concat([RESOLVE_DISCRIMINATOR, encodeString(matchId)]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
  { pubkey: matchPDA,                                isSigner: false, isWritable: true  },
  { pubkey: PLATFORM_AUTH.publicKey,                 isSigner: true,  isWritable: false },
  { pubkey: winnerKey,                               isSigner: false, isWritable: true  },
  { pubkey: PLATFORM_WALLET,                         isSigner: false, isWritable: true  },
  { pubkey: new PublicKey(player1Wallet),            isSigner: false, isWritable: true  },
  { pubkey: SystemProgram.programId,                 isSigner: false, isWritable: false },
],
    data,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: PLATFORM_AUTH.publicKey });
  tx.add(ix);
  tx.sign(PLATFORM_AUTH);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  console.log(`[RESOLVE] ✅ TX: ${sig}`);
  return sig;
}

// ── REFUND ────────────────────────────────────────────────────
async function refundOnChain(matchId, player1Wallet, player2Wallet) {
  const matchPDA = getMatchPDA(matchId);
  const p1       = new PublicKey(player1Wallet);
  const p2       = new PublicKey(player2Wallet || player1Wallet);

  const data = Buffer.concat([REFUND_DISCRIMINATOR, encodeString(matchId)]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: matchPDA,                isSigner: false, isWritable: true  },
      { pubkey: PLATFORM_AUTH.publicKey, isSigner: true,  isWritable: false },
      { pubkey: p1,                      isSigner: false, isWritable: true  },
      { pubkey: p2,                      isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: PLATFORM_AUTH.publicKey });
  tx.add(ix);
  tx.sign(PLATFORM_AUTH);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  console.log(`[REFUND] ✅ TX: ${sig}`);
  return sig;
}

// ── SUPABASE REALTIME ─────────────────────────────────────────
function startListener() {
  supabase.channel("resolver-watch")
    .on("postgres_changes", {
      event:  "UPDATE",
      schema: "public",
      table:  "matches",
      filter: "status=eq.fighting"
    }, async (payload) => {
      const match = payload.new;
      if (!match.battle_result || !match.winner_wallet) return;
      if (match.chain_resolved) return;
      if (processing.has(match.id)) return;
      processing.add(match.id);

      console.log(`[TRIGGER] Match ${match.id} ready to resolve`);

      try {
        const { data: claimed } = await supabase.from("matches")
          .update({ chain_resolved: true })
          .eq("id", match.id)
          .eq("chain_resolved", false)
          .select().single();

        if (!claimed) {
          console.log(`[SKIP] Match ${match.id} already claimed`);
          return;
        }

        const pdaId = match.pda_match_id || match.id;
        const txSig = await resolveOnChain(pdaId, match.winner_wallet, match.player1_wallet);
        await supabase.from("matches").update({
          resolve_tx: txSig,
          status: "done"
        }).eq("id", match.id);
        console.log(`[DONE] ✅ Match ${match.id} paid out!`);
      } catch (err) {
        console.error(`[ERROR] ${err.message || JSON.stringify(err)}`);
        await supabase.from("matches").update({
          status:    "resolve_failed",
          error_msg: err.message
        }).eq("id", match.id);
      } finally {
        processing.delete(match.id);
      }
    })
    .subscribe((status) => {
      console.log(`👂 Supabase realtime: ${status}`);
    });
}

// ── EXPRESS ───────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/health", (_, res) => res.json({
  status:    "ok",
  network:   NETWORK,
  authority: PLATFORM_AUTH.publicKey.toString()
}));

app.post("/resolve", async (req, res) => {
  const { matchId, winnerWallet, player1Wallet, secret } = req.body;
  if (secret !== process.env.INTERNAL_SECRET) return res.status(401).json({ error: "Unauthorized" });
  try {
    const tx = await resolveOnChain(matchId, winnerWallet, player1Wallet);
    await supabase.from("matches").update({ chain_resolved: true, resolve_tx: tx, status: "done" }).eq("id", matchId);
    res.json({ success: true, tx });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/refund", async (req, res) => {
  const { matchId, player1Wallet, player2Wallet, secret } = req.body;
  if (secret !== process.env.INTERNAL_SECRET) return res.status(401).json({ error: "Unauthorized" });
  try {
    const tx = await refundOnChain(matchId, player1Wallet, player2Wallet);
    await supabase.from("matches").update({ status: "refunded", resolve_tx: tx }).eq("id", matchId);
    res.json({ success: true, tx });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.post("/battle", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.post("/cancel", async (req, res) => {
  const { wallet, secret } = req.body;
  if (secret !== process.env.INTERNAL_SECRET) return res.status(401).json({ error: "Unauthorized" });
  try {
    // Get their queue entry to find the PDA
    const { data: entry } = await supabase.from("queue").select("*").eq("wallet", wallet).single();
    if (!entry) return res.status(404).json({ error: "Not in queue" });

    // Refund on-chain (P2 hasn't joined so only P1 gets refund)
    await refundOnChain(entry.pda_match_id, wallet, wallet);

    // Remove from queue
    await supabase.from("queue").delete().eq("wallet", wallet);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startListener();
});