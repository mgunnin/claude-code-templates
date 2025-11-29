import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to components directory
const COMPONENTS_DIR = path.join(__dirname, '..', '..', 'cli-tool', 'components');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { type } = req.query;
    
    const categories = {};
    
    // Get categories for each component type
    const componentTypes = ['agents', 'commands', 'mcps', 'settings', 'hooks', 'skills'];
    
    for (const componentType of componentTypes) {
      const typePath = path.join(COMPONENTS_DIR, componentType);
      
      if (!fs.existsSync(typePath)) {
        categories[componentType] = [];
        continue;
      }
      
      const dirs = fs.readdirSync(typePath)
        .filter(item => {
          const itemPath = path.join(typePath, item);
          return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
        })
        .sort();
      
      categories[componentType] = dirs;
    }
    
    // For plugins, check marketplace.json
    const marketplacePath = path.join(__dirname, '..', '..', '.claude-plugin', 'marketplace.json');
    if (fs.existsSync(marketplacePath)) {
      try {
        const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf-8'));
        const pluginNames = (marketplace.plugins || []).map(p => p.name || p.id).filter(Boolean);
        categories['plugins'] = pluginNames;
      } catch (e) {
        categories['plugins'] = [];
      }
    } else {
      categories['plugins'] = [];
    }
    
    // If specific type requested, return only that
    if (type && categories[type]) {
      return res.status(200).json({
        success: true,
        type,
        categories: categories[type]
      });
    }
    
    // Return all categories
    return res.status(200).json({
      success: true,
      categories
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      error: 'Failed to fetch categories',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

