// test/setup.ts
import '@testing-library/jest-dom';

// @ts-expect-error "test code"
delete window.location;
window.location = {
  href: 'http://localhost/',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
} as any;


// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

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