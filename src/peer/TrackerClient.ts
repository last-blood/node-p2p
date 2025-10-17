import * as http from "http";
import * as os from "os";
import { Manifest, PeerInfo } from "@common/types.js";
import { PEER_SERVER_PORT } from "@peer/cli.js";

/**
 * A simple utility to get the local IP address of the machine.
 * This is needed so the peer can tell the tracker its address.
 */
function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      for (const net of networkInterface) {
        // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  }
  return "127.0.0.1"; // Fallback
}

/**
 * Registers this peer with the tracker for a given manifest.
 * @param manifest The manifest of the file to share.
 */
export function registerWithTracker(manifest: Manifest): Promise<void> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      fileHash: manifest.fileHash,
      peerInfo: {
        ip: getLocalIpAddress(),
        port: PEER_SERVER_PORT,
      },
    });

    const url = new URL(`${manifest.trackerUrl}/register`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(
          new Error(`Tracker responded with status code ${res.statusCode}`)
        );
      }
    });

    req.on("error", (e) =>
      reject(`Failed to register with tracker: ${e.message}`)
    );
    req.write(postData);
    req.end();
  });
}

/**
 * Fetches the list of peers for a given manifest from the tracker.
 * @param manifest The manifest of the file to download.
 * @returns A promise that resolves with an array of PeerInfo.
 */
export function getPeersFromTracker(manifest: Manifest): Promise<PeerInfo[]> {
  return new Promise((resolve, reject) => {
    const url = `${manifest.trackerUrl}/peers?fileHash=${manifest.fileHash}`;

    http
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(
            new Error(`Tracker responded with status code ${res.statusCode}`)
          );
        }

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (!response.peers) {
              return reject(new Error("Invalid response from tracker"));
            }
            resolve(response.peers as PeerInfo[]);
          } catch (e) {
            reject(new Error("Failed to parse tracker response"));
          }
        });
      })
      .on("error", (e) =>
        reject(`Failed to get peers from tracker: ${e.message}`)
      );
  });
}
