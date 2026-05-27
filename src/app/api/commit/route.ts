import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { problemName, topic, filename, markdownContent, screenshotBase64, screenshotName } = await req.json();

    if (!problemName || !topic || !filename || !markdownContent) {
      return NextResponse.json(
        { error: "Missing required fields: problemName, topic, filename, or markdownContent." },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!githubToken || !repoOwner || !repoName) {
      return NextResponse.json(
        { error: "GitHub environment variables (GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME) are not fully configured." },
        { status: 500 }
      );
    }

    let finalMarkdown = markdownContent;
    let cloudinaryUrl = null;

    // 1. Upload screenshot to Cloudinary if provided
    if (screenshotBase64 && screenshotName) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        return NextResponse.json(
          { error: "Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET) are not fully configured in your server environment." },
          { status: 500 }
        );
      }

      console.log(`Uploading screenshot '${screenshotName}' to Cloudinary cloud '${cloudName}'...`);

      // Ensure screenshot has a valid data URI prefix for Cloudinary
      let uploadFile = screenshotBase64;
      if (!uploadFile.startsWith("data:")) {
        uploadFile = `data:image/png;base64,${uploadFile}`;
      }

      const cloudinaryEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(cloudinaryEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloudinary Upload failed: ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      cloudinaryUrl = data.secure_url;
      console.log("Cloudinary Upload successful. Secure URL:", cloudinaryUrl);

      // 2. Replace the relative screenshot markdown pattern `![screenshot](./filename)` with `![screenshot](secure_url)`
      const relativeImagePattern = new RegExp(`!\\[screenshot\\]\\(\\./${escapeRegExp(screenshotName)}\\)`, "g");
      finalMarkdown = finalMarkdown.replace(relativeImagePattern, `![screenshot](${cloudinaryUrl})`);
    }

    // 3. Commit the Markdown File to GitHub
    const mdPath = `${topic}/${filename}`;
    const mdBase64 = Buffer.from(finalMarkdown, "utf-8").toString("base64");
    
    // Check if md file already exists to get its SHA
    const mdSha = await getFileSha(repoOwner, repoName, mdPath, githubToken);

    const mdCommitUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${mdPath}`;
    const mdCommitBody: any = {
      message: `docs: add solution for ${problemName}`,
      content: mdBase64,
    };
    if (mdSha) {
      mdCommitBody.sha = mdSha;
    }

    const mdResponse = await fetch(mdCommitUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "LeetLog-App",
      },
      body: JSON.stringify(mdCommitBody),
    });

    if (!mdResponse.ok) {
      const errorText = await mdResponse.text();
      throw new Error(`GitHub MD Commit failed: ${mdResponse.statusText} - ${errorText}`);
    }

    const githubUrl = `https://github.com/${repoOwner}/${repoName}/blob/main/${mdPath}`;

    return NextResponse.json({
      success: true,
      githubUrl,
      screenshotUrl: cloudinaryUrl,
    });
  } catch (error: any) {
    console.error("GitHub Commit & Cloudinary Upload API Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to commit solution to GitHub." },
      { status: 500 }
    );
  }
}

// Helper to escape special regex characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper function to check if a file exists on GitHub and retrieve its SHA
async function getFileSha(owner: string, repo: string, path: string, token: string): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LeetLog-App",
      },
    });

    if (res.status === 200) {
      const data = await res.json();
      return data.sha;
    }
    return null;
  } catch (err) {
    console.error("Error retrieving file SHA from GitHub:", err);
    return null;
  }
}
