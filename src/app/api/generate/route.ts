import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const { problemName, problemUrl, language, topic, code } = await req.json();

    if (!problemName || !problemUrl || !language || !topic || !code) {
      return NextResponse.json(
        { error: "Missing required fields in the request body." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY environment variable is not set." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are a developer writing a personal journal entry about a LeetCode problem you just solved. Your tone is conversational, enthusiastic, and honest — like a real developer reflecting on their problem-solving process. Write in first person. Do not use excessive bold text. Do not use filler phrases. Be specific about what the insight or breakthrough was. Generate only the Goal and Approach sections; the Code, Complexities, and Screenshot will be filled in separately. Always respond with valid JSON only, no markdown, no backticks, no explanation.`;

    const userPrompt = `
Problem Name: ${problemName}
Problem URL: ${problemUrl}
Programming Language: ${language}
Topic/Data Structure: ${topic}

Code Solution:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Generate a structured JSON response matching the following schema. Return only the raw JSON object, nothing else:
{
  "goal": "A concise but engaging description of what the problem asks and why it's interesting, written in Developer Diary tone in first person.",
  "approach": "A narrative explanation of your thought process — why this strategy was chosen, what clicked, what the key insight was. Conversational, first person, no excessive bolding.",
  "timeComplexity": "The time complexity (e.g. O(N) or O(N log N))",
  "spaceComplexity": "The space complexity (e.g. O(1) or O(N))",
  "tweetTeaser": "A very short (under 140 characters), highly engaging teaser summary of the problem and your solution, without the github link. Written in active voice, developer style (e.g., 'Just solved Permutation in String! Realized we can use a sliding window instead of full sorting. Mind-blowing optimization! 🚀')"
}
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    const data = JSON.parse(responseText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Groq Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate solution documentation." },
      { status: 500 }
    );
  }
}