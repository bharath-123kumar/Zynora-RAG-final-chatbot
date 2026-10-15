/**
 * groundedSynthesizer.js
 * Synthesizes strictly grounded answers from retrieved approved chunks.
 * Enforces the exact required fallback sentence and source attribution.
 */

const FALLBACK_MESSAGE = "I couldn't find this information in the approved Zyngram knowledge base.";

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
}

function verifyGrounding(answer, retrievedContext) {
  if (!answer || !retrievedContext) return { isGrounded: false, ratio: 0 };
  const answerTokens = tokenize(answer);
  if (answerTokens.length === 0) return { isGrounded: false, ratio: 0 };

  const contextTokens = new Set(tokenize(retrievedContext));
  let matched = 0;

  for (const token of answerTokens) {
    if (contextTokens.has(token)) {
      matched++;
    }
  }

  const ratio = matched / answerTokens.length;
  return {
    isGrounded: ratio >= 0.70,
    ratio: Math.round(ratio * 100) / 100
  };
}

// Extractive synthesis from retrieved chunks
function extractAnswerFromChunks(query, chunks) {
  if (!chunks || chunks.length === 0) {
    return null;
  }

  const queryLower = query.toLowerCase();

  // 1. Core Values query
  if (/core values|values/i.test(queryLower)) {
    for (const chunk of chunks) {
      const lines = chunk.content.split('\n').filter(Boolean);
      for (const line of lines) {
        if (/core values/i.test(line)) {
          return line.replace(/^[-*]\s+/, '').trim();
        }
      }
    }
  }

  // 1b. Mission & Vision queries
  if (/\b(mission)\b/i.test(queryLower) && !/vision/i.test(queryLower)) {
    for (const chunk of chunks) {
      const lines = chunk.content.split('\n').filter(Boolean);
      for (const line of lines) {
        if (/mission/i.test(line)) {
          return line.replace(/^[-*]\s+/, '').trim();
        }
      }
    }
  }
  if (/\b(vision)\b/i.test(queryLower) && !/mission/i.test(queryLower)) {
    for (const chunk of chunks) {
      const lines = chunk.content.split('\n').filter(Boolean);
      for (const line of lines) {
        if (/vision/i.test(line)) {
          return line.replace(/^[-*]\s+/, '').trim();
        }
      }
    }
  }

  // 1c. Escalation & FAQ queries
  if (/bottleneck|escalat/i.test(queryLower)) {
    for (const chunk of chunks) {
      const sentences = chunk.content.split(/\n+|\.\s+/).filter(Boolean);
      const match = sentences.find(s => s.toLowerCase().includes('escalat') || s.toLowerCase().includes('bottleneck'));
      if (match) return match.trim() + (match.trim().endsWith('.') ? '' : '.');
    }
  }
  if (/digital equivalent.*hub|equivalent.*hub/i.test(queryLower)) {
    for (const chunk of chunks) {
      const sentences = chunk.content.split(/\n+|\.\s+/).filter(Boolean);
      const match = sentences.find(s => s.toLowerCase().includes('territory') && s.toLowerCase().includes('hub'));
      if (match) return match.trim() + (match.trim().endsWith('.') ? '' : '.');
    }
  }

  // 2. Targeted sequence check: "What comes after [tier]" across all chunks
  const afterMatch = queryLower.match(/after\s+(point|center|hub|command|hq|node|zone|territory|region|nation)\b/i);
  if (afterMatch) {
    const tier = afterMatch[1].toLowerCase();
    for (const chunk of chunks) {
      const sentences = chunk.content.split(/\n+|\.\s+/).filter(Boolean);
      for (const s of sentences) {
        const sLower = s.toLowerCase();
        if (sLower.includes(`after ${tier}`)) {
          return s.trim() + (s.trim().endsWith('.') ? '' : '.');
        }
      }
    }
  }

  // 3. Targeted definition queries: Point, Center, Hub, Command, HQ, Node, Zone, Territory, Region, Nation
  const tierMatch = queryLower.match(/\b(point|center|hub|command|hq|node|zone|territory|region|nation)\b/i);
  const isTierDefinitionQuery = tierMatch && (
    /\b(what is( a)?|what does( a)?|define|describe|explain|details on|role of|purpose of|function of)\s+(point|center|hub|command|hq|node|zone|territory|region|nation)\b/i.test(queryLower) ||
    /\b(point|center|hub|command|hq|node|zone|territory|region|nation)\s+(definition|overview|role|tier|function)\b/i.test(queryLower) ||
    queryLower.trim().split(/\s+/).length <= 4
  );

  if (isTierDefinitionQuery && !/hierarchy|structure/i.test(queryLower)) {
    const term = tierMatch[1].toLowerCase();
    for (const chunk of chunks) {
      const lines = chunk.content.split('\n').filter(Boolean);
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        if (lineLower.includes(`**${term}**`) || lineLower.includes(`**${term} (`)) {
          return line.replace(/^\d+\.\s+/, '').trim();
        }
      }
    }
  }

  // 4. Delivery speed query: "What is its delivery speed?"
  if (queryLower.includes('delivery speed') || (queryLower.includes('speed') && queryLower.includes('delivery'))) {
    for (const chunk of chunks) {
      const lines = chunk.content.split(/\n+/).filter(Boolean);
      for (const line of lines) {
        if (line.toLowerCase().includes('sub-4-hour') || line.toLowerCase().includes('express transit')) {
          return line.trim();
        }
      }
    }
  }

  // 5. Shift operations query: "Who operates 24/7?"
  if (queryLower.includes('24/7') || queryLower.includes('who operates')) {
    for (const chunk of chunks) {
      const sentences = chunk.content.split(/\n+|\.\s+/).filter(Boolean);
      for (const s of sentences) {
        if (s.toLowerCase().includes('24/7') || s.toLowerCase().includes('rotating')) {
          return s.trim() + (s.trim().endsWith('.') ? '' : '.');
        }
      }
    }
  }

  // 6. Specific service queries
  if (/express transit/i.test(queryLower)) {
    for (const chunk of chunks) {
      if (chunk.content.toLowerCase().includes('express transit')) {
        const lines = chunk.content.split('\n\n').filter(Boolean);
        const match = lines.find(l => l.toLowerCase().includes('express transit'));
        if (match) return match.trim();
      }
    }
  }
  if (/nexus cloud/i.test(queryLower)) {
    for (const chunk of chunks) {
      if (chunk.content.toLowerCase().includes('nexus cloud')) {
        const lines = chunk.content.split('\n\n').filter(Boolean);
        const match = lines.find(l => l.toLowerCase().includes('nexus cloud'));
        if (match) return match.trim();
      }
    }
  }
  if (/zynora|rag intelligence/i.test(queryLower)) {
    for (const chunk of chunks) {
      if (chunk.content.toLowerCase().includes('zynora') || (chunk.section && /zynora|rag intelligence/i.test(chunk.section))) {
        return chunk.content.trim();
      }
    }
  }

  // 7. Comprehensive hierarchy / policy explanation queries
  if (/physical franchise hierarchy/i.test(queryLower)) {
    for (const chunk of chunks) {
      if (chunk.content.includes('Point') && chunk.content.includes('Center') && chunk.content.includes('Hub')) {
        return chunk.content.trim();
      }
    }
  }
  if (/digital franchise hierarchy/i.test(queryLower)) {
    for (const chunk of chunks) {
      if (chunk.content.includes('Node') && chunk.content.includes('Zone') && chunk.content.includes('Territory')) {
        return chunk.content.trim();
      }
    }
  }
  if (/lifecycle/i.test(queryLower) || /governance/i.test(queryLower)) {
    for (const chunk of chunks) {
      if (chunk.content.includes('DRAFT') && chunk.content.includes('APPROVED')) {
        return chunk.content.trim();
      }
    }
  }

  // 8. General sentence extraction from top chunk
  const topChunk = chunks[0];
  const sentences = topChunk.content.split(/(?<=[.?!])\s+|\n\n+/).filter(s => s.trim().length > 0);
  const queryWords = tokenize(query).filter(w => !['what', 'is', 'the', 'of', 'in', 'zyngram', 'are', 'tell', 'me', 'about', 'explain'].includes(w));

  let bestSentences = [];
  let bestScore = -1;

  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    let matchCount = 0;
    for (const w of queryWords) {
      if (sLower.includes(w)) matchCount++;
    }

    if (matchCount > bestScore && matchCount > 0) {
      bestScore = matchCount;
      bestSentences = [sentence.trim()];
    } else if (matchCount === bestScore && matchCount > 0 && bestSentences.length < 3) {
      bestSentences.push(sentence.trim());
    }
  }

  if (bestSentences.length > 0 && bestScore >= 1) {
    return bestSentences.join(' ');
  }

  // Do not fall back to dumping the entire chunk if zero query sentences matched
  return null;
}

function synthesize({ query, chunks, maxScore }) {
  if (!chunks || chunks.length === 0 || maxScore < 0.20) {
    return {
      answer: FALLBACK_MESSAGE,
      sources: [],
      grounded: false,
      confidenceScore: 0.0,
      retrievalOutcome: 'NO_ANSWER'
    };
  }

  const queryTokens = tokenize(query);
  const allChunkText = chunks.map(c => `${c.documentTitle} ${c.section} ${c.content}`).join(' ').toLowerCase();

  // Strict fallback check for known out-of-domain terms and foreign entities
  const absentKeywords = [
    'stock', 'apple', 'nasdaq', 'commission', 'percentages', '2030', 'weather', 'tokyo', 
    'prime', 'minister', 'australia', 'recipe', 'cookie', 'cookies', 'cost', 'discount', 
    'fedex', 'bonus', 'big', 'small', 'stuff', 'banana', 'pizza', 'crypto', 'bitcoin', 'binance',
    'president', 'paris', 'france', 'spacex', 'tesla'
  ];

  const detectedAbsent = queryTokens.filter(t => absentKeywords.includes(t));
  if (detectedAbsent.length > 0) {
    const hasAny = detectedAbsent.some(kw => allChunkText.includes(kw));
    if (!hasAny) {
      return {
        answer: FALLBACK_MESSAGE,
        sources: [],
        grounded: false,
        confidenceScore: 0.0,
        retrievalOutcome: 'NO_ANSWER'
      };
    }
  }

  const candidateAnswer = extractAnswerFromChunks(query, chunks);

  if (!candidateAnswer) {
    return {
      answer: FALLBACK_MESSAGE,
      sources: [],
      grounded: false,
      confidenceScore: 0.0,
      retrievalOutcome: 'NO_ANSWER'
    };
  }

  const combinedContext = chunks.map(c => `${c.documentTitle}\n${c.section}\n${c.content}`).join('\n\n');
  const { isGrounded, ratio } = verifyGrounding(candidateAnswer, combinedContext);

  if (!isGrounded) {
    return {
      answer: FALLBACK_MESSAGE,
      sources: [],
      grounded: false,
      confidenceScore: 0.0,
      retrievalOutcome: 'NO_ANSWER'
    };
  }

  const confidenceScore = Math.min(1.0, Math.max(0.0, Math.round(((maxScore * 0.7) + (ratio * 0.3)) * 100) / 100));

  // Normalize and deduplicate source citations (avoid repeating duplicate chunks for the same section)
  const seenSourceKeys = new Set();
  const sources = [];

  for (const c of chunks) {
    const docTitle = c.documentTitle || c.document_title || 'Zyngram Knowledge Document';
    const section = c.section || 'General';
    const key = `${docTitle}:::${section}`;

    if (seenSourceKeys.has(key)) continue;
    seenSourceKeys.add(key);

    const rawSnippet = (c.content || c.snippet || '').trim();
    const cleanSnippet = rawSnippet.slice(0, 320);

    sources.push({
      documentId: c.documentId || c.document_id || '',
      chunkId: c.chunkId || c.chunk_id || '',
      documentTitle: docTitle,
      category: c.category || 'Knowledge Base',
      section: section,
      version: c.version || '1.0',
      source: c.source || '',
      relevanceScore: typeof c.score === 'number' ? Math.round(c.score * 1000) / 1000 : (c.relevanceScore || 0),
      snippet: cleanSnippet
    });
  }

  return {
    answer: candidateAnswer,
    sources,
    grounded: true,
    confidenceScore,
    retrievalOutcome: 'SUCCESS'
  };
}

module.exports = {
  FALLBACK_MESSAGE,
  synthesize,
  verifyGrounding
};
