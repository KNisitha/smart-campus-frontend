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

  // We want to find: ) : ( <table... or any place where table is not wrapped in overflow-x-auto
  // Actually, we can use a simpler regex or logic:
  // If we find <table without a preceding <div className=".*overflow-x-auto.*">
  
  // A naive but safer way: replace `<table className="w-full text-left border-collapse min-w-max">` with `<div className="overflow-x-auto">\n            <table className="w-full text-left border-collapse min-w-max">`
  // AND `</table>\n          )` with `</table>\n            </div>\n          )`
  
  // Let's just do a replace for the known exact admin code patterns:
  if (content.includes('<table className="w-full text-left border-collapse min-w-max">')) {
    // Check if it's already wrapped in overflow-x-auto
    const hasWrapper = content.includes('<div className="overflow-x-auto">\n            <table');
    if (!hasWrapper && !content.includes('<div className="overflow-x-auto"><table')) {
      content = content.replace(
        /(\s*)<table className="w-full text-left border-collapse min-w-max">([\s\S]*?)<\/table>/g,
        (match, spaces, inner) => {
          // check if it's already wrapped (sometimes the regex might be overzealous but we check first)
          return `${spaces}<div className="overflow-x-auto w-full">\n${spaces}  <table className="w-full text-left border-collapse min-w-max">${inner}</table>\n${spaces}</div>`;
        }
      );
      changed = true;
    }
  }

  // Also replace grid-cols-2 md:grid-cols-4 with grid-cols-1 sm:grid-cols-2 md:grid-cols-4
  if (content.includes('grid-cols-2 md:grid-cols-4')) {
    content = content.replace(/grid-cols-2 md:grid-cols-4/g, 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4');
    changed = true;
  }
  
  // Also grid grid-cols-2 md:grid-cols-3
  if (content.includes('grid-cols-2 md:grid-cols-3')) {
    content = content.replace(/grid-cols-2 md:grid-cols-3/g, 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3');
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
