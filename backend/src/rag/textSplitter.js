/**
 * textSplitter.js
 * Splits documents into semantic chunks with section headers and metadata.
 */
const { cleanText } = require('./textCleaner');

function estimateTokenCount(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

function splitDocument(documentContent, maxChunkWords = 350) {
  const cleaned = cleanText(documentContent);
  const chunks = [];

  // Split by markdown headings
  const lines = cleaned.split('\n');
  let currentSection = 'General';
  let currentParagraphs = [];
  let currentWordCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is a header (# or ## or ###)
    const headerMatch = line.match(/^#{1,3}\s+(.*)/);
    if (headerMatch) {
      if (currentParagraphs.length > 0) {
        const chunkText = currentParagraphs.join('\n\n');
        chunks.push({
          section: currentSection,
          content: chunkText,
          tokenCount: estimateTokenCount(chunkText)
        });
        currentParagraphs = [];
        currentWordCount = 0;
      }
      currentSection = headerMatch[1].trim();
      continue;
    }

    const words = line.split(/\s+/).length;
    if (currentWordCount + words > maxChunkWords && currentParagraphs.length > 0) {
      const chunkText = currentParagraphs.join('\n\n');
      chunks.push({
        section: currentSection,
        content: chunkText,
        tokenCount: estimateTokenCount(chunkText)
      });
      currentParagraphs = [line];
      currentWordCount = words;
    } else {
      currentParagraphs.push(line);
      currentWordCount += words;
    }
  }

  if (currentParagraphs.length > 0) {
    const chunkText = currentParagraphs.join('\n\n');
    chunks.push({
      section: currentSection,
      content: chunkText,
      tokenCount: estimateTokenCount(chunkText)
    });
  }

  return chunks;
}

module.exports = {
  splitDocument,
  estimateTokenCount
};
