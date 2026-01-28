import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get Lambda API URL from environment variable
    const lambdaUrl = process.env.LAMBDA_API_URL || "http://localhost:8000";

    // Connect to your Lambda API
    const response = await fetch(`${lambdaUrl}/api/consultation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`Lambda API returned ${response.status}`);
    }

    // Get the complete response
    const data = await response.json();

    // Return the content
    return res.status(200).json(data);
  } catch (error) {
    console.error("API Proxy Error:", error);
    return res.status(500).json({
      error: "Failed to connect to backend",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// import type { NextApiRequest, NextApiResponse } from "next";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse,
// ) {
//   // Only allow POST requests
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   // Set headers for Server-Sent Events
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache, no-transform");
//   res.setHeader("Connection", "keep-alive");

//   try {
//     // Connect to your Python FastAPI backend with the request body
//     const response = await fetch("http://localhost:8000/api", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "text/event-stream",
//       },
//       body: JSON.stringify(req.body),
//     });

//     if (!response.ok) {
//       throw new Error(`Backend returned ${response.status}`);
//     }

//     // Get the reader from the response body
//     const reader = response.body?.getReader();
//     const decoder = new TextDecoder();

//     if (!reader) {
//       throw new Error("No reader available");
//     }

//     // Stream data from Python backend to Next.js client
//     while (true) {
//       const { done, value } = await reader.read();

//       if (done) {
//         break;
//       }

//       // Decode and send the chunk
//       const chunk = decoder.decode(value, { stream: true });
//       res.write(chunk);
//     }

//     res.end();
//   } catch (error) {
//     console.error("SSE Proxy Error:", error);
//     res.status(500).json({ error: "Failed to connect to backend" });
//   }
// }
