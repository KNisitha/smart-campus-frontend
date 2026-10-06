import fs from 'fs';
import path from 'path';

const searchDirs = [
  'c:/Users/Nisitha/Desktop/frontend1/src/pages/admin',
  'c:/Users/Nisitha/Desktop/frontend1/src/pages/faculty',
  'c:/Users/Nisitha/Desktop/frontend1/src/pages/student'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Find grids that start with grid-cols-2 directly without grid-cols-1 or sm:
  // e.g., className="grid grid-cols-2 lg:grid-cols-4
  // className="grid grid-cols-2 md:grid-cols-5
  // We want to replace grid-cols-2 with grid-cols-1 sm:grid-cols-2 IF it's preceded by "grid "
  
  const regex = /className="([^"]*?)grid grid-cols-2( md:| lg:| xl:| gap-)/g;
  if (regex.test(content)) {
    content = content.replace(regex, 'className="$1grid grid-cols-1 sm:grid-cols-2$2');
    changed = true;
  }
  
  // What about "sm:align-middle sm:max-w-lg sm:w-full"? Let's add w-full to mobile as well just in case.
  // className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
  // Just add w-full before sm:w-full if not present.
  const modalRegex = /className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-([^"]*?) sm:w-full"/g;
  if (modalRegex.test(content)) {
    // replace with w-full added
    content = content.replace(modalRegex, 'className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:my-8 sm:align-middle sm:max-w-$1 sm:w-full"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

searchDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.jsx')) {
        processFile(path.join(dir, file));
      }
    });
  }
});
