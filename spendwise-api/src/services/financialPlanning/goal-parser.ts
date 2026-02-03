import { PrismaClient, SavingsGoal } from '@prisma/client';
import { parseGoalFromText } from './claude-client';

/**
 * Parse freeform text and create a savings goal if extraction is successful
 */
export async function parseAndCreateGoal(
  prisma: PrismaClient,
  userId: string,
  userInput: string,
  conversationContext?: string
): Promise<SavingsGoal | null> {
  // Parse the goal using Claude
  const parsedGoal = await parseGoalFromText(userInput, conversationContext);

  if (!parsedGoal || !parsedGoal.name || !parsedGoal.targetAmount) {
    return null;
  }

  // Create the savings goal
  const savingsGoal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: parsedGoal.name,
      targetAmount: parsedGoal.targetAmount,
      currentAmount: 0,
      deadline: parsedGoal.deadline ? new Date(parsedGoal.deadline) : null,
    },
  });

  return savingsGoal;
}
