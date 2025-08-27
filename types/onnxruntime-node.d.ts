declare module 'onnxruntime-node' {
  export class Tensor<T extends Float32Array | BigInt64Array = Float32Array | BigInt64Array> {
    constructor(type: string, data: T, dims: readonly number[]);
    readonly data: T;
  }
  export class InferenceSession {
    static create(path: string): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, { data: Float32Array | BigInt64Array }>>;
  }
}
