import Anthropic from '@anthropic-ai/sdk';
import anthropic from '../../lib/anthropic';
import {
  FINANCIAL_ADVISOR_SYSTEM_PROMPT,
  INSIGHT_GENERATOR_SYSTEM_PROMPT,
  GOAL_PARSER_SYSTEM_PROMPT,
} from './prompt-templates';
import { FinancialSummary } from './financial-summarizer';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeneratedInsight {
  insightType: 'spending_anomaly' | 'savings_opportunity' | 'investment_observation';
  title: string;
  content: string;
  priority: number;
}

export interface ParsedGoal {
  name: string | null;
  targetAmount: number | null;
  deadline: string | null;
  confidence: number;
}

export interface StreamChunk {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_stop';
  content?: string;
}

/**
 * Stream chat response from Claude with financial context
 */
export async function* streamChatResponse(
  conversationHistory: ChatMessage[],
  financialSummary: FinancialSummary,
  userMessage: string
): AsyncGenerator<StreamChunk> {
  // Build system prompt with financial summary injected
  const systemPrompt = FINANCIAL_ADVISOR_SYSTEM_PROMPT.replace(
    '{{FINANCIAL_SUMMARY}}',
    JSON.stringify(financialSummary, null, 2)
  );

  // Build messages array
  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: userMessage,
    },
  ];

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        yield { type: 'content_block_start' };
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield {
            type: 'content_block_delta',
            content: event.delta.text,
          };
        }
      } else if (event.type === 'content_block_stop') {
        yield { type: 'content_block_stop' };
      } else if (event.type === 'message_stop') {
        yield { type: 'message_stop' };
      }
    }
  } catch (error) {
    console.error('Claude streaming error:', error);
    throw new Error('Failed to generate chat response');
  }
}

/**
 * Generate pre-loaded insights from financial summary
 */
export async function generateInsightsFromSummary(
  financialSummary: FinancialSummary
): Promise<GeneratedInsight[]> {
  const systemPrompt = INSIGHT_GENERATOR_SYSTEM_PROMPT.replace(
    '{{FINANCIAL_SUMMARY}}',
    JSON.stringify(financialSummary, null, 2)
  );

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Analyze this financial data and generate 3-5 high-impact insights.',
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON response
    const insights = JSON.parse(textContent.text) as GeneratedInsight[];
    return insights;
  } catch (error) {
    console.error('Insight generation error:', error);
    throw new Error('Failed to generate insights');
  }
}

/**
 * Parse goal details from freeform user input
 */
export async function parseGoalFromText(
  userInput: string,
  conversationContext?: string
): Promise<ParsedGoal | null> {
  let systemPrompt = GOAL_PARSER_SYSTEM_PROMPT.replace('{{USER_INPUT}}', userInput);

  if (conversationContext) {
    systemPrompt = systemPrompt.replace('{{CONVERSATION_CONTEXT}}', conversationContext);
  } else {
    systemPrompt = systemPrompt.replace(
      '{{CONVERSATION_CONTEXT}}',
      'No prior conversation context.'
    );
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userInput,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON response
    const parsedGoal = JSON.parse(textContent.text) as ParsedGoal;

    // Return null if confidence is too low
    if (parsedGoal.confidence < 0.5) {
      return null;
    }

    return parsedGoal;
  } catch (error) {
    console.error('Goal parsing error:', error);
    return null;
  }
}
