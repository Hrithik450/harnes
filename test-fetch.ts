import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: "DUMMY_KEY_123",
  fetch: async (url, options) => {
    console.log("URL:", url);
    console.log("Headers:", options?.headers);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Hello" }] } }]
    }), { status: 200 });
  }
});

async function main() {
  await generateText({
    model: google("gemini-3.5-flash-lite"),
    prompt: "Hi"
  });
}
main();
