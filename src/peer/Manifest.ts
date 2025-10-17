import * as fs from "fs/promises";
import * as crypto from "crypto";
import * as path from "path";
import { createReadStream } from "fs";
import { Manifest } from "@common/types.js";

// Define a standard chunk size, e.g., 256KB.
// In a real app, this might be adjusted based on file size.
const CHUNK_SIZE = 256 * 1024; // 256 KB

/**
 * Creates a .manifest file for a given file.
 * @param filePath The path to the file to be shared.
 * @param trackerUrl The URL of the tracker server.
 * @returns A promise that resolves with the Manifest object.
 */
export async function createManifest(
  filePath: string,
  trackerUrl: string
): Promise<Manifest> {
  const stats = await fs.stat(filePath);
  const fileName = path.basename(filePath);
  const fileSize = stats.size;

  const chunkHashes: string[] = [];
  const stream = createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

  // Read the file chunk by chunk and hash each one
  for await (const chunk of stream) {
    const hash = crypto.createHash("sha256").update(chunk).digest("hex");
    chunkHashes.push(hash);
  }

  // Create a unique hash for the entire file/manifest
  const fileHashPayload = `${fileName}-${fileSize}-${chunkHashes.join("")}`;
  const fileHash = crypto
    .createHash("sha256")
    .update(fileHashPayload)
    .digest("hex");

  const manifest: Manifest = {
    fileName,
    fileSize,
    chunkSize: CHUNK_SIZE,
    chunkHashes,
    trackerUrl,
    fileHash,
  };

  // Write the manifest to a new file
  const manifestPath = `${filePath}.manifest`;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}

/**
 * Parses a .manifest file from a given path.
 * @param manifestPath The path to the .manifest file.
 * @returns A promise that resolves with the Manifest object.
 */
export async function parseManifest(manifestPath: string): Promise<Manifest> {
  const content = await fs.readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(content) as Manifest;
  // Basic validation could be added here
  if (
    !manifest.fileName ||
    !manifest.fileHash ||
    !manifest.chunkHashes ||
    !manifest.trackerUrl
  ) {
    throw new Error("Invalid manifest file format.");
  }
  return manifest;
}
