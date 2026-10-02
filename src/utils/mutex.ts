export class Mutex {
  private queue: Promise<unknown>;

  constructor() {
    this.queue = Promise.resolve();
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => task());
    this.queue = result.catch(() => {});
    return result;
  }
}

// Obsidian prints the active window; serialize requests across export dialogs.
export const printMutex = new Mutex();
