export type Who = 'me' | 'channel';

export interface Preview {
  id: string;
  /** HTML produced by the rich-text editor; render with {@html}. */
  whatHTML: string;
  /** When the reminder will fire (parsed from the when expression). */
  timestamp: Date;
}
