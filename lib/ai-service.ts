// lib/ai-service.ts
import { Tables } from './database.types';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL; 'https://api.groq.com/openai/v1/chat/completions';

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Helper function to make API calls to Groq
 */
async function callGroqAPI(messages: any[]): Promise<AIResponse> {
  try {
    if (!GROQ_API_KEY) {
      return {
        success: false,
        error: 'GROQ API key not found',
      };
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: JSON.parse(data.choices[0].message.content),
    };
  } catch (error: any) {
    console.error('Error calling Groq API:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Generate AI optimized budget based on user's spending history
 */
export async function generateOptimizedBudget(
  expenses: Tables<'expenses'>[],
  income: Tables<'income'>[],
  categories: Tables<'categories'>[]
): Promise<AIResponse> {
  const messages = [
    {
      role: 'system',
      content: `You are a financial assistant that helps students optimize their budgets.
      Analyze the student's expense patterns and income to create an optimized monthly budget.
      Return the budget as a JSON object with category allocations.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        expenses,
        income,
        categories,
      }),
    },
  ];

  return callGroqAPI(messages);
}

/**
 * Generate spending insights based on user's transaction history
 */
export async function generateSpendingInsights(
  expenses: Tables<'expenses'>[],
  budgets: Tables<'budgets'>[]
): Promise<AIResponse> {
  const messages = [
    {
      role: 'system',
      content: `You are a financial assistant that helps students understand their spending habits.
      Analyze the student's expenses and provide insights on spending patterns, potential savings,
      and areas of concern. Return insights as a JSON array of insight objects.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        expenses,
        budgets,
      }),
    },
  ];

  return callGroqAPI(messages);
}

/**
 * Generate savings recommendations
 */
export async function generateSavingsRecommendations(
  expenses: Tables<'expenses'>[],
  budgets: Tables<'budgets'>[],
  savingsGoals: Tables<'savings_goals'>[]
): Promise<AIResponse> {
  const messages = [
    {
      role: 'system',
      content: `You are a financial assistant that helps students save money.
      Analyze the student's expenses, budgets, and savings goals to provide
      specific, actionable recommendations for saving money and reaching their goals.
      Return recommendations as a JSON array of recommendation objects.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        expenses,
        budgets,
        savingsGoals,
      }),
    },
  ];

  return callGroqAPI(messages);
}

/**
 * Generate financial forecasts based on current spending and saving habits
 */
export async function generateFinancialForecast(
  expenses: Tables<'expenses'>[],
  income: Tables<'income'>[],
  savingsGoals: Tables<'savings_goals'>[]
): Promise<AIResponse> {
  const messages = [
    {
      role: 'system',
      content: `You are a financial assistant that helps students plan for the future.
      Analyze the student's expenses, income, and savings goals to create financial
      projections for the next 6 months. Consider recurring expenses, income patterns,
      and savings targets. Return the forecast as a JSON object with monthly projections.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        expenses,
        income,
        savingsGoals,
      }),
    },
  ];

  return callGroqAPI(messages);
}

/**
 * Generate expense categorization suggestions
 */
export async function categorizeExpense(
  description: string,
  amount: number,
  categories: Tables<'categories'>[]
): Promise<AIResponse> {
  const messages = [
    {
      role: 'system',
      content: `You are a financial assistant that helps categorize expenses.
      Given an expense description and amount, suggest the most appropriate
      category from the provided list. Return a single category ID.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        description,
        amount,
        categories,
      }),
    },
  ];

  return callGroqAPI(messages);
}

/**
 * Generate spending alerts based on budget thresholds
 */
export async function generateAlerts(
  budgets: Tables<'budgets'>[],
  expenses: Tables<'expenses'>[],
  budgetAllocations: any[]
): Promise<AIResponse> {
  const messages = [
    {
      role: 'system',
      content: `You are a financial assistant that helps students stay on budget.
      Analyze the student's budgets, allocations, and expenses to identify categories
      where spending is approaching or exceeding budget limits. Generate appropriate
      alerts with helpful messages. Return alerts as a JSON array.`,
    },
    {
      role: 'user',
      content: JSON.stringify({
        budgets,
        expenses,
        budgetAllocations,
      }),
    },
  ];

  return callGroqAPI(messages);
}