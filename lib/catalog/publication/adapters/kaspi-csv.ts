import type { AdapterRequiredFieldCheck } from "../validation";
import { stringifyCsv } from "../csv";
import type { PublicationAdapter, ResolvedAttributeValue, SerializedExport } from "./types";

// Kaspi CSV adapter -- currently scoped to the "Heating radiators"
// category template supplied at docs/kaspi-template.xlsm (32 columns,
// see the approved field-mapping report). Column keys below are copied
// verbatim from that template's row 2 (machine attribute codes); nothing
// here is invented. A different category's Kaspi template has a
// different attribute set and would need its own column list -- this
// file intentionally does not try to generalize across categories yet.

export const KASPI_TEMPLATE_VERSION = "kaspi-template.xlsm:heating-radiators:2026-08-07";

type KaspiColumnKind = "text" | "decimal" | "boolean" | "single_list" | "multi_list";

type KaspiColumnSpec = {
  key: string;
  label: string;
  required: boolean;
  kind: KaspiColumnKind;
};

// Column order matches the template exactly (A..AF).
export const KASPI_COLUMNS: KaspiColumnSpec[] = [
  { key: "merchant_sku", label: "Артикул", required: true, kind: "text" },
  { key: "name", label: "Название товара", required: true, kind: "text" },
  { key: "brand", label: "Бренд", required: true, kind: "single_list" },
  { key: "image_code", label: "Код изображений", required: false, kind: "text" },
  { key: "youtube_id", label: "Ссылка на YouTube", required: false, kind: "text" },
  { key: "image_urls", label: "Ссылка на картинку", required: false, kind: "text" },
  { key: "description", label: "Описание", required: false, kind: "text" },
  { key: "weight", label: "Вес для расчета логистики", required: false, kind: "text" },
  { key: "family_id", label: "Объединить в одну карточку", required: false, kind: "text" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*type", label: "Тип", required: true, kind: "single_list" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*construction", label: "Конструкция", required: true, kind: "single_list" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*connection", label: "Подключение", required: true, kind: "single_list" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*material", label: "Материал", required: true, kind: "multi_list" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*maximum power", label: "Максимальная мощность", required: false, kind: "decimal" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*heat transfer", label: "Теплоотдача радиатора", required: false, kind: "decimal" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*maximum temperature", label: "Макс. рабочая температура", required: false, kind: "decimal" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*maximum pressure", label: "Макс. рабочее давление", required: false, kind: "decimal" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*pressure testing", label: "Опрессовочное давление", required: false, kind: "decimal" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*overall volume", label: "Общий объем", required: false, kind: "decimal" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*color", label: "Цвет", required: true, kind: "multi_list" },
  { key: "Heating radiators*Obsie harakteristiki.heating radiators*model", label: "Модель/артикул", required: true, kind: "text" },
  { key: "Heating radiators*Osobennosti.heating radiators*section number", label: "Число секций/панелей", required: true, kind: "single_list" },
  { key: "Heating radiators*Osobennosti.heating radiators*section water volume", label: "Объем воды в секции", required: false, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*removable panels", label: "Съемные панели", required: false, kind: "boolean" },
  { key: "Heating radiators*Osobennosti.heating radiators*heated area", label: "Отапливаемая площадь", required: true, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*center distance", label: "Межосевое расстояние", required: false, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*height", label: "Высота", required: true, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*width", label: "Ширина", required: true, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*thickness", label: "Толщина", required: true, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*weight", label: "Вес", required: false, kind: "decimal" },
  { key: "Heating radiators*Osobennosti.heating radiators*additional", label: "Дополнительно", required: false, kind: "text" },
  { key: "Heating radiators*Osobennosti.heating radiators*equipment", label: "Комплектация", required: true, kind: "multi_list" },
];

export type KaspiRowContext = {
  sellerSku: string | null;
  title: string | null;
  // Free text, not a translated dictionary attribute: Kaspi's brand list
  // (values!A in the template) has ~10k entries we're not going to
  // fabricate a local copy of, and the template itself allows free text
  // when a brand isn't in that list ("если бренда нет в списке, введите
  // вручную"). We simply pass product_brands.name through.
  brand: string | null;
  imageCode: string | null;
  youtubeId: string | null;
  imageUrls: string | null;
  description: string | null;
  logisticsWeightRaw: string | null;
  familyId: string | null;

  type: ResolvedAttributeValue | null;
  construction: ResolvedAttributeValue | null;
  connection: ResolvedAttributeValue | null;
  material: ResolvedAttributeValue[];
  color: ResolvedAttributeValue[];
  sectionNumber: ResolvedAttributeValue | null;
  model: string | null;
  additional: string | null;
  removablePanels: boolean | null;
  equipment: ResolvedAttributeValue[];

  maximumPowerW: number | null;
  heatTransferW: number | null;
  maximumTemperatureC: number | null;
  maximumPressureBar: number | null;
  pressureTestingBar: number | null;
  overallVolumeL: number | null;
  sectionWaterVolumeL: number | null;
  heatedAreaSqm: number | null;
  centerDistanceMm: number | null;
  heightMm: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  weightKg: number | null;
};

const MULTI_VALUE_SEPARATOR = ";";

function formatDecimal(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "";
  }
  return String(value).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatBoolean(value: boolean | null): string {
  if (value === null) {
    return "";
  }
  return value ? "Да" : "Нет";
}

function formatSingle(value: ResolvedAttributeValue | null): string {
  return value?.translatedValue ?? "";
}

// Only fully-translated entries are joined -- an entry with
// translatedValue: null means the validation engine has already (or
// should have) blocked this item from export; the adapter never
// fabricates a value to fill the gap.
function formatMulti(values: ResolvedAttributeValue[]): string {
  return values
    .map((value) => value.translatedValue)
    .filter((value): value is string => value !== null)
    .join(MULTI_VALUE_SEPARATOR);
}

export function buildKaspiRow(context: KaspiRowContext): Record<string, string> {
  const row: Record<string, string> = {};

  row["merchant_sku"] = context.sellerSku ?? "";
  row["name"] = context.title ?? "";
  row["brand"] = context.brand ?? "";
  row["image_code"] = context.imageCode ?? "";
  row["youtube_id"] = context.youtubeId ?? "";
  row["image_urls"] = context.imageUrls ?? "";
  row["description"] = context.description ?? "";
  row["weight"] = context.logisticsWeightRaw ?? "";
  row["family_id"] = context.familyId ?? "";

  row["Heating radiators*Obsie harakteristiki.heating radiators*type"] = formatSingle(context.type);
  row["Heating radiators*Obsie harakteristiki.heating radiators*construction"] = formatSingle(context.construction);
  row["Heating radiators*Obsie harakteristiki.heating radiators*connection"] = formatSingle(context.connection);
  row["Heating radiators*Obsie harakteristiki.heating radiators*material"] = formatMulti(context.material);
  row["Heating radiators*Obsie harakteristiki.heating radiators*maximum power"] = formatDecimal(context.maximumPowerW);
  row["Heating radiators*Obsie harakteristiki.heating radiators*heat transfer"] = formatDecimal(context.heatTransferW);
  row["Heating radiators*Obsie harakteristiki.heating radiators*maximum temperature"] = formatDecimal(context.maximumTemperatureC);
  row["Heating radiators*Obsie harakteristiki.heating radiators*maximum pressure"] = formatDecimal(context.maximumPressureBar);
  row["Heating radiators*Obsie harakteristiki.heating radiators*pressure testing"] = formatDecimal(context.pressureTestingBar);
  row["Heating radiators*Obsie harakteristiki.heating radiators*overall volume"] = formatDecimal(context.overallVolumeL);
  row["Heating radiators*Obsie harakteristiki.heating radiators*color"] = formatMulti(context.color);
  row["Heating radiators*Obsie harakteristiki.heating radiators*model"] = context.model ?? "";
  row["Heating radiators*Osobennosti.heating radiators*section number"] = formatSingle(context.sectionNumber);
  row["Heating radiators*Osobennosti.heating radiators*section water volume"] = formatDecimal(context.sectionWaterVolumeL);
  row["Heating radiators*Osobennosti.heating radiators*removable panels"] = formatBoolean(context.removablePanels);
  row["Heating radiators*Osobennosti.heating radiators*heated area"] = formatDecimal(context.heatedAreaSqm);
  row["Heating radiators*Osobennosti.heating radiators*center distance"] = formatDecimal(context.centerDistanceMm);
  row["Heating radiators*Osobennosti.heating radiators*height"] = formatDecimal(context.heightMm);
  row["Heating radiators*Osobennosti.heating radiators*width"] = formatDecimal(context.widthMm);
  row["Heating radiators*Osobennosti.heating radiators*thickness"] = formatDecimal(context.thicknessMm);
  row["Heating radiators*Osobennosti.heating radiators*weight"] = formatDecimal(context.weightKg);
  row["Heating radiators*Osobennosti.heating radiators*additional"] = context.additional ?? "";
  row["Heating radiators*Osobennosti.heating radiators*equipment"] = formatMulti(context.equipment);

  return row;
}

export function kaspiRequiredFields(context: KaspiRowContext): AdapterRequiredFieldCheck[] {
  const row = buildKaspiRow(context);

  return KASPI_COLUMNS.filter((column) => column.required).map((column) => ({
    key: column.key,
    label: column.label,
    present: row[column.key] !== undefined && row[column.key].trim().length > 0,
  }));
}

export const KaspiCsvAdapter: PublicationAdapter<KaspiRowContext> = {
  channel: "kaspi",
  adapterId: "kaspi_csv_v1",
  templateVersion: KASPI_TEMPLATE_VERSION,

  requiredFields: kaspiRequiredFields,
  mapItemToRow: buildKaspiRow,

  serialize(rows: Array<Record<string, string>>): SerializedExport {
    const headers = KASPI_COLUMNS.map((column) => column.key);
    return {
      content: stringifyCsv(headers, rows),
      encoding: "utf-8",
      fileExtension: "csv",
      mimeType: "text/csv",
    };
  },
};
