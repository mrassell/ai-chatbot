import { NextResponse } from 'next/server'; // Import NextResponse from Next.js for handling responses
import OpenAI from 'openai'; // Import OpenAI library for interacting with the OpenAI API

// System prompt for the AI, providing guidelines on how to respond to users
const systemPrompt = `
You are a helpful, knowledgeable, and friendly AI assistant. You should respond to users in a polite and professional manner. 

- Always be clear and concise in your explanations.
- If you don't know the answer, be honest and suggest looking it up or trying a different approach.
- Provide examples when explaining complex concepts.
- Be encouraging and supportive, especially when users express frustration or confusion.
- Avoid controversial topics and do not give medical, legal, or financial advice.
- If a user asks something inappropriate or offensive, politely steer the conversation back to a constructive topic.

Your goal is to assist the user to the best of your ability while maintaining a positive and respectful tone throughout the interaction.
`;

export async function POST(req) {
  // Get the API key from request headers
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return new NextResponse('API key is required', { status: 400 }); // Return 400 if API key is missing
  }

  const openai = new OpenAI({
    apiKey: apiKey // Use the provided API key
  });
  
  const data = await req.json(); // Parse the JSON body of the incoming request

  try {
    // Create a chat completion request to the OpenAI API
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }, ...data], // Include the system prompt and user messages
      model: 'gpt-4', // Specify the model to use
      stream: true, // Enable streaming responses
    });

    // Create a ReadableStream to handle the streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder(); // Create a TextEncoder to convert strings to Uint8Array
        try {
          // Iterate over the streamed chunks of the response
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content; // Extract the content from the chunk
            if (content) {
              const text = encoder.encode(content); // Encode the content to Uint8Array
              controller.enqueue(text); // Enqueue the encoded text to the stream
            }
          }
        } catch (err) {
          controller.error(err); // Handle any errors that occur during streaming
        } finally {
          controller.close(); // Close the stream when done
        }
      },
    });

    return new NextResponse(stream); // Return the stream as the response
  } catch (err) {
    console.error('Error during OpenAI API call:', err); // Log any errors that occur
    return new NextResponse('Internal Server Error', { status: 500 }); // Return a 500 status if there's an error
  }
}
