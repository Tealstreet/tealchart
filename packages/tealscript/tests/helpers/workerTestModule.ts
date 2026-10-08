import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { vi } from 'vitest';

type Handler = (event: MessageEvent<ToWorkerMessage>) => void;
interface WorkerGlobal {
  onmessage?: Handler | null;
  postMessage: (message: FromWorkerMessage) => void;
}

export function createWorkerTestModule() {
  let imports = 0;
  let handler: Handler | undefined;
  return {
    get importCount() {
      return imports;
    },
    async attach(worker: WorkerGlobal) {
      vi.stubGlobal('self', worker);
      if (!handler) {
        await import('../../src/worker/worker');
        handler = worker.onmessage ?? undefined;
        if (!handler) throw new Error('Worker module did not install its message handler');
        imports += 1;
      }
      worker.onmessage = handler;
      handler({ data: { type: 'dispose' } } as MessageEvent<ToWorkerMessage>);
    },
  };
}
