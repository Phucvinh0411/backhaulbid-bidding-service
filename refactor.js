const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const modulesDir = path.join(srcDir, 'modules');

if (!fs.existsSync(modulesDir)) {
  fs.mkdirSync(modulesDir);
}

const foldersToMove = ['auction', 'auction-registration', 'bid', 'bidding'];

// Move folders
for (const folder of foldersToMove) {
  const oldPath = path.join(srcDir, folder);
  const newPath = path.join(modulesDir, folder);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

// Update imports in all files inside modules/
function processDirectory(dir, depth = 1) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath, depth + 1);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Update relative imports going up
      // If it imports from '../../common' it should become '../../../common'
      // If it imports from '../common' it should become '../../common'
      // If it imports from '../openapi' it should become '../../openapi'
      
      content = content.replace(/(from\s+['"])(\.\.\/)+/g, (match, p1, p2, offset, str) => {
        // Count how many '../' are in the match
        const count = match.split('../').length - 1;
        // We add one more '../' because the file moved one level deeper into 'modules/'
        return p1 + '../'.repeat(count + 1);
      });
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDirectory(modulesDir);

// Update app.module.ts
const appModulePath = path.join(srcDir, 'app.module.ts');
if (fs.existsSync(appModulePath)) {
  let content = fs.readFileSync(appModulePath, 'utf8');
  content = content.replace(/from '\.\/(auction|auction-registration|bid|bidding)/g, "from './modules/$1");
  fs.writeFileSync(appModulePath, content, 'utf8');
}

console.log('Refactoring completed successfully.');
