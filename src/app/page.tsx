"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import {
  Code,
  Check,
  GitCommit,
  ArrowLeft,
  ChevronRight,
  UploadCloud,
  AlertCircle,
  Loader2,
  Terminal,
  ExternalLink,
  RotateCcw,
  Copy,
  PartyPopper,
  Radio,
  ScrollText,
} from "lucide-react";

// Support list of languages
const LANGUAGES = [
  "Python",
  "C++",
  "Java",
  "JavaScript",
  "TypeScript",
  "Go",
  "Rust",
  "Ruby",
  "C#",
  "Swift",
  "Kotlin",
];

// Topic folders based on specification
const TOPICS = [
  { value: "arrays", label: "Arrays" },
  { value: "strings", label: "Strings" },
  { value: "linked_lists", label: "Linked Lists" },
  { value: "trees", label: "Trees" },
  { value: "graphs", label: "Graphs" },
  { value: "dynamic_programming", label: "Dynamic Programming" },
  { value: "backtracking", label: "Backtracking" },
  { value: "binary_search", label: "Binary Search" },
  { value: "sliding_window", label: "Sliding Window" },
  { value: "two_pointers", label: "Two Pointers" },
  { value: "stack_and_queue", label: "Stack & Queue" },
  { value: "hash_maps", label: "Hash Maps" },
  { value: "math", label: "Math" },
  { value: "greedy", label: "Greedy" },
];

// Modern custom X/Twitter logo component
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function LeetLog() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Inputs
  const [problemName, setProblemName] = useState("");
  const [problemUrl, setProblemUrl] = useState("");
  const [language, setLanguage] = useState("Python");
  const [topic, setTopic] = useState("arrays");
  const [code, setCode] = useState("");

  // Screenshot Upload State
  const [screenshotName, setScreenshotName] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState("");

  // AI Generated / Review State
  const [goal, setGoal] = useState("");
  const [approach, setApproach] = useState("");
  const [timeComplexity, setTimeComplexity] = useState("O(N)");
  const [spaceComplexity, setSpaceComplexity] = useState("O(1)");
  const [tweetTeaser, setTweetTeaser] = useState("");
  const [rawMarkdown, setRawMarkdown] = useState("");

  // App & Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Server credentials configuration state
  const [hasTwitterConfig, setHasTwitterConfig] = useState(false);
  const [autoPostTwitter, setAutoPostTwitter] = useState(true);

  // Shipping (Commit & Optional Tweet) States
  const [isShipping, setIsShipping] = useState(false);
  const [shipLogs, setShipLogs] = useState<string[]>([]);

  const [githubStatus, setGithubStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubError, setGithubError] = useState("");

  const [twitterStatus, setTwitterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [tweetUrl, setTweetUrl] = useState("");
  const [twitterError, setTwitterError] = useState("");

  // Copy Clipboard State
  const [copied, setCopied] = useState(false);

  // Day Number for sharing
  const [dayNumber, setDayNumber] = useState<string>("1");

  // Auto-detect server Twitter configuration
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setHasTwitterConfig(data.hasTwitter);
        setAutoPostTwitter(data.hasTwitter); // Default autoPost to true if environment variables exist
      })
      .catch((err) => console.error("Error checking backend credentials configuration:", err));
  }, []);

  // Auto-generate markdown helper
  const updateMarkdownContent = (
    name: string,
    url: string,
    lang: string,
    gl: string,
    ap: string,
    tc: string,
    sc: string
  ) => {
    let md = `# ${name}

[Problem Link](${url})

## Goal
${gl}

## Approach
${ap}

## Code
\`\`\`${lang.toLowerCase()}
${code}
\`\`\`

## Complexities
- Time complexity: ${tc}
- Space complexity: ${sc}
`;

    if (screenshotName) {
      md += `
## Screenshot
![screenshot](./${screenshotName})
`;
    }
    setRawMarkdown(md);
  };

  // Sync Markdown whenever user changes complexities, goal, approach, or screenshot
  useEffect(() => {
    if (step === 2) {
      updateMarkdownContent(problemName, problemUrl, language, goal, approach, timeComplexity, spaceComplexity);
    }
  }, [goal, approach, timeComplexity, spaceComplexity, screenshotName]);

  // Handle Screenshot Upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name.replace(/\s+/g, "_"));
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setScreenshotBase64(base64String);
        setScreenshotPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear Screenshot
  const clearScreenshot = () => {
    setScreenshotName("");
    setScreenshotBase64("");
    setScreenshotPreview("");
  };

  // Step 1 -> Step 2: Trigger AI Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemName || !problemUrl || !code) {
      setGenError("Please fill out all required fields: Name, URL, and Solution Code.");
      return;
    }

    setIsGenerating(true);
    setGenError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemName, problemUrl, language, topic, code }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate developer markdown.");
      }

      const data = await res.json();
      setGoal(data.goal);
      setApproach(data.approach);
      setTimeComplexity(data.timeComplexity || "O(N)");
      setSpaceComplexity(data.spaceComplexity || "O(1)");
      setTweetTeaser(data.tweetTeaser || `Just solved ${problemName}! Realized a clean solution using ${topic}. 🚀`);

      // Initialize raw markdown
      updateMarkdownContent(
        problemName,
        problemUrl,
        language,
        data.goal,
        data.approach,
        data.timeComplexity || "O(N)",
        data.spaceComplexity || "O(1)"
      );

      setStep(2);
    } catch (err: any) {
      setGenError(err.message || "An unexpected error occurred during AI generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2 -> Step 3: Proceed to Ship Screen
  const handleProceedToShip = () => {
    setGithubStatus("idle");
    setGithubUrl("");
    setGithubError("");
    setTwitterStatus("idle");
    setTweetUrl("");
    setTwitterError("");
    setShipLogs([]);
    setCopied(false);
    setAutoPostTwitter(false); // Off by default every time Ship step is loaded
    setStep(3);
  };

  // Step 3: Trigger Ship (Github & optional Twitter post)
  const handleShipIt = async () => {
    setIsShipping(true);
    setShipLogs(["[System] Starting deployment process..."]);

    // 1. Committing to GitHub
    setGithubStatus("loading");
    setShipLogs(prev => [...prev, "[GitHub] Preparing commit for repository..."]);

    // Formulate a clean snake case filename
    const formattedFileName = problemName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") + ".md";

    try {
      const commitRes = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemName,
          topic,
          filename: formattedFileName,
          markdownContent: rawMarkdown,
          screenshotBase64: screenshotBase64 || null,
          screenshotName: screenshotName || null,
        }),
      });

      if (!commitRes.ok) {
        const errData = await commitRes.json();
        throw new Error(errData.error || "Failed to commit files to GitHub.");
      }

      const commitData = await commitRes.json();
      setGithubStatus("success");
      setGithubUrl(commitData.githubUrl);
      setShipLogs(prev => [
        ...prev,
        `[GitHub] Success! Committed solution as '${topic}/${formattedFileName}'.`,
        `[GitHub] Commit URL: ${commitData.githubUrl}`
      ]);

      // 2. Optional Twitter Auto-Threading
      const runTwitterAutoPost = hasTwitterConfig && autoPostTwitter;
      if (runTwitterAutoPost) {
        setTwitterStatus("loading");
        setShipLogs(prev => [...prev, "[Twitter/X] Submitting tweet reply to local thread..."]);

        // Construct tweet with GitHub Link appended
        const cleanTweetText = `${tweetTeaser}\n\nCheck out my full personal dev notes! 👇\n${commitData.githubUrl}`;

        const tweetRes = await fetch("/api/tweet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweetText: cleanTweetText }),
        });

        if (!tweetRes.ok) {
          const errData = await tweetRes.json();
          throw new Error(errData.error || "Failed to post thread tweet.");
        }

        const tweetData = await tweetRes.json();
        setTwitterStatus("success");
        setTweetUrl(tweetData.tweetUrl);
        setShipLogs(prev => [
          ...prev,
          `[Twitter/X] Success! Posted reply to thread.`,
          `[Twitter/X] Tweet URL: ${tweetData.tweetUrl}`,
          `[System] Ship operations fully complete. Enjoy your LeetCode streak! 🚀`
        ]);
      } else {
        setShipLogs(prev => [
          ...prev,
          `[System] Ship operations complete. Manual Twitter/X teaser post is ready! 🚀`
        ]);
      }

    } catch (err: any) {
      console.error(err);
      if (githubStatus === "loading") {
        setGithubStatus("error");
        setGithubError(err.message);
        setShipLogs(prev => [...prev, `[GitHub ERROR] ${err.message}`]);
      } else {
        setTwitterStatus("error");
        setTwitterError(err.message);
        setShipLogs(prev => [...prev, `[Twitter/X ERROR] ${err.message}`]);
      }
    } finally {
      setIsShipping(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = () => {
    const formattedTweet = `day ${dayNumber}\n\n${problemName.toLowerCase()}\n${githubUrl}`;
    navigator.clipboard.writeText(formattedTweet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse markdown safely for raw html view
  const renderMarkdownToHtml = (md: string) => {
    try {
      return { __html: marked.parse(md) };
    } catch {
      return { __html: "<p>Rendering preview...</p>" };
    }
  };

  // Reset App
  const handleReset = () => {
    setProblemName("");
    setProblemUrl("");
    setCode("");
    clearScreenshot();
    setGoal("");
    setApproach("");
    setTweetTeaser("");
    setRawMarkdown("");
    setStep(1);
  };

  return (
    <div className="flex-1 w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden relative">
      {/* Sleek background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col flex-1 z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl shadow-lg shadow-blue-600/20">
              <ScrollText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                LeetLog <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 font-semibold uppercase tracking-wider">v1.0</span>
              </h1>
              <p className="text-sm text-slate-400">Developer Markdown Notes & Automated Twitter/X Threader</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400 font-medium">Systems Operational</span>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="w-full max-w-2xl mx-auto mb-10">
          <div className="relative flex items-center justify-between">
            {/* Bounded progress line track - starts at circle 1 center and ends at circle 3 center */}
            <div className="absolute left-[20px] right-[40px] top-[30%] -translate-y-1/2 h-[2px] z-0">
              {/* Background track line */}
              <div className="absolute inset-0 bg-slate-800" />

              {/* Active connecting progress line */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-blue-600 transition-all duration-500 ease-in-out"
                style={{
                  width: step === 1 ? "0%" : step === 2 ? "50%" : "100%"
                }}
              />
            </div>

            {[
              { num: 1, label: "Input details" },
              { num: 2, label: "Review Markdown" },
              { num: 3, label: "Ship solution" }
            ].map((s) => {
              const active = step >= s.num;
              const current = step === s.num;
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: current ? 1.15 : 1,
                      backgroundColor: current ? "#155DFC" : active ? "#1e3a8a" : "#0f172a",
                      borderColor: current ? "#60a5fa" : active ? "#155DFC" : "#334155"
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold text-sm shadow-md transition-colors duration-300`}
                  >
                    {active && s.num < step ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className={current ? "text-white" : active ? "text-blue-200" : "text-slate-500"}>
                        {s.num}
                      </span>
                    )}
                  </motion.div>
                  <span className={`text-xs mt-2 font-semibold tracking-wide ${current ? "text-blue-400 font-bold" : active ? "text-slate-300" : "text-slate-500"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Box with AnimatePresence */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {/* STEP 1: INPUT FORM */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col gap-6"
              >
                <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Details & Uploads */}
                  <div className="lg:col-span-5 flex flex-col gap-5">
                    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-5">
                      <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                        Problem Details
                      </h2>

                      {/* Name */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="problem-name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Problem Name <span className="text-blue-400">*</span>
                        </label>
                        <input
                          id="problem-name"
                          type="text"
                          required
                          value={problemName}
                          onChange={(e) => setProblemName(e.target.value)}
                          placeholder="e.g. Permutation in String"
                          className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                        />
                      </div>

                      {/* URL */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="problem-url" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Problem URL <span className="text-blue-400">*</span>
                        </label>
                        <input
                          id="problem-url"
                          type="url"
                          required
                          value={problemUrl}
                          onChange={(e) => setProblemUrl(e.target.value)}
                          placeholder="e.g. https://leetcode.com/problems/permutation-in-string/"
                          className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Language */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="language" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Language
                          </label>
                          <select
                            id="language"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-100 outline-none transition-all appearance-none cursor-pointer"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </select>
                        </div>

                        {/* Topic Directory */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="topic" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Topic Directory
                          </label>
                          <select
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-100 outline-none transition-all appearance-none cursor-pointer"
                          >
                            {TOPICS.map((top) => (
                              <option key={top.value} value={top.value}>{top.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Screenshot Box */}
                    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <UploadCloud className="w-5 h-5 text-slate-400" />
                        Screenshot <span className="text-slate-500 text-xs font-normal">(Optional)</span>
                      </h3>

                      {!screenshotPreview ? (
                        <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors mb-2" />
                          <p className="text-xs font-medium text-slate-300">Click or drag image file here</p>
                          <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, or WEBP. Max 5MB</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                            <img
                              src={screenshotPreview}
                              alt="Screenshot Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={clearScreenshot}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 border border-slate-700 hover:bg-red-950/80 hover:border-red-900 text-slate-300 hover:text-red-400 transition-all shadow"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate max-w-full font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            Selected: {screenshotName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Code input & CTA */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    <div className="flex-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4 min-h-[350px] lg:min-h-0">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <Code className="w-5 h-5 text-blue-400" />
                          Solution Code
                        </h2>
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-950 text-blue-400 border border-blue-900">
                          {language}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col min-h-[250px] relative">
                        <textarea
                          id="solution-code"
                          required
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="// Paste your correct solution code here..."
                          className="flex-1 w-full p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-blue-200 placeholder-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all"
                        />
                      </div>
                    </div>

                    {genError && (
                      <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/55 text-red-300 text-xs flex items-center gap-3 animate-pulse">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <div>
                          <p className="font-semibold">Generation Failed</p>
                          <p className="text-slate-400 mt-0.5">{genError}</p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full py-3.5 cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Markdown...
                        </>
                      ) : (
                        <>
                          {/* <ScrollText className="w-5 h-5" /> */}
                          Generate & Review Markdown
                          <ChevronRight className="w-5 h-5 ml-0.2" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 2: REVIEW PANEL */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Column: Markdown & Teaser Editors */}
                  <div className="lg:col-span-6 flex flex-col gap-5">
                    {/* Markdown Editor */}
                    <div className="flex-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4 min-h-[380px] lg:min-h-[450px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                          <Terminal className="w-4.5 h-4.5 text-slate-400" />
                          Raw Markdown Editor
                        </h2>
                        <span className="text-[10px] text-slate-500 font-mono">Editable</span>
                      </div>
                      <textarea
                        value={rawMarkdown}
                        onChange={(e) => setRawMarkdown(e.target.value)}
                        className="flex-1 w-full p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 outline-none resize-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Right Column: HTML Live Preview */}
                  <div className="lg:col-span-6 flex flex-col">
                    <div className="flex-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                          <Radio className="w-4.5 h-4.5 text-blue-400" />
                          Live Markdown Render
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-850 text-blue-300 font-mono">
                          Parsed HTML
                        </span>
                      </div>

                      {/* Clean Custom styled Markdown Container */}
                      <div className="flex-1 overflow-y-auto max-h-[580px] pr-2 scrollbar-thin">
                        <div
                          className="prose-custom text-sm leading-relaxed text-slate-300"
                          dangerouslySetInnerHTML={renderMarkdownToHtml(rawMarkdown)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back / Next CTA Row */}
                <div className="flex items-center justify-between gap-4 mt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/30 text-slate-300 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Inputs
                  </button>

                  <button
                    onClick={handleProceedToShip}
                    className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide transition-all shadow-xl shadow-blue-600/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Proceed to Ship
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SHIP DASHBOARD */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col max-w-3xl mx-auto gap-6"
              >
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl flex flex-col gap-6">
                  <div className="text-center pb-4 border-b border-slate-800 flex flex-col items-center">
                    <h2 className="text-xl font-black text-white flex items-center justify-center gap-2">
                      Ready to Deploy LeetLog
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">This will commit the Markdown solution file to GitHub and prepare your thread teaser.</p>

                    {/* Twitter Auto-post Toggle Switch (Only visible if credentials exist on backend) */}
                    {hasTwitterConfig && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-950 border border-slate-800/60"
                      >
                        <TwitterIcon className="w-4.5 h-4.5 text-sky-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300 select-none">Post to Twitter/X thread automatically</span>
                        <button
                          type="button"
                          onClick={() => setAutoPostTwitter(!autoPostTwitter)}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-255 ease-in-out outline-none ${autoPostTwitter ? "bg-blue-600" : "bg-slate-800"}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${autoPostTwitter ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex flex-col gap-5">
                    {/* GitHub Ship Card */}
                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${githubStatus === "success" ? "bg-emerald-950/50 border border-emerald-900 text-emerald-400" : "bg-slate-900 border border-slate-850 text-blue-400"}`}>
                          <GitCommit className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">Commit to GitHub Repository</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Target path: <code className="font-mono text-blue-300">{topic}/{problemName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.md</code>
                          </p>
                          {githubError && (
                            <p className="text-[11px] text-red-400 mt-1 font-medium">{githubError}</p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {githubStatus === "idle" && (
                          <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-500 font-semibold uppercase">Pending</span>
                        )}
                        {githubStatus === "loading" && (
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        )}
                        {githubStatus === "success" && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-1 rounded bg-emerald-950 border border-emerald-900 text-emerald-400 font-semibold uppercase">Committed</span>
                            <a
                              href={githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                        {githubStatus === "error" && (
                          <span className="text-xs px-2.5 py-1 rounded bg-red-950 border border-red-900 text-red-400 font-semibold uppercase">Failed</span>
                        )}
                      </div>
                    </div>

                    {/* Twitter/X Auto-posting Progress Card (Only visible when autoPost is enabled) */}
                    {hasTwitterConfig && autoPostTwitter && (
                      <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${twitterStatus === "success" ? "bg-emerald-950/50 border border-emerald-900 text-emerald-400" : "bg-slate-900 border border-slate-850 text-sky-400"}`}>
                            <TwitterIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-100">Reply to Twitter/X Thread</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px] md:max-w-[400px]">
                              Preview: <span className="text-slate-400 italic">"{tweetTeaser}..."</span>
                            </p>
                            {twitterError && (
                              <p className="text-[11px] text-red-400 mt-1 font-medium">{twitterError}</p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center">
                          {twitterStatus === "idle" && (
                            <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-500 font-semibold uppercase">Pending</span>
                          )}
                          {twitterStatus === "loading" && (
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                          )}
                          {twitterStatus === "success" && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2.5 py-1 rounded bg-emerald-950 border border-emerald-900 text-emerald-400 font-semibold uppercase">Posted</span>
                              <a
                                href={tweetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                          {twitterStatus === "error" && (
                            <span className="text-xs px-2.5 py-1 rounded bg-red-950 border border-red-900 text-red-400 font-semibold uppercase">Failed</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Copy Tweet Teaser Block (Visible if GitHub succeeds AND Twitter autoPost is disabled/unconfigured) */}
                    {githubStatus === "success" && (!hasTwitterConfig || !autoPostTwitter) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2 gap-4">
                          <div className="flex items-center gap-2">
                            <TwitterIcon className="w-4 h-4 text-sky-400" />
                            <span className="text-xs font-bold text-slate-300">Twitter/X Manual Post</span>
                          </div>

                          {/* Inline Day Number Input Selector */}
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-850">
                            <span className="text-[10px] font-semibold text-slate-400 lowercase">day</span>
                            <input
                              type="number"
                              min="1"
                              value={dayNumber}
                              onChange={(e) => setDayNumber(e.target.value)}
                              className="w-10 text-center bg-slate-950 border border-slate-800 rounded font-bold text-[10px] text-blue-400 outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5"
                            />
                          </div>
                        </div>

                        <div className="relative">
                          <pre className="w-full p-4 rounded-lg bg-slate-900/60 border border-slate-850 font-mono text-xs text-blue-200/90 leading-relaxed max-h-[140px] overflow-y-auto whitespace-pre-wrap">
                            {`day ${dayNumber}`}
                            {"\n\n"}
                            {problemName.toLowerCase()}
                            {"\n"}
                            {githubUrl}
                          </pre>

                          <button
                            onClick={handleCopyToClipboard}
                            className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-950 hover:bg-blue-600 text-blue-300 hover:text-white border border-slate-800 hover:border-blue-500 shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Post
                              </>
                            )}
                          </button>
                        </div>

                        {/* Direct Link to X Profile */}
                        <a
                          href="https://x.com/ogfego"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-lg bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/60 hover:border-slate-800 font-semibold text-xs transition-all shadow flex items-center justify-center gap-2 mt-2 hover:scale-[1.005] active:scale-[0.995]"
                        >
                          <TwitterIcon className="w-4 h-4 text-sky-400" />
                          Go to my X profile
                        </a>
                      </motion.div>
                    )}

                    {/* Console / Output logs */}
                    {shipLogs.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Console Logs</span>
                        <div className="w-full p-4 rounded-lg bg-slate-950 border border-slate-850 font-mono text-[10px] text-blue-300/80 leading-relaxed overflow-y-auto max-h-[120px] shadow-inner">
                          {shipLogs.map((log, index) => (
                            <div key={index} className="truncate">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Ship Action */}
                  <div className="flex flex-col gap-3 mt-2">
                    {githubStatus === "success" && (!hasTwitterConfig || !autoPostTwitter || twitterStatus === "success") ? (
                      <button
                        onClick={handleReset}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold tracking-wide transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Document Another Solution
                      </button>
                    ) : (
                      <button
                        onClick={handleShipIt}
                        disabled={isShipping}
                        className="w-full py-4 cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wider transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isShipping ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Shipping Your Logs...
                          </>
                        ) : (
                          <>
                            <PartyPopper className="w-5 h-5" />
                            SHIP IT!
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setStep(2)}
                      disabled={isShipping}
                      className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/30 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      Back to Review
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
