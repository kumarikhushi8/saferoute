const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini. If the key is missing or invalid, we will fallback to mock data.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

async function callGemini(prompt, fallback) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Try to parse JSON if requested
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  } catch (error) {
    console.warn("LLM Call Failed (Using Fallback). Error:", error.message);
    return fallback;
  }
}

async function classifyReport(reason) {
  const prompt = `
    You are a safety moderation assistant. Classify the following community report reason.
    Reason: "${reason}"
    
    Respond ONLY with a valid JSON object matching this schema:
    {
      "category": "Lighting" | "Suspicious Activity" | "Road Hazard" | "Police Presence" | "Other",
      "urgency": "Low" | "Medium" | "High",
      "isSpam": true | false
    }
  `;
  
  const fallback = {
    category: "Other",
    urgency: "Medium",
    isSpam: false
  };

  return await callGemini(prompt, fallback);
}

async function generateRouteSummary(durationMins, distanceKm, score, isFastest, routesAreIdentical = false) {
  const prompt = `
    You are a navigation assistant. Write a single, concise, natural language sentence describing a route.
    Route stats:
    - Duration: ${durationMins} minutes
    - Distance: ${distanceKm} km
    - Safety Score (0-100): ${score}
    - Is this the fastest route?: ${isFastest}
    - Are the fastest and safest routes identical?: ${routesAreIdentical}
    
    If the fastest and safest routes are identical, mention that this route offers the best of both time and safety.
    Otherwise, if it's safe but slow, mention the trade-off. If it's fast but less safe, mention the trade-off. Keep it under 20 words. Do NOT use markdown.
  `;
  
  let fallback;
  if (routesAreIdentical) {
    fallback = `This route is both the fastest and safest option, taking ${durationMins} mins with a score of ${score}/100.`;
  } else {
    fallback = isFastest 
      ? `This is the fastest route, taking ${durationMins} mins, but it has a lower safety score of ${score}/100.` 
      : `This route prioritizes safety with a score of ${score}/100, taking a slightly longer ${durationMins} mins.`;
  }
    
  const textResponse = await callGemini(prompt, fallback);
  return typeof textResponse === 'string' ? textResponse : fallback;
}

async function draftSOSMessage(user, lat, lng) {
  const prompt = `
    You are an emergency response AI. Draft a short, urgent SMS message to be sent to emergency contacts.
    User Name: ${user ? user.name : 'A SafeRoute User'}
    Location: Lat ${lat}, Lng ${lng}
    
    The message must include a plea for help, the user's name, and state that their live location is being tracked. Keep it under 160 characters (standard SMS length). Do NOT use markdown or quotes.
  `;
  
  const fallback = `🚨 URGENT: ${user ? user.name : 'A SafeRoute User'} has triggered an SOS! They need immediate assistance. Live tracking active at Lat ${lat}, Lng ${lng}. Check SafeRoute app now.`;
    
  const textResponse = await callGemini(prompt, fallback);
  return typeof textResponse === 'string' ? textResponse : fallback;
}

module.exports = {
  classifyReport,
  generateRouteSummary,
  draftSOSMessage
};
