// utils/formatters.ts

/**
 * Format a number as currency with the specified locale and currency
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'en-US')
 * @param currency - The currency code to use (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (
    amount: number,
    locale: string = 'en-US',
    currency: string = 'USD'
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  /**
   * Format a date with the specified locale and options
   * @param date - The date to format
   * @param locale - The locale to use (default: 'en-US')
   * @param options - The formatting options
   * @returns Formatted date string
   */
  export const formatDate = (
    date: Date | string,
    locale: string = 'en-US',
    options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }
  ): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  };
  
  /**
   * Format a percentage with the specified number of decimal places
   * @param value - The percentage value (0-100)
   * @param decimalPlaces - The number of decimal places (default: 1)
   * @returns Formatted percentage string
   */
  export const formatPercentage = (
    value: number,
    decimalPlaces: number = 1
  ): string => {
    return `${value.toFixed(decimalPlaces)}%`;
  };
  
  /**
   * Truncate a string to the specified length and add ellipsis if needed
   * @param str - The string to truncate
   * @param maxLength - The maximum length (default: 50)
   * @returns Truncated string
   */
  export const truncateString = (
    str: string,
    maxLength: number = 50
  ): string => {
    if (str.length <= maxLength) return str;
    return `${str.substring(0, maxLength - 3)}...`;
  };