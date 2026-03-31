export interface TraversalFrame<Node, Meta = unknown> {
  node: Node;
  phase: number;
  meta: Meta;
}

export class TraversalStack<Node, Meta = unknown> {
  private readonly stack: Array<TraversalFrame<Node, Meta>> = [];

  public push(frame: TraversalFrame<Node, Meta>): void {
    this.stack.push(frame);
  }

  public pop(): TraversalFrame<Node, Meta> | undefined {
    return this.stack.pop();
  }

  public get isEmpty(): boolean {
    return this.stack.length === 0;
  }

  public get size(): number {
    return this.stack.length;
  }

  public clear(): void {
    this.stack.length = 0;
  }
}
