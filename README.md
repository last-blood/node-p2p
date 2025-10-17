# P2P File Sharing App

A lightweight peer-to-peer (P2P) file sharing system built using Node.js and TypeScript. This app lets users share and download files directly from each other without relying on a centralized file server. It operates through two main components — a tracker and peers — that coordinate to enable seamless file exchange.

---

## Overview: How It Works

Your app is designed around the principle of separating the phone book (tracker) from the conversation (file transfer).

### 1. The Tracker (Phone Book)
- File: tracker.ts
- Purpose: Acts as a simple matchmaker between peers.
- It does not store or transfer files.
- Tracks which peers are sharing which files.

When a peer starts sharing, it tells the tracker:
“I'm online at this IP and port, and I'm sharing this file.”

When a peer wants to download, it asks:
“Who has file X?”

The tracker then provides a list of available peers for that file.

---

### 2. The Peer (User App)
- File: cli.ts
- Each peer acts as both:
  - Client (Leecher): Downloads chunks of files from other peers.
  - Server (Seeder): Shares chunks of its files with others.

When sharing:
- The peer registers the file with the tracker.
- It opens a listening port (default: 9001) for download requests.

When downloading:
- The peer contacts the tracker to find active seeders.
- It connects directly to them to fetch the file in chunks.

Note: The tracker never handles file data. Transfers occur peer-to-peer between users.

---

## Step-by-Step Usage Guide

Let’s walk through a real-world example where Alice shares a video with Bob.

---

### Step 1: Start the Tracker (Required First)
Before anyone can share or download, the tracker must be running.

Command:
pnpm dev:tracker

Expected Output:
[Tracker] Server listening on http://localhost:8080

Keep this terminal open — the tracker must stay online.

---

### Step 2: Alice Shares a File (Becomes a Seeder)
Alice wants to share her video file my_trip.mp4.

Command:
pnpm dev:cli share /home/alice/Videos/my_trip.mp4 http://localhost:8080

What Happens:
1. The app splits my_trip.mp4 into chunks and computes their hashes.
2. A manifest file (my_trip.mp4.manifest) is created in the same folder.
3. Alice registers her file with the tracker.
4. The app starts listening for incoming peer connections on port 9001.

Alice should keep this terminal running while others download from her.

---

### Step 3: Alice Sends Bob the Manifest File
Alice shares the small .manifest file (not the video itself) with Bob using email, chat, USB, etc.

Example:
 /home/alice/Videos/my_trip.mp4.manifest

---

### Step 4: Bob Downloads the File (Becomes a Leecher)
Bob uses the manifest to download the video directly from Alice.

Command:
pnpm dev:cli download /home/bob/Desktop/my_trip.mp4.manifest /home/bob/Downloads

What Happens:
1. The app reads the manifest to find the tracker’s address (http://localhost:8080).
2. It asks the tracker for peers seeding this file.
3. The tracker responds with Alice’s IP and port.
4. Bob’s client connects directly to Alice to download the file in chunks.
5. A progress bar shows download progress.
6. When finished, my_trip.mp4 appears in /home/bob/Downloads.

---

## Summary of Commands

Action | Command Example | Description
-------|-----------------|-------------
Start Tracker | pnpm dev:tracker | Runs the central tracker server.
Share a File | pnpm dev:cli share <file-path> <tracker-url> | Registers the file with the tracker and starts seeding.
Download a File | pnpm dev:cli download <manifest-path> <output-dir> | Downloads the file using a .manifest from other peers.

---

## Key Takeaways
- The tracker is only a coordinator — it never transfers files.
- Peers communicate directly for file data.
- The .manifest file is the map that guides peers to each other.
- Keep your tracker and seeder terminals running for successful transfers.

---

## Example Architecture
```
        ┌────────────┐
        │   Tracker  │
        │ (Phonebook)│
        └─────┬──────┘
              │
      ┌───────┴────────┐
      │                │
┌────────────┐    ┌────────────┐
│   Alice    │◀──▶│    Bob     │
│ (Seeder)   │    │ (Leecher)  │
└────────────┘    └────────────┘
```

- Tracker connects peers.
- Peers exchange file chunks directly.
- No central storage — fully decentralized.

---

## License
MIT License © 2025  
Use freely for learning, experimentation, and distributed system demos.
