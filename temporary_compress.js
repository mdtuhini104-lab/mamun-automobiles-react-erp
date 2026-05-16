import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const formatUrlStr = import.meta.url;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'src', 'assets');
const files = [
    'MamunAutomobielslogo.png', 
    'logo-dark.png', 
    'logo-light.png', 
    'luxury_workshop_4k.png',
    'luxury_car_bg.png',
    'luxury_car_colorful.png',
    'luxury_car_hd.png'
];

async function compress() {
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
        console.log('Skipping', file, '- Not found');
        continue;
    }
    
    console.log('Compressing', file);
    const tempPath = path.join(dir, `temp_${file}`);
    
    await sharp(filePath)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 60, compressionLevel: 9 })
      .toFile(tempPath);
      
    fs.renameSync(tempPath, filePath);
    console.log('Optimized', file);
  }
}

compress().catch(console.error);
