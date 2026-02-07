import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn('[Anthropic] ANTHROPIC_API_KEY not set — AI features will be unavailable');
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export default anthropic;
