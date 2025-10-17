// This is the main entry point for the user.
// It parses command-line arguments and kicks off the correct process.

import { createManifest, parseManifest } from "@peer/Manifest.js";
import { registerWithTracker } from "@peer/TrackerClient.js";
import { startPeerServer } from "@peer/PeerServer.js";
import { startDownload } from "@peer/PeerClient.js";

// We will define our peer's port here. In a real app,
// this might be configurable.
export const PEER_SERVER_PORT = 9001;

/**
 * Logs a help message for the user.
 */
function showHelp() {
  console.log(`
  Usage: pnpm dev:cli <command> [options]

  Commands:

    share <file-path> <tracker-url>
      Description: Share a file with the network.
      Example:     pnpm dev:cli share ./my-video.mp4 http://localhost:8080

    download <manifest-path> <output-directory>
      Description: Download a file from the network using a .manifest file.
      Example:     pnpm dev:cli download ./my-video.manifest ./downloads
  `);
}

/**
 * Main application logic
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "share": {
      const filePath = args[1];
      const trackerUrl = args[2];

      if (!filePath || !trackerUrl) {
        console.error("Error: Missing file path or tracker URL.\n");
        showHelp();
        process.exit(1);
      }

      try {
        console.log(`[Share] Creating manifest for ${filePath}...`);
        const manifest = await createManifest(filePath, trackerUrl);
        console.log(`[Share] Manifest created: ${manifest.fileName}.manifest`);
        console.log(`[Share] File hash: ${manifest.fileHash}`);

        console.log("[Share] Registering with tracker...");
        await registerWithTracker(manifest);
        console.log("[Share] Registered successfully.");

        // Start the server to listen for incoming peer requests
        startPeerServer(filePath);
        console.log(
          `[Share] Now seeding file. Listening for peers on port ${PEER_SERVER_PORT}...`
        );
        console.log("Press Ctrl+C to stop sharing.");
      } catch (err) {
        console.error("[Share] Error sharing file:", (err as Error).message);
        process.exit(1);
      }
      break;
    }

    case "download": {
      const manifestPath = args[1];
      const outputDir = args[2];

      if (!manifestPath || !outputDir) {
        console.error("Error: Missing manifest file or output directory.\n");
        showHelp();
        process.exit(1);
      }

      try {
        console.log(`[Download] Parsing manifest ${manifestPath}...`);
        const manifest = await parseManifest(manifestPath);

        console.log(`[Download] Starting download for: ${manifest.fileName}`);
        await startDownload(manifest, outputDir);

        console.log(`\n[Download] Success! File saved to ${outputDir}`);
      } catch (err) {
        console.error(
          "[Download] Error downloading file:",
          (err as Error).message
        );
        process.exit(1);
      }
      break;
    }

    default:
      if (command) {
        console.error(`Error: Unknown command "${command}"\n`);
      }
      showHelp();
      process.exit(1);
  }
}

// Run the main function and catch any unhandled errors
main().catch((err) => {
  console.error("An unexpected error occurred:", err);
  process.exit(1);
});
