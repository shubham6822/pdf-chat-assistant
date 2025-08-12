import { NextRequest, NextResponse } from 'next/server';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Basic file validation
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from the PDF using pdf-parse
    const data = await pdf(buffer);
    const text = data.text;

    // Split the text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await textSplitter.splitText(text);

    // Create a temporary file-like object for PDFLoader
    const blob = new Blob([buffer], { type: 'application/pdf' });

    // Load and process the PDF
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    // Extract text content with page numbers
    const processedContent = splitDocs.map((doc, index) => ({
      content: doc,
      metadata: {
        chunkIndex: index,
      },
    }));

    // Store the processed content (in a real app, you'd store this in a vector database)
    // For now, we'll return success
    return NextResponse.json({ 
      success: true, 
      message: 'PDF processed successfully',
      chunks: processedContent.length,
      fileName: file.name,
      fileSize: file.size
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
