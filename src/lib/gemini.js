const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

/**
 * VIONA's core personality system prompt
 */
function buildSystemPrompt(profile, tonePreference) {
    return `You are VIONA — a warm, intelligent, and empathetic personal AI assistant.

PERSONALITY TRAITS:
- You're supportive yet honest. You celebrate wins and gently challenge bad ideas.
- You speak naturally, like a trusted friend who happens to be brilliant.
- You use the user's name (${profile?.full_name || 'friend'}) occasionally to be personal.
- You remember context from the conversation and reference it.
- You NEVER say you're "just an AI" — you're VIONA, their dedicated assistant.

USER PROFILE:
- Name: ${profile?.full_name || 'Not set'}
- Goals: ${profile?.goals || 'Not shared yet'}
- Preferred tone: ${tonePreference || 'supportive'}

TONE GUIDELINES (match to preference "${tonePreference || 'supportive'}"):
- supportive: Encouraging, warm, uses emojis sparingly ✨
- professional: Clear, structured, formal but approachable
- casual: Friendly, uses humor, relaxed language
- motivational: Energetic, pump-up energy, action-oriented 🔥

CAPABILITIES — you can help with:
- Brainstorming ideas and creative thinking
- Decision-making (pros/cons analysis)
- Drafting messages, emails, plans
- Step-by-step reasoning and problem solving
- Emotional support and motivation
- Organizing thoughts and priorities

SPECIAL COMMANDS (detect and respond accordingly):
- If user says "remember this" or "note this" → Acknowledge and confirm you'll save it
- If user says "save idea" or "idea:" → Acknowledge the idea being saved
- If user says "remind me" → Ask for when, and confirm the reminder

TONE DETECTION:
- Analyze the user's message tone (calm, stressed, excited, sad, frustrated)
- Adapt your response energy to match or uplift their mood
- If stressed: be calming and reassuring
- If excited: match their energy
- If sad: be gentle and supportive

Keep responses concise but helpful. Use bullet points for lists. Be actionable.`;
}

/**
 * Detect the emotional tone of a message
 */
function detectTone(message) {
    const lower = message.toLowerCase();

    const stressWords = ['stressed', 'anxious', 'worried', 'overwhelmed', 'panic', 'help me', 'can\'t handle', 'too much', 'deadline', 'urgent', 'ugh', 'frustrated', 'angry'];
    const excitedWords = ['excited', 'amazing', 'awesome', 'great news', 'can\'t wait', 'yay', 'woohoo', 'love it', 'fantastic', '!!!', 'omg', 'incredible'];
    const sadWords = ['sad', 'depressed', 'lonely', 'miss', 'crying', 'heartbroken', 'lost', 'feeling down', 'hopeless', 'tired of'];

    const stressScore = stressWords.filter(w => lower.includes(w)).length;
    const excitedScore = excitedWords.filter(w => lower.includes(w)).length;
    const sadScore = sadWords.filter(w => lower.includes(w)).length;

    if (stressScore > excitedScore && stressScore > sadScore && stressScore > 0) return 'stressed';
    if (excitedScore > stressScore && excitedScore > sadScore && excitedScore > 0) return 'excited';
    if (sadScore > stressScore && sadScore > excitedScore && sadScore > 0) return 'sad';
    return 'calm';
}

/**
 * Detect smart commands in messages
 */
export function detectSmartCommand(message) {
    const lower = message.toLowerCase().trim();

    if (lower.includes('remember this') || lower.includes('note this') || lower.includes('save this note')) {
        const content = message.replace(/remember this[:\s]*/i, '').replace(/note this[:\s]*/i, '').replace(/save this note[:\s]*/i, '').trim();
        return { type: 'note', content: content || message };
    }

    if (lower.includes('save idea') || lower.startsWith('idea:')) {
        const content = message.replace(/save idea[:\s]*/i, '').replace(/^idea[:\s]*/i, '').trim();
        return { type: 'idea', content: content || message };
    }

    if (lower.includes('remind me')) {
        return { type: 'reminder', content: message };
    }

    return null;
}

/**
 * Send a message to Gemini and get a response
 */
export async function sendMessage(messages, profile) {
    if (!GEMINI_API_KEY) {
        return {
            content: "⚠️ Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file to enable AI responses.",
            tone: 'calm'
        };
    }

    const userMessage = messages[messages.length - 1]?.content || '';
    const detectedTone = detectTone(userMessage);

    const systemPrompt = buildSystemPrompt(profile, profile?.tone_preference);

    // Build conversation history for context
    const contents = [];

    // Add system instruction as first user turn
    contents.push({
        role: 'user',
        parts: [{ text: systemPrompt + '\n\nPlease acknowledge and begin.' }]
    });
    contents.push({
        role: 'model',
        parts: [{ text: `Hey ${profile?.full_name || 'there'}! I'm VIONA, your personal AI assistant. I'm here and ready to help. What's on your mind? 😊` }]
    });

    // Add conversation history (last 20 messages for context window)
    const recentMessages = messages.slice(-20);
    for (const msg of recentMessages) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        });
    }

    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.8,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', errData);
            throw new Error(errData?.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again.";

        return {
            content: aiText,
            tone: detectedTone,
        };
    } catch (error) {
        console.error('Gemini error:', error);
        return {
            content: `Sorry, I encountered an error: ${error.message}. Please try again in a moment.`,
            tone: detectedTone,
        };
    }
}

export { detectTone };
