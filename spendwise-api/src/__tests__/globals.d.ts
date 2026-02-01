// Global type definitions for tests
import '@jest/globals';

declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any> {
      mockResolvedValue(value: any): this;
      mockRejectedValue(value: any): this;
    }
  }
}
