// utils/sanitize.ts
export const sanitizeTextInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // 1. 移除控制字符（使用循环而非正则，避免 ESLint 问题）
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (!((code >= 0 && code <= 8) || 
          code === 11 || 
          code === 12 || 
          (code >= 14 && code <= 31) || 
          (code >= 127 && code <= 159))) {
      result += input[i];
    }
  }
  
  // 2. 限制长度（防止 DoS）
  const MAX_LENGTH = 500000; // 50篇 * 10000字符
  if (result.length > MAX_LENGTH) {
    result = result.slice(0, MAX_LENGTH);
  }
  
  // 3. 规范化换行符（防止 CRLF 注入）
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  return result;
};