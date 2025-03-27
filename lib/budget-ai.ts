// lib/budget-ai.ts
import { Tables } from './database.types';
import { getExpenses, getIncome, getCategories } from './supabase';

/**
 * Generates an optimized budget allocation based on previous spending
 * and income history.
 * 
 * @returns An object with allocations for each category
 */
export async function generateSmartBudget(totalBudget: number, period: string = 'monthly') {
  try {
    // Get expense history for the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const filters = {
      start_date: threeMonthsAgo.toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    };
    
    // Fetch expense and income history, plus all categories
    const [expensesData, incomeData, categoriesData] = await Promise.all([
      getExpenses(filters),
      getIncome(filters),
      getCategories()
    ]);
    
    // No historical data - distribute budget evenly
    if (!expensesData || expensesData.length === 0) {
      return distributeEvenly(totalBudget, categoriesData);
    }
    
    // Calculate average spending by category
    const categoryTotals = {};
    let totalSpent = 0;
    
    // Sum up spending by category
    expensesData.forEach(expense => {
      const catId = expense.category_id;
      if (!catId) return;
      
      categoryTotals[catId] = categoryTotals[catId] || 0;
      categoryTotals[catId] += Number(expense.amount);
      totalSpent += Number(expense.amount);
    });
    
    // If no spending found, distribute evenly
    if (totalSpent === 0) {
      return distributeEvenly(totalBudget, categoriesData);
    }
    
    // Calculate suggested allocation based on spending pattern
    const suggestedAllocations = [];
    
    // First pass - allocate based on historical percentages
    categoriesData.forEach(category => {
      const historicalSpending = categoryTotals[category.id] || 0;
      const spendingPercentage = (historicalSpending / totalSpent);
      let recommendedAmount = spendingPercentage * totalBudget;
      
      // Handle special categories - apply smart rules
      if (category.name === 'Housing' || category.name === 'Rent') {
        // Housing should not exceed 30% of budget as a rule of thumb
        recommendedAmount = Math.min(recommendedAmount, totalBudget * 0.3);
      } else if (category.name === 'Savings') {
        // Always allocate at least 10% to savings if possible
        recommendedAmount = Math.max(recommendedAmount, totalBudget * 0.1);
      } else if (category.name === 'Entertainment' || category.name === 'Shopping') {
        // Discretionary spending should be limited if tight budget
        if (totalBudget < totalSpent) {
          recommendedAmount = recommendedAmount * 0.7; // Reduce by 30%
        }
      }
      
      suggestedAllocations.push({
        category_id: category.id,
        category: category,
        amount: recommendedAmount,
        percentage: (recommendedAmount / totalBudget) * 100
      });
    });
    
    // Second pass - ensure we don't exceed the budget
    const totalAllocated = suggestedAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    
    if (totalAllocated > totalBudget) {
      // Scale all allocations down proportionally
      const scaleFactor = totalBudget / totalAllocated;
      suggestedAllocations.forEach(alloc => {
        alloc.amount = alloc.amount * scaleFactor;
        alloc.percentage = (alloc.amount / totalBudget) * 100;
      });
    }
    
    return suggestedAllocations;
  } catch (error) {
    console.error('Error generating smart budget:', error);
    // Fetch categories and distribute evenly as a fallback
    const categoriesData = await getCategories();
    return distributeEvenly(totalBudget, categoriesData);
  }
}

/**
 * Distributes the budget evenly across all categories
 */
function distributeEvenly(totalBudget: number, categories: Tables<'categories'>[]) {
  if (!categories || categories.length === 0) {
    return [];
  }
  
  const amountPerCategory = totalBudget / categories.length;
  const percentage = 100 / categories.length;
  
  return categories.map(category => ({
    category_id: category.id,
    category: category,
    amount: amountPerCategory,
    percentage: percentage
  }));
}

/**
 * Applies 50-30-20 rule to budget (50% needs, 30% wants, 20% savings)
 */
export async function apply5030Rule(totalBudget: number) {
  try {
    // Get all categories
    const categoriesData = await getCategories();
    
    // Group categories
    const needs = [];
    const wants = [];
    const savings = [];
    
    // Categorize based on name
    categoriesData.forEach(category => {
      const name = category.name.toLowerCase();
      
      // Needs categories
      if (
        name.includes('housing') || 
        name.includes('rent') || 
        name.includes('utilities') ||
        name.includes('food') || 
        name.includes('groceries') ||
        name.includes('transport') ||
        name.includes('health') ||
        name.includes('insurance') ||
        name.includes('debt')
      ) {
        needs.push(category);
      }
      // Savings/Investment categories
      else if (
        name.includes('savings') || 
        name.includes('emergency') ||
        name.includes('retirement') ||
        name.includes('investment')
      ) {
        savings.push(category);
      }
      // Everything else is wants
      else {
        wants.push(category);
      }
    });
    
    const allocations = [];
    
    // 50% for needs
    const needsTotal = totalBudget * 0.5;
    const needsPerCategory = needs.length > 0 ? needsTotal / needs.length : 0;
    
    needs.forEach(category => {
      allocations.push({
        category_id: category.id,
        category: category,
        amount: needsPerCategory,
        percentage: (needsPerCategory / totalBudget) * 100
      });
    });
    
    // 30% for wants
    const wantsTotal = totalBudget * 0.3;
    const wantsPerCategory = wants.length > 0 ? wantsTotal / wants.length : 0;
    
    wants.forEach(category => {
      allocations.push({
        category_id: category.id,
        category: category,
        amount: wantsPerCategory,
        percentage: (wantsPerCategory / totalBudget) * 100
      });
    });
    
    // 20% for savings
    const savingsTotal = totalBudget * 0.2;
    const savingsPerCategory = savings.length > 0 ? savingsTotal / savings.length : 0;
    
    savings.forEach(category => {
      allocations.push({
        category_id: category.id,
        category: category,
        amount: savingsPerCategory,
        percentage: (savingsPerCategory / totalBudget) * 100
      });
    });
    
    // If any group has no categories, redistribute to others
    if (needs.length === 0 && (wants.length > 0 || savings.length > 0)) {
      // Redistribute needs percentage
      const redistPercent = 0.5 / (wants.length > 0 && savings.length > 0 ? 2 : 1);
      
      if (wants.length > 0) {
        const extraPerWant = (totalBudget * redistPercent) / wants.length;
        allocations.filter(a => wants.some(w => w.id === a.category_id)).forEach(a => {
          a.amount += extraPerWant;
          a.percentage = (a.amount / totalBudget) * 100;
        });
      }
      
      if (savings.length > 0) {
        const extraPerSavings = (totalBudget * redistPercent) / savings.length;
        allocations.filter(a => savings.some(s => s.id === a.category_id)).forEach(a => {
          a.amount += extraPerSavings;
          a.percentage = (a.amount / totalBudget) * 100;
        });
      }
    }
    
    return allocations;
  } catch (error) {
    console.error('Error applying 50-30-20 rule:', error);
    // Fallback to even distribution
    const categoriesData = await getCategories();
    return distributeEvenly(totalBudget, categoriesData);
  }
}

/**
 * Generates budget insights based on spending history
 */
export async function generateBudgetInsights(userId: string, budgetId?: string) {
  try {
    // Get expense history for the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const filters = {
      start_date: threeMonthsAgo.toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      budget_id: budgetId
    };
    
    const expensesData = await getExpenses(filters);
    
    if (!expensesData || expensesData.length === 0) {
      return [{
        user_id: userId,
        budget_id: budgetId,
        insight_type: 'information',
        description: 'Not enough spending history to generate insights. Add more expenses to get personalized recommendations.'
      }];
    }
    
    const insights = [];
    const categorySpending = {};
    
    // Analyze spending by category
    expensesData.forEach(expense => {
      const catId = expense.category_id;
      if (!catId) return;
      
      categorySpending[catId] = categorySpending[catId] || {
        total: 0,
        expenses: []
      };
      
      categorySpending[catId].total += Number(expense.amount);
      categorySpending[catId].expenses.push(expense);
    });
    
    // Find top spending categories
    const categories = Object.entries(categorySpending)
      .map(([id, data]) => ({ 
        id, 
        total: data.total,
        count: data.expenses.length
      }))
      .sort((a, b) => b.total - a.total);
    
    if (categories.length > 0) {
      const topCategory = categories[0];
      
      insights.push({
        user_id: userId,
        budget_id: budgetId,
        insight_type: 'spending_pattern',
        description: `Your highest spending category is ${
          expensesData.find(e => e.category_id === topCategory.id)?.categories?.name || 'Unknown'
        } with ${formatCurrency(topCategory.total)} spent over the past 3 months.`
      });
    }
    
    // Look for frequent small expenses that add up
    const frequentSmallExpenses = Object.entries(categorySpending)
      .filter(([_, data]) => {
        const avgAmount = data.total / data.expenses.length;
        return data.expenses.length >= 10 && avgAmount < 20; // At least 10 expenses averaging < $20
      })
      .map(([id, data]) => ({
        id,
        total: data.total,
        count: data.expenses.length,
        avg: data.total / data.expenses.length
      }))
      .sort((a, b) => b.total - a.total);
    
    if (frequentSmallExpenses.length > 0) {
      const topFrequent = frequentSmallExpenses[0];
      
      insights.push({
        user_id: userId,
        budget_id: budgetId,
        insight_type: 'savings_opportunity',
        description: `You've made ${topFrequent.count} small purchases in ${
          expensesData.find(e => e.category_id === topFrequent.id)?.categories?.name || 'Unknown'
        } averaging ${formatCurrency(topFrequent.avg)} each. These add up to ${formatCurrency(topFrequent.total)}.`
      });
    }
    
    // Add general recommendation if few insights
    if (insights.length < 2) {
      insights.push({
        user_id: userId,
        budget_id: budgetId,
        insight_type: 'recommendation',
        description: 'Consider using the 50/30/20 rule: 50% of your budget for needs, 30% for wants, and 20% for savings and debt repayment.'
      });
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating budget insights:', error);
    return [];
  }
}

// Helper to format currency
function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}