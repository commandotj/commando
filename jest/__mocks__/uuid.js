/* eslint-env jest */
// Mock uuid module for Jest tests
const mockUuid = jest.fn(() => "mock-uuid-123");

module.exports = {
  v4: mockUuid,
  v1: mockUuid,
  v3: mockUuid,
  v5: mockUuid,
  NIL: "00000000-0000-0000-0000-000000000000",
  parse: jest.fn(),
  stringify: jest.fn(),
  validate: jest.fn(),
  version: jest.fn(),
};
