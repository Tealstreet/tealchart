/** Bounded Canvas2D transport for app-owned indicator classes. Never evaluates code from a frame. */
export type HostedCanvasValue = number | string | boolean | number[] | { gradient: number };
export interface HostedCanvasCommand {
  op: 'call' | 'set' | 'gradient' | 'gradient-stop' | 'image';
  name?: string;
  id?: number;
  args: HostedCanvasValue[];
}
export interface HostedCanvasImage {
  id: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

const LIMIT = 100_000;
const IMAGE_BYTES = 16 * 1024 * 1024;
const METHODS: Record<string, [number, number]> = {
  save: [0, 0],
  restore: [0, 0],
  beginPath: [0, 0],
  closePath: [0, 0],
  moveTo: [2, 2],
  lineTo: [2, 2],
  rect: [4, 4],
  roundRect: [4, 5],
  fillRect: [4, 4],
  strokeRect: [4, 4],
  clearRect: [4, 4],
  arc: [5, 6],
  arcTo: [5, 5],
  ellipse: [7, 8],
  quadraticCurveTo: [4, 4],
  bezierCurveTo: [6, 6],
  fill: [0, 1],
  stroke: [0, 0],
  clip: [0, 1],
  fillText: [3, 4],
  strokeText: [3, 4],
  setLineDash: [1, 1],
  translate: [2, 2],
  scale: [2, 2],
  rotate: [1, 1],
  transform: [6, 6],
  setTransform: [6, 6],
  resetTransform: [0, 0],
};
const PROPERTIES = new Set([
  'fillStyle',
  'strokeStyle',
  'lineWidth',
  'lineCap',
  'lineJoin',
  'miterLimit',
  'lineDashOffset',
  'font',
  'textAlign',
  'textBaseline',
  'direction',
  'globalAlpha',
  'globalCompositeOperation',
  'shadowColor',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
  'imageSmoothingEnabled',
  'imageSmoothingQuality',
]);

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e9;
}
function valueValid(value: unknown): value is HostedCanvasValue {
  if (typeof value === 'number') return finite(value);
  if (typeof value === 'string') return value.length <= 8192;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length <= 64 && value.every(finite);
  return !!value && typeof value === 'object' && Number.isSafeInteger((value as { gradient?: unknown }).gradient);
}

/** Validate the entire batch before drawing any part of it. */
export function validateHostedCanvasCommands(
  commands: unknown,
  images: readonly HostedCanvasImage[] = [],
): commands is HostedCanvasCommand[] {
  if (!Array.isArray(commands) || commands.length > LIMIT || !Array.isArray(images) || images.length > 64) return false;
  const imageIds = new Set<number>();
  let bytes = 0;
  for (const image of images) {
    if (
      !image ||
      !Number.isSafeInteger(image.id) ||
      imageIds.has(image.id) ||
      !Number.isSafeInteger(image.width) ||
      !Number.isSafeInteger(image.height) ||
      image.width <= 0 ||
      image.height <= 0 ||
      image.width > 4096 ||
      image.height > 4096 ||
      !(image.pixels instanceof Uint8ClampedArray) ||
      image.pixels.length !== image.width * image.height * 4
    )
      return false;
    bytes += image.pixels.byteLength;
    if (bytes > IMAGE_BYTES) return false;
    imageIds.add(image.id);
  }
  const gradients = new Set<number>();
  let saves = 0;
  for (const command of commands) {
    if (!command || typeof command !== 'object' || !Array.isArray(command.args) || !command.args.every(valueValid))
      return false;
    const args = command.args;
    if (command.op === 'call') {
      if (!Object.hasOwn(METHODS, command.name ?? '')) return false;
      const arity = METHODS[command.name ?? ''];
      if (!arity || args.length < arity[0] || args.length > arity[1]) return false;
      if (command.name === 'save') saves++;
      if (command.name === 'restore' && --saves < 0) return false;
      if (command.name === 'fillText' || command.name === 'strokeText') {
        if (typeof args[0] !== 'string' || !args.slice(1).every(finite)) return false;
      } else if (command.name === 'setLineDash') {
        if (!Array.isArray(args[0]) || args[0].some((entry: number) => entry < 0)) return false;
      } else if (command.name === 'fill' || command.name === 'clip') {
        if (args.length && args[0] !== 'nonzero' && args[0] !== 'evenodd') return false;
      } else if (
        !args.every(
          (arg: unknown, index: number) =>
            finite(arg) ||
            (((command.name === 'arc' && index === 5) || (command.name === 'ellipse' && index === 7)) &&
              typeof arg === 'boolean') ||
            (command.name === 'roundRect' && index === 4 && Array.isArray(arg)),
        )
      )
        return false;
      if (
        (command.name === 'arc' && (args[2] as number) < 0) ||
        (command.name === 'ellipse' && ((args[2] as number) < 0 || (args[3] as number) < 0)) ||
        (command.name === 'arcTo' && (args[4] as number) < 0)
      )
        return false;
      if (command.name === 'roundRect' && args.length === 5) {
        const radii = Array.isArray(args[4]) ? args[4] : [args[4]];
        if (radii.length < 1 || radii.length > 4 || !radii.every((radius) => finite(radius) && radius >= 0))
          return false;
      }
    } else if (command.op === 'set') {
      if (!PROPERTIES.has(command.name ?? '') || args.length !== 1) return false;
      const arg = args[0];
      if (
        typeof arg === 'object' &&
        (!('gradient' in arg) || !gradients.has(arg.gradient) || !['fillStyle', 'strokeStyle'].includes(command.name!))
      )
        return false;
    } else if (command.op === 'gradient') {
      if (
        !Number.isSafeInteger(command.id) ||
        gradients.has(command.id!) ||
        !['createLinearGradient', 'createRadialGradient'].includes(command.name ?? '') ||
        args.length !== (command.name === 'createLinearGradient' ? 4 : 6) ||
        !args.every(finite) ||
        (command.name === 'createRadialGradient' && ((args[2] as number) < 0 || (args[5] as number) < 0))
      )
        return false;
      gradients.add(command.id!);
    } else if (command.op === 'gradient-stop') {
      if (
        !gradients.has(command.id!) ||
        args.length !== 2 ||
        !finite(args[0]) ||
        args[0] < 0 ||
        args[0] > 1 ||
        typeof args[1] !== 'string'
      )
        return false;
    } else if (command.op === 'image') {
      if (!imageIds.has(command.id!) || ![2, 4, 8].includes(args.length) || !args.every(finite)) return false;
    } else return false;
  }
  return saves === 0;
}

/** Replay only allowlisted primitives. The caller already owns pane/DPR transforms and clipping. */
export function replayHostedCanvasCommands(
  ctx: CanvasRenderingContext2D,
  commands: readonly HostedCanvasCommand[],
  images: readonly HostedCanvasImage[] = [],
): boolean {
  if (!validateHostedCanvasCommands(commands, images)) return false;
  const gradients = new Map<number, CanvasGradient>();
  const imageSources = new Map<number, HTMLCanvasElement>();
  let depth = 0;
  ctx.save();
  try {
    ctx.beginPath();
    for (const command of commands) {
      if (command.op === 'gradient') {
        gradients.set(
          command.id!,
          (ctx[command.name as 'createLinearGradient'] as (...args: number[]) => CanvasGradient).apply(
            ctx,
            command.args as number[],
          ),
        );
      } else if (command.op === 'gradient-stop') {
        gradients.get(command.id!)!.addColorStop(command.args[0] as number, command.args[1] as string);
      } else if (command.op === 'set') {
        const value = command.args[0];
        (ctx as unknown as Record<string, unknown>)[command.name!] =
          typeof value === 'object' && 'gradient' in value ? gradients.get(value.gradient) : value;
      } else if (command.op === 'image') {
        let image = imageSources.get(command.id!);
        if (!image) {
          const resource = images.find((entry) => entry.id === command.id)!;
          image = ctx.canvas.ownerDocument.createElement('canvas');
          image.width = resource.width;
          image.height = resource.height;
          const context = image.getContext('2d')!;
          const pixels = context.createImageData(resource.width, resource.height);
          pixels.data.set(resource.pixels);
          context.putImageData(pixels, 0, 0);
          imageSources.set(resource.id, image);
        }
        (ctx.drawImage as (...args: unknown[]) => void).call(ctx, image, ...command.args);
      } else {
        if (command.name === 'save') depth++;
        if (command.name === 'restore') depth--;
        (ctx as unknown as Record<string, (...args: unknown[]) => void>)[command.name!](...command.args);
      }
    }
    return true;
  } finally {
    while (depth-- > 0) ctx.restore();
    ctx.restore();
    ctx.beginPath();
  }
}

/** A real app-origin context supplies text metrics; recording never paints onto that context. */
export class HostedCanvasRecorder {
  readonly commands: HostedCanvasCommand[] = [];
  readonly images: HostedCanvasImage[] = [];
  readonly context: CanvasRenderingContext2D;
  error?: string;
  private nextGradient = 0;
  private imageIds = new WeakMap<object, number>();

  constructor(
    private readonly metrics: CanvasRenderingContext2D,
    imageIdOffset = 0,
  ) {
    const gradientHandles = new WeakMap<object, number>();
    const state = new Map<string, unknown>();
    const stack: Array<Map<string, unknown>> = [];
    const record = (command: HostedCanvasCommand) => {
      if (this.commands.length >= LIMIT) {
        this.error = 'Indicator exceeds hosted canvas command limit';
        return;
      }
      this.commands.push(command);
    };
    for (const name of PROPERTIES) {
      const value = (metrics as unknown as Record<string, unknown>)[name];
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        state.set(name, value);
        record({ op: 'set', name, args: [value] });
      }
    }
    this.context = new Proxy(metrics, {
      get: (target, key) => {
        if (key === 'canvas') return target.canvas;
        if (key === 'measureText')
          return (text: string) => {
            if (typeof state.get('font') === 'string') target.font = state.get('font') as string;
            return target.measureText(String(text));
          };
        if (key === 'getLineDash') return () => state.get('lineDash') ?? [];
        if (key === 'createLinearGradient' || key === 'createRadialGradient')
          return (...args: number[]) => {
            const id = ++this.nextGradient;
            const handle = {
              addColorStop: (offset: number, color: string) =>
                record({ op: 'gradient-stop', id, args: [offset, color] }),
            };
            gradientHandles.set(handle, id);
            record({ op: 'gradient', name: key, id, args });
            return handle;
          };
        if (key === 'drawImage')
          return (source: CanvasImageSource, ...args: number[]) => {
            try {
              let id = this.imageIds.get(source);
              if (!id) {
                const value = source as HTMLImageElement;
                const width = value.naturalWidth ?? value.width;
                const height = value.naturalHeight ?? value.height;
                if (
                  !Number.isSafeInteger(width) ||
                  !Number.isSafeInteger(height) ||
                  width <= 0 ||
                  height <= 0 ||
                  width > 4096 ||
                  height > 4096 ||
                  width * height * 4 > IMAGE_BYTES
                )
                  throw new Error('Indicator image exceeds hosted transport limit');
                const image = target.canvas.ownerDocument.createElement('canvas');
                image.width = width;
                image.height = height;
                const context = image.getContext('2d')!;
                context.drawImage(source, 0, 0);
                const pixels = context.getImageData(0, 0, width, height).data;
                id = this.images.length + 1 + imageIdOffset;
                this.imageIds.set(source, id);
                this.images.push({ id, width, height, pixels });
              }
              record({ op: 'image', id, args });
            } catch (error) {
              this.error = error instanceof Error ? error.message : String(error);
            }
          };
        if (typeof key === 'string' && Object.hasOwn(METHODS, key))
          return (...args: HostedCanvasValue[]) => {
            if (key === 'save') stack.push(new Map(state));
            if (key === 'restore') {
              const previous = stack.pop();
              if (!previous) this.error = 'Unbalanced indicator canvas restore';
              else {
                state.clear();
                for (const [name, value] of previous) state.set(name, value);
              }
            }
            if (key === 'setLineDash') state.set('lineDash', args[0]);
            record({ op: 'call', name: key, args });
          };
        if (typeof key === 'string' && PROPERTIES.has(key)) return state.get(key) ?? Reflect.get(target, key);
        if (typeof key === 'symbol') return Reflect.get(target, key);
        this.error = `Unsupported hosted canvas operation: ${String(key)}`;
        return () => {};
      },
      set: (_target, key, value) => {
        if (typeof key !== 'string' || !PROPERTIES.has(key)) {
          this.error = `Unsupported hosted canvas property: ${String(key)}`;
          return true;
        }
        // Real Canvas2D retains state until changed. Repeated per-cell style
        // assignments need not consume the bounded transport's draw budget.
        // Compare the current save/restore state, never a global "seen" cache.
        if (state.has(key) && Object.is(state.get(key), value)) return true;
        state.set(key, value);
        const gradient = value && typeof value === 'object' ? gradientHandles.get(value) : undefined;
        record({ op: 'set', name: key, args: [gradient !== undefined ? { gradient } : value] });
        return true;
      },
    });
  }
}
