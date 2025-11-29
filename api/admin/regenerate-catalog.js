import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const projectRoot = path.join(__dirname, '..', '..');
    const scriptPath = path.join(projectRoot, 'generate_components_json.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        error: 'Catalog generation script not found',
        path: scriptPath
      });
    }
    
    // Execute Python script
    console.log('🔄 Regenerating components.json catalog...');
    
    const output = execSync(`python3 "${scriptPath}"`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 60000, // 60 second timeout
      stdio: 'pipe'
    });
    
    console.log('✅ Catalog regenerated successfully');
    console.log(output);
    
    return res.status(200).json({
      success: true,
      message: 'Catalog regenerated successfully',
      output: output.split('\n').slice(-20) // Last 20 lines
    });
    
  } catch (error) {
    console.error('Error regenerating catalog:', error);
    
    // Try to extract stderr if available
    const errorMessage = error.stderr || error.message || 'Unknown error';
    
    return res.status(500).json({
      error: 'Failed to regenerate catalog',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

