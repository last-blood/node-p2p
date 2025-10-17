import * as fs from "fs/promises";
import * as path from "path";
import { Manifest } from "@common/types.js";

/**
 * Manages writing downloaded chunks to the correct
 * position in the output file.
 */
export class FileAssembler {
  private fileHandle: fs.FileHandle;
  private filePath: string;
  private chunkSize: number;
  private totalChunks: number;
  private downloadedChunks: Set<number>;

  private constructor(
    fileHandle: fs.FileHandle,
    filePath: string,
    chunkSize: number,
    totalChunks: number
  ) {
    this.fileHandle = fileHandle;
    this.filePath = filePath;
    this.chunkSize = chunkSize;
    this.totalChunks = totalChunks;
    this.downloadedChunks = new Set();
  }

  /**
   * Creates and initializes a new FileAssembler.
   */
  static async create(
    manifest: Manifest,
    outputDir: string
  ): Promise<FileAssembler> {
    const filePath = path.join(outputDir, manifest.fileName);
    await fs.mkdir(outputDir, { recursive: true });
    const fileHandle = await fs.open(filePath, "w");

    return new FileAssembler(
      fileHandle,
      filePath,
      manifest.chunkSize,
      manifest.chunkHashes.length
    );
  }

  /**
   * Writes a downloaded chunk (buffer) to its correct
   * position in the file.
   */
  async writeChunk(chunkIndex: number, buffer: Buffer): Promise<void> {
    if (this.downloadedChunks.has(chunkIndex)) {
      return;
    }

    const offset = chunkIndex * this.chunkSize;
    await this.fileHandle.write(buffer, 0, buffer.length, offset);
    this.downloadedChunks.add(chunkIndex);
  }

  /**
   * Checks if all chunks have been downloaded.
   */
  isComplete(): boolean {
    return this.downloadedChunks.size === this.totalChunks;
  }

  /**
   * Closes the file handle.
   */
  async close(): Promise<void> {
    await this.fileHandle.close();
  }
}
