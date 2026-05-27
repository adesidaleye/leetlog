import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: Request) {
  try {
    const { tweetText } = await req.json();

    if (!tweetText) {
      return NextResponse.json(
        { error: "Missing required 'tweetText' field in request body." },
        { status: 400 }
      );
    }

    // Verify .env file variables exist
    const hasTwitterCreds = 
      process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!hasTwitterCreds) {
      return NextResponse.json(
        { error: "Twitter/X API credentials are not fully configured in your .env file." },
        { status: 500 }
      );
    }

    const scriptPath = path.join(process.cwd(), "tweepy_poster.py");

    const stdout = await runPythonScript(scriptPath, [tweetText]);
    console.log("Python Tweepy Script Output:", stdout);

    // Extract the new tweet ID from stdout. Our script prints: "NEW_TWEET_ID:<id>"
    const match = stdout.match(/NEW_TWEET_ID:(\d+)/);
    if (!match) {
      throw new Error(`Tweet was posted, but could not extract NEW_TWEET_ID from stdout. Output: ${stdout}`);
    }

    const newTweetId = match[1];

    return NextResponse.json({
      success: true,
      tweetId: newTweetId,
      tweetUrl: `https://x.com/i/status/${newTweetId}`,
      logs: stdout,
    });
  } catch (error: any) {
    console.error("Twitter posting route failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to post tweet via tweepy_poster.py" },
      { status: 500 }
    );
  }
}

function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const executables = ["python", "python3", "py"];
    let attemptIndex = 0;

    function execute(executable: string) {
      console.log(`Spawning ${executable} ${scriptPath} with ${args.length} args...`);
      const child = spawn(executable, [scriptPath, ...args], {
        env: { ...process.env },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const notFoundError = stderr.includes("ENOENT") || (stdout === "" && stderr === "");
          if (notFoundError) {
            attemptIndex++;
            if (attemptIndex < executables.length) {
              execute(executables[attemptIndex]);
            } else {
              reject(new Error(`Failed to execute Python script (tried python, python3, py). Stderr: ${stderr}`));
            }
          } else {
            reject(new Error(`Python script exited with code ${code}. Stderr: ${stderr}\nStdout: ${stdout}`));
          }
        }
      });

      child.on("error", (err: any) => {
        if (err.code === "ENOENT") {
          attemptIndex++;
          if (attemptIndex < executables.length) {
            execute(executables[attemptIndex]);
          } else {
            reject(new Error(`No python executable found (tried python, python3, py). Error: ${err.message}`));
          }
        } else {
          reject(err);
        }
      });
    }

    execute(executables[0]);
  });
}
