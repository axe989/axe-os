import type { AdapterRequiredFieldCheck } from "../validation";

// Publication Engine adapter contract. Kaspi CSV is the first
// implementation; WB/Ozon/Website are future adapters reading the exact
// same channel-agnostic publication data -- none of them require a schema
// change, only a new module implementing this interface.
export type SerializedExport = {
  content: string;
  encoding: "utf-8";
  fileExtension: string;
  mimeType: string;
};

export interface PublicationAdapter<TContext> {
  readonly channel: string;
  readonly adapterId: string;
  readonly templateVersion: string;
  requiredFields(context: TContext): AdapterRequiredFieldCheck[];
  mapItemToRow(context: TContext): Record<string, string>;
  serialize(rows: Array<Record<string, string>>): SerializedExport;
}

// One resolved dictionary-backed attribute value, already translated for
// the target channel (see lib/catalog/attributes/resolve-translation.ts).
// translatedValue is null when no translation row exists for this channel
// -- the adapter must treat that as "value unavailable", never fall back
// to the canonical/display label as if it were the channel's own text.
export type ResolvedAttributeValue = {
  valueCode: string;
  displayLabel: string;
  translatedValue: string | null;
};
