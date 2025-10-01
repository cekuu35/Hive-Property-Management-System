/**
 * Utility functions for rent calculations
 */

export const calculateMonthlyRentDue = (
  rentAmount: number,
  startDate: string,
  currentDate: Date = new Date()
): {
  currentRentDue: number;
  dueDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
} => {
  const today = currentDate;
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Calculate the first day of current month
  const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
  const dueDate = firstDayOfCurrentMonth.toISOString().split('T')[0];
  
  // Calculate days until due (negative if overdue)
  const daysUntilDue = Math.ceil((firstDayOfCurrentMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  
  return {
    currentRentDue: rentAmount,
    dueDate,
    isOverdue,
    daysUntilDue
  };
};

export const calculateLateFee = (isOverdue: boolean, baseLateFee: number = 2500): number => {
  return isOverdue ? baseLateFee : 0;
};

export const formatRentAmount = (amount: number): string => {
  return `KES ${amount.toLocaleString()}`;
};

export const formatDueDate = (dueDate: string): string => {
  return new Date(dueDate).toLocaleDateString();
};

export const getDaysUntilDueText = (daysUntilDue: number, isOverdue: boolean): string => {
  if (isOverdue) {
    return `${Math.abs(daysUntilDue)} days overdue`;
  } else if (daysUntilDue === 0) {
    return 'Due today';
  } else if (daysUntilDue === 1) {
    return 'Due tomorrow';
  } else {
    return `${daysUntilDue} days until due`;
  }
};
