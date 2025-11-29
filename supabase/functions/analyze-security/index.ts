import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { target, scanType, scanId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Extract and verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    // Create client to verify user
    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify scan ownership before updating
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('user_id')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      throw new Error('Scan not found');
    }

    if (scan.user_id !== user.id) {
      throw new Error('Unauthorized: You do not have permission to modify this scan');
    }

    console.log(`Starting security analysis for ${scanType}: ${target}`);

    // Update scan status to processing
    await supabase
      .from('scans')
      .update({ status: 'processing' })
      .eq('id', scanId);

    // Prepare system prompt for vulnerability analysis
    const systemPrompt = `You are an expert cybersecurity analyst specializing in vulnerability detection across all programming languages and file types. Analyze the provided target for security vulnerabilities following OWASP Top 10 and industry best practices.

SUPPORTED LANGUAGES AND FILES:
- JavaScript/TypeScript (Node.js, React, Vue, Angular)
- Python (Django, Flask, FastAPI)
- PHP (Laravel, WordPress, Symfony)
- Java (Spring, Jakarta EE)
- C#/.NET
- Go, Rust, C/C++
- Ruby (Rails)
- Shell scripts (bash, PowerShell)
- Configuration files (YAML, JSON, XML, TOML, .env)
- SQL scripts
- Docker, Kubernetes configs
- And more...

Focus on detecting:
1. SQL Injection vulnerabilities (all database types)
2. Cross-Site Scripting (XSS) - Reflected, Stored, DOM-based
3. Cross-Site Request Forgery (CSRF)
4. Insecure Authentication & Session Management
5. Sensitive Data Exposure (API keys, passwords, tokens)
6. XML External Entities (XXE)
7. Broken Access Control
8. Security Misconfiguration
9. Using Components with Known Vulnerabilities
10. Insufficient Logging & Monitoring
11. Command Injection
12. Path Traversal
13. Insecure Deserialization
14. Server-Side Request Forgery (SSRF)
15. Insecure Direct Object References
16. Missing Security Headers
17. Weak Cryptography
18. Race Conditions
19. Memory Safety Issues (for C/C++/Rust)
20. Type Confusion

LANGUAGE-SPECIFIC CHECKS:
- PHP: Check for include/require vulnerabilities, eval(), unserialize()
- JavaScript/TypeScript: Check for prototype pollution, dangerouslySetInnerHTML
- Python: Check for pickle, eval(), exec(), os.system()
- Java: Check for unsafe reflection, XML parsing
- C/C++: Buffer overflows, use-after-free, format strings
- SQL: Injection, privilege escalation
- Shell: Command injection, unsafe variable expansion

For each vulnerability found, provide:
- Type of vulnerability
- Severity level (critical, high, medium, low)
- Detailed description
- Specific location/code snippet
- Recommended fix with code examples in the same language

Return your analysis in JSON format with this structure:
{
  "vulnerabilities": [
    {
      "type": "string",
      "severity": "critical|high|medium|low",
      "title": "string",
      "description": "string",
      "location": "string",
      "recommendation": "string",
      "code_example": "string"
    }
  ],
  "summary": {
    "total": number,
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  },
  "overall_severity": "safe|warning|danger"
}`;

    // Detect file type and language
    const fileExtension = target.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript', 'jsx': 'JavaScript (React)', 'ts': 'TypeScript', 'tsx': 'TypeScript (React)',
      'py': 'Python', 'php': 'PHP', 'java': 'Java', 'go': 'Go', 'rs': 'Rust',
      'c': 'C', 'cpp': 'C++', 'cs': 'C#', 'rb': 'Ruby', 'kt': 'Kotlin', 'swift': 'Swift',
      'sh': 'Shell Script', 'bash': 'Bash Script', 'ps1': 'PowerShell',
      'sql': 'SQL', 'yml': 'YAML Config', 'yaml': 'YAML Config', 'json': 'JSON',
      'xml': 'XML', 'toml': 'TOML', 'ini': 'INI Config', 'env': 'Environment Config',
      'dockerfile': 'Docker', 'tf': 'Terraform'
    };
    const language = languageMap[fileExtension] || 'source code';

    const userPrompt = scanType === 'url' 
      ? `Analyze this URL for security vulnerabilities: ${target}\n\nPerform a comprehensive security scan checking for common web vulnerabilities, insecure configurations, potential attack vectors, exposed sensitive information, and API security issues.`
      : scanType === 'github'
        ? `Analyze this GitHub repository for security vulnerabilities: ${target}\n\nPerform a comprehensive security audit checking for exposed secrets, insecure dependencies, vulnerable code patterns, misconfigurations, and security best practices violations across all files in the repository.`
        : `Analyze this ${language} file for security vulnerabilities: ${target}\n\nPerform a deep code security analysis specific to ${language}, checking for:\n- Language-specific vulnerabilities\n- Insecure coding practices\n- Dangerous function usage\n- Input validation issues\n- Authentication/authorization flaws\n- Data exposure risks\n- Vulnerable dependencies\n- Configuration errors\n- Cryptographic weaknesses\n\nProvide detailed, actionable findings with code examples in ${language}.`;

    // Call Lovable AI for analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('AI Analysis completed:', analysisText);

    // Parse AI response
    let analysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysisResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback result if parsing fails
      analysisResult = {
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        overall_severity: 'safe'
      };
    }

    // Update scan with results
    const { error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'completed',
        severity: analysisResult.overall_severity || 'safe',
        vulnerabilities_count: analysisResult.summary?.total || 0,
        result: analysisResult
      })
      .eq('id', scanId);

    if (updateError) {
      console.error('Error updating scan:', updateError);
      throw updateError;
    }

    // Send email notification for critical vulnerabilities
    if (analysisResult.summary?.critical > 0) {
      console.log(`CRITICAL: ${analysisResult.summary.critical} critical vulnerabilities found in ${target}`);
      // TODO: Implement email notification system
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        scanId,
        result: analysisResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-security function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
