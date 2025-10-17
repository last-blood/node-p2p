import * as http from "http";
import * as url from "url";
import { PeerInfo } from "@common/types.js";

// This is our in-memory "database".
// The key is the fileHash (from the manifest).
// The value is a Set of peers sharing that file.
// Using a Set automatically handles duplicate registrations.
const peerRegistry = new Map<string, Set<PeerInfo>>();

const TRACKER_PORT = 8080;

/**
 * Helper function to send a JSON response.
 */
function sendJsonResponse(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown
) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * Helper function to parse the body of a POST request.
 */
function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return sendJsonResponse(res, 400, { error: "No URL provided" });
  }

  const parsedUrl = new url.URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // Endpoint for a peer to register as a seeder/downloader
    if (pathname === "/register" && method === "POST") {
      const body = (await parseJsonBody(req)) as {
        fileHash: string;
        peerInfo: PeerInfo;
      };

      if (!body.fileHash || !body.peerInfo) {
        return sendJsonResponse(res, 400, { error: "Invalid request body" });
      }

      // Get the set for this file, or create it if it doesn't exist
      if (!peerRegistry.has(body.fileHash)) {
        peerRegistry.set(body.fileHash, new Set());
      }

      const peerSet = peerRegistry.get(body.fileHash)!;
      // Add the peer. We stringify to use the Set's uniqueness check.
      // A real implementation might want a more robust peer object.
      peerSet.add(body.peerInfo);

      console.log(
        `[Tracker] Registered peer for ${body.fileHash}:`,
        body.peerInfo
      );
      return sendJsonResponse(res, 200, {
        message: "Peer registered successfully",
      });
    }

    // Endpoint for a peer to get the list of other peers
    if (pathname === "/peers" && method === "GET") {
      const fileHash = parsedUrl.searchParams.get("fileHash");
      if (!fileHash) {
        return sendJsonResponse(res, 400, { error: "fileHash is required" });
      }

      const peerSet = peerRegistry.get(fileHash);
      if (!peerSet) {
        console.log(`[Tracker] No peers found for ${fileHash}`);
        return sendJsonResponse(res, 404, {
          error: "No peers found for this file",
        });
      }

      // Convert the Set to an array for the JSON response
      const peers = Array.from(peerSet);
      console.log(`[Tracker] Sending ${peers.length} peers for ${fileHash}`);
      return sendJsonResponse(res, 200, { peers });
    }

    // Fallback for 404
    sendJsonResponse(res, 404, { error: "Not Found" });
  } catch (error) {
    console.error("[Tracker] Internal server error:", error);
    sendJsonResponse(res, 500, { error: "Internal server error" });
  }
});

// Start the tracker server
server.listen(TRACKER_PORT, () => {
  console.log(`[Tracker] Server listening on http://localhost:${TRACKER_PORT}`);
});
