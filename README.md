# My WebBot - AI Code Assistant

An intelligent chatbot application that helps you with coding tasks, file management, and project assistance. Built with React, TypeScript, Express, and powered by OpenAI's GPT-4o-mini via LangChain.

## 🚀 Features

- **AI-Powered Chat Interface** - Interactive chat with streaming responses
- **File System Operations** - Read, write, and search files in your project
- **Code Analysis** - Search and analyze code across your workspace
- **Code Editing** - Make precise code modifications with surgical edits
- **Shell Command Execution** - Run terminal commands directly from the chat
- **Quality Checks** - Run lint and build checks on your code
- **Real-time Status** - Visual feedback with progress indicators and typing animations
- **Beautiful UI** - Modern dark theme with syntax-highlighted code blocks

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI library
- **TypeScript 5.9** - Type safety
- **Vite** - Fast build tool and dev server
- **CSS Modules** - Component-scoped styling

### Backend
- **Express 5.1** - Web server
- **LangChain 0.3** - AI agent framework
- **OpenAI GPT-4o-mini** - Language model
- **Zod 3.23** - Schema validation

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI API key to .env
```

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
PORT=3001
```

## 🚀 Usage

```bash
# Start both frontend and backend
npm run dev:all

# Or start separately:
npm run dev        # Frontend only (port 5173)
npm run dev:server # Backend only (port 3001)
```

Then open http://localhost:5173 in your browser.

## 🤖 Bot Capabilities

Your AI assistant is a powerful coding companion with full access to your project. Here's what it can do:

### 📖 File Operations
- **`read_file`** - Read and analyze any text file in your project
  - *Example: "Read my App.tsx file and explain what it does"*
  
- **`write_file`** - Create new files or completely rewrite existing ones
  - Automatically creates parent directories if they don't exist
  - *Example: "Create a new LoginPage component with TypeScript and form validation"*

- **`replace_in_file`** - Make precise, surgical edits to existing code
  - Perfect for bug fixes and small changes without rewriting entire files
  - *Example: "Change the API endpoint URL from localhost to production"*

### 🔍 Code Discovery
- **`search`** - Find code patterns across your entire codebase
  - Supports plain text and regex patterns (like `/pattern/i`)
  - Searches through 400+ files to find what you need
  - *Example: "Find all components that use useState"*

- **`list_dir`** - Browse and explore your project structure
  - *Example: "Show me what's inside the components folder"*

### 🛠️ Development Tools
- **`run_command`** - Execute any shell command in your project directory
  - Can run `git`, `npm`, `mkdir`, `mv`, `rm`, and more
  - Perfect for restructuring, installing packages, or git operations
  - *Example: "Install the axios library" or "Create a new folder for utils"*

- **`run_checks`** - Run quality checks on your code
  - Lint your code to find style issues
  - Build your project to catch errors before deployment
  - *Example: "Run lint to check my code quality"*

### 💡 What This Means
Your bot can:
- **Understand your entire codebase** - Reads and analyzes all your files
- **Write production-ready code** - Creates new features and components
- **Refactor safely** - Makes precise changes without breaking things
- **Manage your project** - Creates folders, moves files, organizes structure
- **Run git operations** - Commits, pushes, creates branches
- **Install dependencies** - Adds new npm packages when needed
- **Debug issues** - Finds bugs and fixes them across multiple files
- **Explain code** - Analyzes and explains what your code does

### 🎯 Example Conversations
```
You: "Create a new component for user authentication with email and password"
Bot: Creates LoginForm.tsx with full TypeScript types and validation

You: "Find all places where I'm using the old API endpoint"
Bot: Searches codebase and shows all occurrences

You: "Refactor my components folder - put each component in its own folder with CSS"
Bot: Restructures your project, moves files, updates imports

You: "My app crashes when user clicks submit, can you find and fix it?"
Bot: Reads your code, identifies the bug, and fixes it

You: "Add error handling to all my API calls"
Bot: Searches for API calls, adds try-catch blocks to each one
```

The bot thinks autonomously and uses multiple tools together to complete complex tasks!

## 📁 Project Structure

```
my-app/
├── src/                    # Frontend React app
│   ├── components/         # React components (organized by feature)
│   │   ├── Header/
│   │   ├── ChatContainer/
│   │   ├── MessageBubble/
│   │   ├── ChatInput/
│   │   └── CodeBlock/
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── App.tsx            # Main app component
├── server/                # Backend Express server
│   ├── agent.ts          # LangChain AI agent
│   ├── index.ts          # Express server setup
│   ├── repoTools.ts      # File system utilities
│   ├── prompts/          # AI system prompts
│   └── tools/            # Agent tool definitions
└── public/               # Static assets
```

## 🎨 Features in Detail

### Real-time Streaming
Messages stream in real-time using Server-Sent Events (SSE) for a smooth chat experience.

### Code Syntax Highlighting
Code blocks are automatically detected and displayed with syntax highlighting and copy functionality.

### Visual Feedback
- Animated progress bar during AI thinking
- Pulsing status indicator
- Typing animations
- Smooth message transitions

### Component Architecture
Each component is self-contained with its own TypeScript file and CSS module for maintainability.

## 🧪 Development

```bash
# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## 👨‍💻 Author

**Johny Shaik**
- GitHub: [@johnyheerashaik](https://github.com/johnyheerashaik)
