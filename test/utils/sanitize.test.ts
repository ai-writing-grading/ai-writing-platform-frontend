import { sanitizeTextInput } from '@/utils/sanitize';

describe('sanitize.ts', () => {
  describe('sanitizeTextInput', () => {
    it('removes control characters (0x00-0x08)', () => {
      const input = 'Hello\x00\x01\x02World';
      const result = sanitizeTextInput(input);
      expect(result).toBe('HelloWorld');
    });

    it('removes control characters (0x0B, 0x0C)', () => {
      const input = 'Test\x0B\x0CString';
      const result = sanitizeTextInput(input);
      expect(result).toBe('TestString');
    });

    it('removes control characters (0x0E-0x1F)', () => {
      const input = 'Valid\x0E\x1F\x18Text';
      const result = sanitizeTextInput(input);
      expect(result).toBe('ValidText');
    });

    it('removes extended control characters (0x7F-0x9F)', () => {
      const input = 'Start\x7F\x80\x9FEnd';
      const result = sanitizeTextInput(input);
      expect(result).toBe('StartEnd');
    });

    it('normalizes CRLF to LF', () => {
      const input = 'Line1\r\nLine2\r\nLine3';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Line1\nLine2\nLine3');
    });

    it('normalizes CR to LF', () => {
      const input = 'Old\rMac\rFormat';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Old\nMac\nFormat');
    });

    it('keeps valid printable characters', () => {
      const input = 'Valid Text 123!@#$%';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Valid Text 123!@#$%');
    });

    it('keeps unicode characters', () => {
      const input = '你好世界😀';
      const result = sanitizeTextInput(input);
      expect(result).toBe('你好世界😀');
    });

    it('truncates input longer than MAX_LENGTH (500000)', () => {
      const longInput = 'a'.repeat(500_010);
      const result = sanitizeTextInput(longInput);
      expect(result.length).toBe(500_000);
      expect(result).toBe('a'.repeat(500_000));
    });

    it('allows input exactly at MAX_LENGTH', () => {
      const input = 'x'.repeat(500_000);
      const result = sanitizeTextInput(input);
      expect(result.length).toBe(500_000);
    });

    it('returns empty string for null input', () => {
      const result = sanitizeTextInput(null as any);
      expect(result).toBe('');
    });

    it('returns empty string for undefined input', () => {
      const result = sanitizeTextInput(undefined as any);
      expect(result).toBe('');
    });

    it('returns empty string for number input', () => {
      const result = sanitizeTextInput(123 as any);
      expect(result).toBe('');
    });

    it('returns empty string for object input', () => {
      const result = sanitizeTextInput({} as any);
      expect(result).toBe('');
    });

    it('handles mixed control characters and valid text', () => {
      const input = 'Start\x00\nMiddle\r\n\x7FEnd';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Start\nMiddle\nEnd');
    });

    it('preserves spaces and tabs', () => {
      const input = 'Text\twith\tspaces  and\ttabs';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Text\twith\tspaces  and\ttabs');
    });

    it('handles empty string', () => {
      const result = sanitizeTextInput('');
      expect(result).toBe('');
    });

    it('handles string with only control characters', () => {
      const input = '\x00\x01\x02\x03';
      const result = sanitizeTextInput(input);
      expect(result).toBe('');
    });

    it('processes multiple newline sequences correctly', () => {
      const input = 'Line1\r\n\r\nLine2';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Line1\n\nLine2');
    });

    it('preserves quotes and special characters', () => {
      const input = '"quoted" and \'single\' with \\backslash';
      const result = sanitizeTextInput(input);
      expect(result).toBe('"quoted" and \'single\' with \\backslash');
    });

    it('handles very long text without control characters', () => {
      const input = 'a'.repeat(100_000);
      const result = sanitizeTextInput(input);
      expect(result).toBe('a'.repeat(100_000));
    });

    it('handles text with only newlines', () => {
      const input = '\n\n\n';
      const result = sanitizeTextInput(input);
      expect(result).toBe('\n\n\n');
    });
  });
});
