import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    
    // Check if there's context about a PDF
    const hasContext = messages.some((msg: any) => 
      msg.content.toLowerCase().includes('pdf') || 
      msg.content.toLowerCase().includes('document')
    )
    
    const systemPrompt = `You are a helpful AI assistant that helps users understand and analyze PDF documents. 

When responding to questions about PDF content:
1. Provide clear, concise answers
2. Include specific page references when possible using the format [Page X] 
3. Be helpful and informative
4. If you don't have access to the actual PDF content, acknowledge this and provide general guidance

${hasContext ? 'The user has uploaded a PDF document and is asking questions about it.' : 'No PDF has been uploaded yet.'}

Remember to include page citations in your responses when referencing specific parts of documents using the format [Page X].`

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
