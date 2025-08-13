# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PDF Chat Assistant built with Next.js 15, React 19, and TypeScript. The application allows users to upload PDF documents and chat with an AI assistant about the document contents. It features a split-screen interface with PDF viewer on one side and chat interface on the other.

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production  
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Architecture Overview

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **UI Components**: shadcn/ui with Radix UI primitives  
- **Styling**: Tailwind CSS 4.x
- **PDF Processing**: pdf-parse, react-pdf, LangChain PDFLoader
- **AI Integration**: Multiple AI SDKs (@ai-sdk/openai, @ai-sdk/google, Google GenAI)
- **File Upload**: react-dropzone
- **Package Manager**: pnpm

### Project Structure
```
app/
├── api/
│   ├── chat/route.ts          # Chat API endpoint using OpenAI
│   └── process-pdf/route.ts   # PDF processing API using LangChain
├── layout.tsx                 # Root layout with fonts and metadata
├── page.tsx                   # Main application page (all-in-one component)
└── globals.css               # Global styles and Tailwind imports

components/
├── ui/                       # shadcn/ui components (auto-generated)
├── chat-interface.tsx        # Chat component with AI integration
├── pdf-uploader.tsx         # File upload component with validation
├── pdf-viewer.tsx           # PDF display component
└── theme-provider.tsx       # Theme context provider

lib/
├── utils.ts                 # Tailwind class merging utility
└── prompt.ts               # System prompts for AI
```

### Key Architecture Patterns

**Dual Implementation Approach**: The app has two implementations:
1. **Main page component** (`app/page.tsx`): All-in-one component with Google GenAI integration and mock responses
2. **Separate components** (`components/`): Modular architecture with OpenAI integration via @ai-sdk

**AI Integration**: 
- Chat API uses OpenAI GPT-4o with streaming responses
- PDF processing uses Google GenAI Gemini 2.5 Flash for document analysis
- System prompts designed to provide page citations in format `[Page X]`

**PDF Processing Pipeline**:
1. File upload with validation (50MB limit, PDF only)
2. Text extraction using pdf-parse
3. Document chunking with LangChain RecursiveCharacterTextSplitter
4. In-memory storage (no vector database currently implemented)

**Citation System**: AI responses include clickable page references that navigate the PDF viewer to specific pages.

## Important Configuration

- **TypeScript**: Strict mode enabled, ES6 target
- **Next.js**: ESLint and TypeScript errors ignored during builds (`next.config.mjs`)
- **Path Aliases**: `@/*` maps to project root
- **shadcn/ui**: New York style, using CSS variables, Lucide icons

## API Keys Required

Set these environment variables:
```bash
NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY=  # For Google GenAI
OPENAI_API_KEY=                           # For OpenAI chat API
```

## Development Notes

- The main page component (`app/page.tsx`) contains a fully functional implementation but uses mock responses for chat
- The modular components (`components/`) provide a more structured approach with real AI integration
- PDF viewer uses browser's built-in PDF renderer via iframe
- No database or persistent storage - all data is handled in memory
- File size limit is set to 50MB for PDF uploads