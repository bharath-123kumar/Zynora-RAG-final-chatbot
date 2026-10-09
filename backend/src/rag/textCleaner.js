/**
 * textCleaner.js
 * Normalizes text, removes unneeded control characters and standardizes whitespace.
 */

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Replace CRLF with LF
    .replace(/\r\n/g, '\n')
    // Remove control characters (except newline, tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize consecutive spaces/tabs
    .replace(/[ \t]+/g, ' ')
    // Normalize consecutive newlines to maximum 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripMarkdown(markdown) {
  if (!markdown) return '';
  return cleanText(
    markdown
      .replace(/^#+\s+/gm, '') // Remove heading hashes
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
  );
}

module.exports = {
  cleanText,
  stripMarkdown
};
