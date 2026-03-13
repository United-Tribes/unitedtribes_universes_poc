const fs = require('fs');
const path = require('path');
const base = '/Users/j.d.heilprin/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos';
const folders = fs.readdirSync(base);
const index = {};
let count = 0;
for (const f of folders) {
  const mp = path.join(base, f, 'metadata.json');
  if (fs.existsSync(mp)) {
    try {
      const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
      if (m.video_id) {
        index[m.video_id] = { title: m.title || m.original_title || '', channel: m.channel || '', folder: f };
        count++;
      }
    } catch(e) {}
  }
}
fs.writeFileSync(path.join(__dirname, 'video-index.json'), JSON.stringify(index, null, 2));
console.log('Indexed ' + count + ' videos');
