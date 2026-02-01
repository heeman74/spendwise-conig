declare module 'ofx-js' {
  export class Ofx {
    static parse(data: string): Promise<any>;
  }
}
