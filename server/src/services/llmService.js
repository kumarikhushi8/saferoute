const axios = require('axios');

async function callLLM(prompt, fallback) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'mock-key') return fallback;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5173', // Required by OpenRouter
          'X-Title': 'SafeRoute Hackathon', // Required by OpenRouter
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content;
    
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

  return await callLLM(prompt, fallback);
}

async function generateRouteSummary(durationMins, distanceKm, score, isFastest, routesAreIdentical = false) {
  const prompt = `
    You are a navigation assistant. Write a helpful 2-3 sentence summary explaining the characteristics of this route to a pedestrian.
    Route stats:
    - Duration: ${durationMins} minutes
    - Distance: ${distanceKm} km
    - Safety Score (0-100): ${score}
    - Is this the fastest route?: ${isFastest}
    - Are the fastest and safest routes identical?: ${routesAreIdentical}
    
    If the fastest and safest routes are identical, mention that this route offers the perfect balance of time and safety.
    Otherwise, if it's the safest route, explain that while it might take slightly longer, the higher safety score means better lighting and police proximity. If it's the fastest route, mention it saves time but has a lower safety score. Do NOT use markdown.
  `;
  
  let fallback;
  if (routesAreIdentical) {
    fallback = `This route offers the perfect balance of time and safety. At ${durationMins} minutes and a safety score of ${score}/100, it is both the fastest and most secure option available. You will pass through well-lit areas without sacrificing speed.`;
  } else {
    fallback = isFastest 
      ? `This is the fastest route, saving you time with an ETA of ${durationMins} minutes. However, it has a lower safety score of ${score}/100. Be aware that you may pass through darker areas or zones with fewer police stations.` 
      : `This route prioritizes your safety, achieving a high score of ${score}/100 due to excellent street lighting and proximity to police stations. While it takes slightly longer at ${durationMins} minutes, the added security makes it the recommended choice for walking alone.`;
  }
    
  const textResponse = await callLLM(prompt, fallback);
  return typeof textResponse === 'string' ? textResponse : fallback;
}

async function draftSOSMessage(user, lat, lng, trackingUrl) {
  const prompt = `
    You are an emergency response AI. Draft a short, urgent SMS message to be sent to emergency contacts.
    User Name: ${user ? user.name : 'A SafeRoute User'}
    Location: Lat ${lat}, Lng ${lng}
    Tracking Link: ${trackingUrl || 'Not available'}
    
    The message must include a plea for help, the user's name, and the Tracking Link so they can watch the live location. Keep it under 160 characters (standard SMS length). Do NOT use markdown or quotes.
  `;
  
  const fallback = `🚨 URGENT: ${user ? user.name : 'A SafeRoute User'} has triggered an SOS! They need immediate assistance. Live tracking active: ${trackingUrl || `Lat ${lat}, Lng ${lng}`}.`;
    
  const textResponse = await callLLM(prompt, fallback);
  return typeof textResponse === 'string' ? textResponse : fallback;
}

module.exports = {
  classifyReport,
  generateRouteSummary,
  draftSOSMessage
};
