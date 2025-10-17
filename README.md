# How Your App Works (The Big Picture)
Your app works by separating the "phone book" from the "conversation."

The Tracker (Phone Book): This is a simple server (tracker.ts) that you must run first. It doesn't know anything about your files. Its only job is to be a "matchmaker." When a peer (a user) wants to share a file, it tells the tracker, "Hi, I'm at this IP address, and I have file X."

The Peer (The User): This is the main app (cli.ts) that everyone uses. A peer acts as two things at once:

A Client (Leecher): When you download, you first ask the tracker, "Who has file X?" The tracker gives you a list of IPs. You then connect directly to those peers to download the file in chunks.

A Server (Seeder): When you share, you register with the tracker and then listen on a port. When another peer connects to you, you read the requested file chunk from your disk and send it to them.

The tracker never sends the file. The file transfer is always peer-to-peer (directly between users).

How to Use Your App: A Step-by-Step Example
Let's imagine User Alice wants to send a large video to User Bob.

Step 1: Start the Tracker (Crucial First Step)
Someone (this could be Alice, Bob, or a third person) must run the tracker server so everyone can find each other. This only needs to be done once.

Action: Open Terminal 1 and run:
pnpm dev:tracker

Result: You will see [Tracker] Server listening on http://localhost:8080. Leave this terminal running.

Step 2: Alice Shares the File (Becomes a "Seeder")
Alice has a video she wants to share. She runs the share command to create the "map" (.manifest file) and start listening for downloaders.

Command: pnpm dev:cli share <file-path> <tracker-url>

Example:
Alice has her file located at /home/alice/Videos/my_trip.mp4.

She opens Terminal 2 and runs:
pnpm dev:cli share /home/alice/Videos/my_trip.mp4 http://localhost:8080

What Happens:
- The app scans my_trip.mp4, breaks it into chunks, and hashes them.
- A new file named my_trip.mp4.manifest is created in the same directory (/home/alice/Videos/).
- The app contacts the tracker and says, "I am now seeding the file with this hash."
- The app starts listening on port 9001 for any peers who want to download. Alice must leave this terminal running.

Step 3: Alice Sends Bob the "Map"
This is a manual step. Alice doesn't send the huge video file. She just sends the tiny .manifest file she just created to Bob.

Action: Alice emails, messages (on Discord, etc.), or uses a USB stick to give my_trip.mp4.manifest to Bob.

Step 4: Bob Downloads the File (Becomes a "Leecher")
Bob receives the .manifest file and saves it, for example, on his Desktop. Now he can use it to download the video.

Command: pnpm dev:cli download <manifest-path> <output-directory>

Example:
Bob saved the "map" to /home/bob/Desktop/my_trip.mp4.manifest.
He wants to save the final video to his Downloads folder.

He opens Terminal 3 and runs:
pnpm dev:cli download /home/bob/Desktop/my_trip.mp4.manifest /home/bob/Downloads

What Happens:
- The app reads the .manifest file to find the tracker's address (http://localhost:8080).
- It asks the tracker, "Who is seeding this file?"
- The tracker replies with Alice's IP address and port (9001).
- Bob's app connects directly to Alice's app and starts downloading all the chunks.
- A progress bar will appear.
- When finished, the complete my_trip.mp4 file will be in Bob's /home/bob/Downloads folder.
