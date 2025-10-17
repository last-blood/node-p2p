/**
 * Defines the information for a peer (a user)
 * This is what the tracker will store and share.
 */
export interface PeerInfo {
  ip: string;
  port: number;
}

/**
 * Defines the structure of the .manifest file.
 * This is the "map" to the file, telling peers
 * what the file is, how it's chunked, and where
 * to find the tracker.
 */
export interface Manifest {
  fileName: string;
  fileSize: number;
  chunkSize: number;
  // An array of SHA-256 hashes for each chunk
  chunkHashes: string[];
  trackerUrl: string;
  // A unique hash identifying this file/manifest
  fileHash: string;
}
