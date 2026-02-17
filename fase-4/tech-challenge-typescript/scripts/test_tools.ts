import pythonTools from '../src/services/pythonTools.js';
import * as extractModule from '../src/services/extract_audio_from_video.js';
import * as transcribeModule from '../src/services/transcribe_audio_to_text.js';

console.log('pythonTools keys:', Object.keys(pythonTools));
console.log('extractAudio function exists:', typeof extractModule.extract === 'function');
console.log('transcribe function exists:', typeof transcribeModule.transcribe === 'function');

(async () => {
  try {
    console.log('Calling tool wrappers (no actual files provided) to ensure functions are callable');
    // We won't call extraction/transcription to avoid file errors; just ensure functions are defined
    if (typeof pythonTools.extractAudioFromVideo === 'function') console.log('extractAudioFromVideo tool available');
    if (typeof pythonTools.transcribeAudioToText === 'function') console.log('transcribeAudioToText tool available');
  } catch (err) {
    console.error('Erro no teste:', err);
    process.exit(1);
  }
})();
