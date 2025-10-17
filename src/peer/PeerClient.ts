import * as net from "net";
import * as crypto from "crypto";
import { Manifest, PeerInfo } from "@common/types.js";
import { getPeersFromTracker } from "@peer/TrackerClient.js";
import { FileAssembler } from "@peer/FileAssembler.js";

// Max number of peers to download from at the same time
const MAX_CONCURRENT_DOWNLOADS = 5;

/**
 * Verifies the integrity of a downloaded chunk.
 */
function verifyChunk(buffer: Buffer, expectedHash: string): boolean {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return hash === expectedHash;
}

/**
 * Requests a single chunk from a single peer.
 */
function requestChunk(peer: PeerInfo, chunkIndex: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(peer.port, peer.ip, () => {
      const request = JSON.stringify({ chunkIndex });
      socket.write(request);
    });

    const chunks: Buffer[] = [];
    socket.on("data", (chunk) => {
      chunks.push(chunk);
    });

    socket.on("end", () => {
      const fullChunk = Buffer.concat(chunks);
      resolve(fullChunk);
    });

    socket.on("error", (err) => {
      reject(
        new Error(
          `Socket error for chunk ${chunkIndex} from peer ${peer.ip}: ${err.message}`
        )
      );
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error(`Timeout for chunk ${chunkIndex} from peer ${peer.ip}`));
    });
  });
}

/**
 * A simple console progress bar utility.
 */
function updateProgressBar(progress: number) {
  const barLength = 40;
  const filledLength = Math.round(barLength * (progress / 100));
  const emptyLength = barLength - filledLength;

  process.stdout.write(
    `[${"=".repeat(filledLength)}${" ".repeat(emptyLength)}] ${progress.toFixed(
      2
    )}%\r`
  );
}

/**
 * Orchestrates the entire download process.
 */
export async function startDownload(manifest: Manifest, outputDir: string) {
  console.log("[Download] Fetching peer list from tracker...");
  const peers = await getPeersFromTracker(manifest);

  if (peers.length === 0) {
    throw new Error("No peers found for this file. Cannot download.");
  }

  console.log(`[Download] Found ${peers.length} peers. Starting download...`);

  const assembler = await FileAssembler.create(manifest, outputDir);
  const totalChunks = manifest.chunkHashes.length;
  const neededChunks = Array.from({ length: totalChunks }, (_, i) => i);
  let downloadedCount = 0;

  const worker = async () => {
    while (neededChunks.length > 0) {
      const chunkIndex = neededChunks.pop();
      if (chunkIndex === undefined) {
        return;
      }

      const peer = peers[chunkIndex % peers.length];

      try {
        const buffer = await requestChunk(peer, chunkIndex);

        if (!verifyChunk(buffer, manifest.chunkHashes[chunkIndex])) {
          console.warn(
            `\n[Download] Chunk ${chunkIndex} failed verification. Retrying...`
          );
          neededChunks.push(chunkIndex);
          continue;
        }

        await assembler.writeChunk(chunkIndex, buffer);

        downloadedCount++;
        updateProgressBar((downloadedCount / totalChunks) * 100);
      } catch (err) {
        neededChunks.push(chunkIndex);
      }
    }
  };

  const workerPromises = [];
  const numWorkers = Math.min(MAX_CONCURRENT_DOWNLOADS, peers.length);
  for (let i = 0; i < numWorkers; i++) {
    workerPromises.push(worker());
  }

  await Promise.all(workerPromises);
  await assembler.close();

  if (downloadedCount !== totalChunks) {
    throw new Error("Download incomplete. Some chunks failed to download.");
  }
}
