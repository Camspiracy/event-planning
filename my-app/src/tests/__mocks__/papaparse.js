import { vi } from "vitest";

export const mockParse = vi.fn();

export default {
  parse: mockParse,
};
