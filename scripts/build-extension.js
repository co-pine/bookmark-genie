import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

// 复制manifest.json到dist目录
if (fs.existsSync(path.join(publicDir, 'manifest.json'))) {
  fs.copyFileSync(
    path.join(publicDir, 'manifest.json'),
    path.join(distDir, 'manifest.json')
  );
  console.log('✅ Manifest文件已复制');
}

// 创建icons目录和占位图标
const iconsDir = path.join(distDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('✅ Chrome扩展构建完成！');
console.log('📁 扩展文件位于: dist/');
console.log('🚀 可以在Chrome中加载dist目录作为未打包的扩展');