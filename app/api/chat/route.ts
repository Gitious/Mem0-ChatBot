// app/api/chat/route.js
import { NextResponse } from 'next/server';
import { createMem0, addMemories, retrieveMemories } from '@mem0/vercel-ai-provider';
import { OpenAI } from 'openai';

// Initialize mem0 provider using environment variables
const mem0 = createMem0({
  provider: 'openai',
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.OPENAI_API_KEY,
  config: { compatibility: 'strict' },
});

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { userId, message } = await req.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing userId or message in the request body.' },
        { status: 400 }
      );
    }

    // Save the user's message using the imported helper function
    await addMemories([{ role: 'user', content: message }], { user_id: userId });

    // Retrieve previous memories for this user (to build context)
    const memories = await retrieveMemories(message, { user_id: userId });
    console.log('Retrieved memories:', memories); 

    let context = '';
    if (memories.results && memories.results.length > 0) {
      context = memories.results
         .map(mem => "- " + mem.memory.trim())
         .join("\n");
    }

    // Build a system prompt using the formatted user details
    const systemPrompt = `You are an AI assistant with access to the following user details:
${context}
When answering the user's questions, see if there exists in the memory or context that will help you answer the question. If there is, use only these details and never mention that you lack access.`;
    
    const messagesForResponse = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // Call OpenAI with the properly structured messages
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesForResponse,
    });
    // Ensure a fallback if the response is null
    const responseMessage = completion.choices[0].message.content || '';

    // Save the assistant's response using the imported helper function
    await addMemories([{ role: 'assistant', content: responseMessage }], { user_id: userId });

    return NextResponse.json({ response: responseMessage });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
