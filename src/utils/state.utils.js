const fs = require('fs');
const path = require('path');

const STATE_DIR = path.resolve(__dirname, '../../state');
const STATE_FILE = path.join(STATE_DIR, 'sent-files.json');

function ensureStateFile() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ sent: [] }, null, 2)
    );
  }
}

function loadSentFiles() {
  ensureStateFile();
  const raw = fs.readFileSync(STATE_FILE, 'utf8');
  return new Set(JSON.parse(raw).sent);
}

function markAsSent(fileName) {
  ensureStateFile();
  const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

  if (!data.sent.includes(fileName)) {
    data.sent.push(fileName);
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  }
}

module.exports = {
  loadSentFiles,
  markAsSent
};
