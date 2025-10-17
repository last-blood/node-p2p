import * as net from "net";
import { createReadStream } from "fs";
import { PEER_SERVER_PORT } from "@peer/cli.js";

const CHUNK_SIZE = 256 * 1024; // Must be the same as in Manifest.ts

/**
 * Starts the TCP server that listens for other peers and serves them file chunks.
 * @param filePath The path to the file being shared.
 */
export function startPeerServer(filePath: string) {
  const server = net.createServer((socket) => {
    console.log(
      "[PeerServer] New peer connected:",
      `${socket.remoteAddress}:${socket.remotePort}`
    );

    socket.on("data", async (data) => {
      try {
        // Our simple protocol: the peer sends a JSON asking for a chunk index.
        const request = JSON.parse(data.toString());
        const chunkIndex = request.chunkIndex;

        if (typeof chunkIndex !== "number") {
          throw new Error("Invalid chunk index request");
        }

        console.log(
          `[PeerServer] Received request for chunk index: ${chunkIndex}`
        );

        // Calculate where the chunk starts and ends in the file
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE - 1, Infinity);

        // Create a stream for only the requested chunk
        const fileStream = createReadStream(filePath, { start, end });

        // Pipe the chunk directly to the requesting peer
        fileStream.pipe(socket);

        fileStream.on("end", () => {
          // In a more robust protocol, we might wait for an ACK
          // before closing, but for simplicity, we close after sending.
          // Note: The socket is kept open by default to allow more requests.
        });

        fileStream.on("error", (err) => {
          console.error("[PeerServer] Error reading file chunk:", err);
          socket.end(); // Close connection on error
        });
      } catch (err) {
        console.error(
          "[PeerServer] Invalid data from peer:",
          (err as Error).message
        );
        socket.end(); // Disconnect peer if they send bad data
      }
    });

    socket.on("end", () => {
      console.log("[PeerServer] Peer disconnected");
    });

    socket.on("error", (err) => {
      console.error("[PeerServer] Socket error:", err.message);
    });
  });

  server.listen(PEER_SERVER_PORT, "0.0.0.0", () => {
    console.log(
      `[PeerServer] Uploader server running on port ${PEER_SERVER_PORT}`
    );
  });

  server.on("error", (err) => {
    console.error("[PeerServer] Server error:", err);
  });
}
