// test/setup.ts
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock window.dispatchEvent
global.dispatchEvent = jest.fn();

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as any;
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'mock-uuid-1234';
}
