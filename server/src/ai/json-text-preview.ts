/** Decode complete JSON-string prefixes without leaking unfinished escapes/UTF-16 pairs. */
export function decodeStringPrefix(raw: string): string | null {
  let end = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\') {
      if (i + 1 >= raw.length) break;
      if (raw[i + 1] === 'u') { if (i + 6 > raw.length) break; i += 5; }
      else i++;
    }
    end = i + 1;
  }
  try { return (JSON.parse(`"${raw.slice(0, end)}"`) as string).replace(/[\uD800-\uDBFF]$/, ''); }
  catch { return null; }
}

type Frame = { path: string[]; array: boolean; index: number; key?: string; expectsKey: boolean };

/** Incremental lexical reader. Paths are structural; text inside values cannot impersonate keys. */
export class JsonTextPreview {
  private raw = '';
  private cursor = 0;
  private started = false;
  private frames: Frame[] = [];
  private start: number | null = null;
  private key = false;
  private escaped = false;
  private values: Record<string, string> = {};

  push(chunk: string): Record<string, string> {
    this.raw += chunk;
    if (!this.started) {
      const match = /^\s*(?:```(?:json)?\s*)?(?=\{)/i.exec(this.raw);
      if (!match) return this.values;
      this.cursor = match[0].length; this.started = true;
    }
    const path = () => {
      const frame = this.frames.at(-1);
      return frame ? [...frame.path, frame.array ? String(frame.index) : frame.key || ''].join('.') : '';
    };
    const record = (value: string) => { this.values = { ...this.values, [path()]: value }; };
    while (this.cursor < this.raw.length) {
      const char = this.raw[this.cursor];
      if (this.start !== null) {
        if (this.escaped) this.escaped = false;
        else if (char === '\\') this.escaped = true;
        else if (char === '"') {
          const frame = this.frames.at(-1);
          try {
            const value = JSON.parse(this.raw.slice(this.start, this.cursor + 1));
            if (this.key && frame) { frame.key = value; frame.expectsKey = false; }
            else { record(value); if (frame?.array) frame.index++; }
          } catch { /* Final schema validation handles malformed output. */ }
          this.start = null;
        }
      } else if (char === '"') {
        this.start = this.cursor;
        this.key = !!this.frames.at(-1)?.expectsKey;
      } else if (char === '{' || char === '[') {
        const parent = this.frames.at(-1);
        this.frames.push({ path: parent ? [...parent.path, parent.array ? String(parent.index) : parent.key || ''] : [], array: char === '[', index: 0, expectsKey: char === '{' });
      } else if (char === '}' || char === ']') {
        this.frames.pop();
        const parent = this.frames.at(-1);
        if (parent?.array) parent.index++;
      } else if (char === ',') {
        const frame = this.frames.at(-1);
        if (frame && !frame.array) frame.expectsKey = true;
      }
      this.cursor++;
    }
    if (this.start !== null && !this.key) {
      const value = decodeStringPrefix(this.raw.slice(this.start + 1));
      if (value !== null) record(value);
    }
    return this.values;
  }
}
