import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get Lambda API URL from environment variable
    const lambdaUrl = process.env.LAMBDA_API_URL || "http://localhost:8000";

    console.log("Calling Lambda API:", lambdaUrl);

    // Connect to your Lambda API
    const response = await fetch(`${lambdaUrl}/api/consultation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lambda error:", response.status, errorText);
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

// This is important for Vercel
export const config = {
  api: {
    bodyParser: true,
  },
};
