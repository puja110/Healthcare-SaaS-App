import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    // Connect to your Python FastAPI backend
    const response = await fetch("http://localhost:8000/api", {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    // Get the reader from the response body
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No reader available");
    }

    // Stream data from Python backend to Next.js client
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode and send the chunk
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error("SSE Proxy Error:", error);
    res.status(500).json({ error: "Failed to connect to backend" });
  }
}
