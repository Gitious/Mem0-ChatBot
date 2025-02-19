// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { addMemories, retrieveMemories } from '@mem0/vercel-ai-provider';
import { OpenAI } from 'openai';
import type { NextRequest } from 'next/server';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
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

    // Attempt to parse memories if it's JSON; otherwise use as plain text
    let parsedMemories;
    if (typeof memories === 'string') {
      try {
        parsedMemories = JSON.parse(memories);
      } catch (error) {
        parsedMemories = memories;
      }
    } else {
      parsedMemories = memories;
    }

    let context = '';
    if (parsedMemories && typeof parsedMemories === 'object' && parsedMemories.results && parsedMemories.results.length > 0) {
      context = parsedMemories.results
         .map((mem: { memory: string }) => "- " + mem.memory.trim())
         .join("\n");
    } else if (typeof parsedMemories === 'string') {
      // if it's plain text, use it directly
      context = parsedMemories;
    }

    // Build a system prompt using the formatted user details
    const systemPrompt = `You are an AI assistant with access to the following user details:
${context}
When answering the user's questions, see if there exists in the memory or context that will help you answer the question. If there is, use only these details and never mention that you lack access.`;
    
    const messagesForResponse = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message }
    ];

    // Call OpenAI with the properly structured messages
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesForResponse,
    });
    // Ensure a fallback if the response is null
    const responseMessage = completion.choices[0].message.content || '';

    // Save the assistant's response using the imported helper function
    // Wrap the string response in an array of text parts
    await addMemories(
      [{ role: 'assistant', content: [{ type: 'text', text: responseMessage }] }],
      { user_id: userId }
    );

    return NextResponse.json({ response: responseMessage });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
