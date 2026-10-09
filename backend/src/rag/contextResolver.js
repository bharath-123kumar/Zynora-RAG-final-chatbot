/**
 * contextResolver.js
 * Resolves elliptical, anaphoric, or multi-turn follow-up questions using recent conversation context.
 * Conversation history only clarifies intent for retrieval; it never serves as unapproved factual evidence.
 */

const FOLLOW_UP_PATTERNS = [
  /^(what|who|which|how|where)\s+(comes|is|are|about|next|after|before)\b/i,
  /\b(after|before)\s+(hub|center|point|command|hq|node|zone|territory|region|nation)\b/i,
  /\b(it|its|this|that|these|those|they|them)\b/i,
  /^(and|also|what about|how about|explain more|tell me more|details)\b/i,
  /^(who|what)\s+operates\b/i,
  /\bdelivery\s+speed\b/i
];

function isFollowUp(query) {
  const trimmed = query.trim();
  for (const pattern of FOLLOW_UP_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

function resolveContextualQuery(currentQuery, conversationHistory = []) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return currentQuery;
  }

  const isFollow = isFollowUp(currentQuery);
  if (!isFollow) {
    return currentQuery;
  }

  // Scan recent history in reverse
  const recentMessages = conversationHistory.slice(-4);
  const contextTokens = [];

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const text = msg.content || '';
    
    if (/physical|franchise|facility|facilities|point|center|hub|command|hq/i.test(text)) {
      contextTokens.push('physical franchise hierarchy');
    }
    if (/digital|node|zone|territory|region|nation/i.test(text)) {
      contextTokens.push('digital franchise hierarchy');
    }
    if (/express transit|delivery|speed|linehaul/i.test(text)) {
      contextTokens.push('Zyngram Express Transit');
    }
    if (/shift|hours|operations|facilities|working/i.test(text)) {
      contextTokens.push('workplace shift operations');
    }
  }

  // Special disambiguation for digital tiers: Node, Zone, Territory, Region, Nation
  if (/\b(node|zone|territory|region|nation)\b/i.test(currentQuery)) {
    contextTokens.push('digital franchise hierarchy');
  }

  const uniqueContextTokens = [...new Set(contextTokens)];
  if (uniqueContextTokens.length > 0) {
    return `${currentQuery} (${uniqueContextTokens.join(' ')})`;
  }

  return currentQuery;
}

module.exports = {
  isFollowUp,
  resolveContextualQuery
};
