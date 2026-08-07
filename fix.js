const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'modules');

function fixDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixDirectory(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // My previous script replaced `../` with `../../`, turning sibling imports like `../auction` into `../../auction`.
      // We need to revert `../../auction` back to `../auction`, `../../bid` to `../bid`, etc.
      content = content.replace(/(from\s+['"])\.\.\/\.\.\/(auction|auction-registration|bid|bidding)/g, "$1../$2");
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

fixDirectory(modulesDir);
console.log('Fixed sibling module imports.');
