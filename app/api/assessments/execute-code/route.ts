import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple in-memory execution cache (in production, use Redis or similar)
const executionCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Language configurations
const LANGUAGE_CONFIGS = {
  javascript: {
    execute: async (code: string, input: string): Promise<{ output: string; error?: string; executionTime?: number }> => {
      try {
        // Create a safe execution context
        const startTime = Date.now();
        
        // Wrap the user code in a try-catch and provide input
        const wrappedCode = `
          try {
            const input = ${JSON.stringify(input)};
            ${code}
            
            // Try to call solution function if it exists
            if (typeof solution === 'function') {
              const result = solution(input);
              if (typeof result === 'object') {
                console.log(JSON.stringify(result));
              } else {
                console.log(String(result));
              }
            }
          } catch (error) {
            console.error('Error:', error.message);
          }
        `;
        
        // Execute in a sandboxed environment (simplified for demo)
        // In production, use proper sandboxing like vm2, Docker containers, or online judge service
        const output = await executeJavaScript(wrappedCode);
        const executionTime = Date.now() - startTime;
        
        return { output, executionTime };
      } catch (error) {
        return { 
          output: "", 
          error: error instanceof Error ? error.message : "Unknown execution error" 
        };
      }
    }
  },
  
  python: {
    execute: async (code: string, input: string): Promise<{ output: string; error?: string; executionTime?: number }> => {
      try {
        const startTime = Date.now();
        
        // For Python, we'd typically use a Python execution service
        // For now, return a mock response
        const output = `Python execution not yet implemented.\\nInput: ${input}\\nCode length: ${code.length} characters`;
        const executionTime = Date.now() - startTime;
        
        return { output, executionTime };
      } catch (error) {
        return { 
          output: "", 
          error: error instanceof Error ? error.message : "Python execution error" 
        };
      }
    }
  },
  
  java: {
    execute: async (code: string, input: string): Promise<{ output: string; error?: string; executionTime?: number }> => {
      try {
        const startTime = Date.now();
        
        // For Java, we'd compile and run using JDK
        // For now, return a mock response
        const output = `Java execution not yet implemented.\\nInput: ${input}\\nCode length: ${code.length} characters`;
        const executionTime = Date.now() - startTime;
        
        return { output, executionTime };
      } catch (error) {
        return { 
          output: "", 
          error: error instanceof Error ? error.message : "Java execution error" 
        };
      }
    }
  },
  
  cpp: {
    execute: async (code: string, input: string): Promise<{ output: string; error?: string; executionTime?: number }> => {
      try {
        const startTime = Date.now();
        
        // For C++, we'd compile with g++ and run
        // For now, return a mock response
        const output = `C++ execution not yet implemented.\\nInput: ${input}\\nCode length: ${code.length} characters`;
        const executionTime = Date.now() - startTime;
        
        return { output, executionTime };
      } catch (error) {
        return { 
          output: "", 
          error: error instanceof Error ? error.message : "C++ execution error" 
        };
      }
    }
  },
  
  typescript: {
    execute: async (code: string, input: string): Promise<{ output: string; error?: string; executionTime?: number }> => {
      try {
        const startTime = Date.now();
        
        // For TypeScript, we'd transpile and then execute as JavaScript
        // For now, return a mock response
        const output = `TypeScript execution not yet implemented.\\nInput: ${input}\\nCode length: ${code.length} characters`;
        const executionTime = Date.now() - startTime;
        
        return { output, executionTime };
      } catch (error) {
        return { 
          output: "", 
          error: error instanceof Error ? error.message : "TypeScript execution error" 
        };
      }
    }
  }
};

// Simplified JavaScript execution (in production, use proper sandboxing)
async function executeJavaScript(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Capture console.log output
      const originalLog = console.log;
      const originalError = console.error;
      let output = "";
      
      console.log = (...args) => {
        output += args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ') + '\\n';
      };
      
      console.error = (...args) => {
        output += 'ERROR: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ') + '\\n';
      };
      
      // Execute the code in a safe context
      const func = new Function(code);
      func();
      
      // Restore console methods
      console.log = originalLog;
      console.error = originalError;
      
      resolve(output.trim());
    } catch (error) {
      reject(error);
    }
  });
}

// Rate limiting to prevent abuse
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 executions per minute
const userRequests = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = userRequests.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    userRequests.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { code, language, input } = await req.json();
    
    if (!code || !language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 }
      );
    }
    
    // Get user ID for rate limiting (from auth token or session)
    const cookieToken = cookies().get('auth-token')?.value;
    const userId = cookieToken || 'anonymous';
    
    // Check rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before executing more code." },
        { status: 429 }
      );
    }
    
    // Check cache
    const cacheKey = `${userId}:${language}:${code.slice(0, 100)}:${input}`;
    const cached = executionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json(cached.result);
    }
    
    // Get language configuration
    const langConfig = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];
    if (!langConfig) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }
    
    // Execute code with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Execution timeout")), 10000); // 10 second timeout
    });
    
    const executionPromise = langConfig.execute(code, input || "");
    
    const result = await Promise.race([executionPromise, timeoutPromise]) as {
      output: string;
      error?: string;
      executionTime?: number;
    };
    
    // Cache the result
    executionCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries
    if (executionCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of executionCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          executionCache.delete(key);
        }
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("Code execution error:", error);
    
    if (error instanceof Error && error.message === "Execution timeout") {
      return NextResponse.json(
        { error: "Code execution timed out (10 second limit)" },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
