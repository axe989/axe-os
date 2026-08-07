import { describe, expect, it } from "vitest";
import { KASPI_COLUMNS, KaspiCsvAdapter, buildKaspiRow, kaspiRequiredFields, type KaspiRowContext } from "./kaspi-csv";

function attr(value: string, translated: string | null = value): { valueCode: string; displayLabel: string; translatedValue: string | null } {
  return { valueCode: value, displayLabel: value, translatedValue: translated };
}

function fullContext(overrides: Partial<KaspiRowContext> = {}): KaspiRowContext {
  return {
    sellerSku: "AXE-RT-VC22-5001000-WH",
    title: "Royal Thermo Vittoria 500/1000",
    brand: "Royal Thermo",
    imageCode: "AXE-RT-VC22-5001000-WH",
    youtubeId: null,
    imageUrls: null,
    description: "Стальной панельный радиатор, боковое подключение.",
    logisticsWeightRaw: "18.5",
    familyId: null,
    type: attr("panel", "панельный"),
    construction: attr("wall", "настенная"),
    connection: attr("bottom", "нижнее"),
    material: [attr("steel", "стальной")],
    color: [attr("white", "белый")],
    sectionNumber: attr("without_sections", "без секций (монолитный)"),
    model: "VC22-500-1000",
    additional: null,
    removablePanels: true,
    equipment: [attr("radiator", "радиатор"), attr("bracket_kit", "комплект кронштейнов")],
    maximumPowerW: 1500,
    heatTransferW: 1450.5,
    maximumTemperatureC: 110,
    maximumPressureBar: 10,
    pressureTestingBar: 15,
    overallVolumeL: 5.2,
    sectionWaterVolumeL: null,
    heatedAreaSqm: 15,
    centerDistanceMm: 900,
    heightMm: 500,
    widthMm: 1000,
    thicknessMm: 100,
    weightKg: 18.5,
    ...overrides,
  };
}

describe("buildKaspiRow", () => {
  it("maps every one of the 32 template columns", () => {
    const row = buildKaspiRow(fullContext());
    expect(Object.keys(row)).toHaveLength(KASPI_COLUMNS.length);
    expect(row["merchant_sku"]).toBe("AXE-RT-VC22-5001000-WH");
    expect(row["name"]).toBe("Royal Thermo Vittoria 500/1000");
    expect(row["Heating radiators*Obsie harakteristiki.heating radiators*type"]).toBe("панельный");
    expect(row["Heating radiators*Osobennosti.heating radiators*height"]).toBe("500");
  });

  it("joins multi-value attributes with ';'", () => {
    const row = buildKaspiRow(
      fullContext({ equipment: [attr("radiator", "радиатор"), attr("bracket_kit", "комплект кронштейнов")] }),
    );
    expect(row["Heating radiators*Osobennosti.heating radiators*equipment"]).toBe("радиатор;комплект кронштейнов");
  });

  it("drops an untranslated multi-value entry rather than emitting a blank/garbage token", () => {
    const row = buildKaspiRow(fullContext({ material: [attr("steel", null)] }));
    expect(row["Heating radiators*Obsie harakteristiki.heating radiators*material"]).toBe("");
  });

  it("formats decimals without a currency/unit suffix and trims trailing zeros", () => {
    const row = buildKaspiRow(fullContext({ heatTransferW: 1450.5, maximumPowerW: 1500 }));
    expect(row["Heating radiators*Obsie harakteristiki.heating radiators*heat transfer"]).toBe("1450.5");
    expect(row["Heating radiators*Obsie harakteristiki.heating radiators*maximum power"]).toBe("1500");
  });

  it("formats booleans as Да/Нет per the template's boolean field convention", () => {
    expect(buildKaspiRow(fullContext({ removablePanels: true }))["Heating radiators*Osobennosti.heating radiators*removable panels"]).toBe("Да");
    expect(buildKaspiRow(fullContext({ removablePanels: false }))["Heating radiators*Osobennosti.heating radiators*removable panels"]).toBe("Нет");
    expect(buildKaspiRow(fullContext({ removablePanels: null }))["Heating radiators*Osobennosti.heating radiators*removable panels"]).toBe("");
  });

  it("is deterministic for the same context", () => {
    const context = fullContext();
    expect(buildKaspiRow(context)).toEqual(buildKaspiRow(context));
  });
});

describe("kaspiRequiredFields", () => {
  it("reports all required fields present for a fully-populated context", () => {
    const checks = kaspiRequiredFields(fullContext());
    expect(checks.every((c) => c.present)).toBe(true);
  });

  it("flags a missing hard-required field (heated area) by its Russian label", () => {
    const checks = kaspiRequiredFields(fullContext({ heatedAreaSqm: null }));
    const heatedArea = checks.find((c) => c.label === "Отапливаемая площадь");
    expect(heatedArea?.present).toBe(false);
  });

  it("flags a missing required multi-value field (equipment)", () => {
    const checks = kaspiRequiredFields(fullContext({ equipment: [] }));
    const equipment = checks.find((c) => c.label === "Комплектация");
    expect(equipment?.present).toBe(false);
  });

  it("does not report optional fields as required", () => {
    const checks = kaspiRequiredFields(fullContext({ youtubeId: null, additional: null }));
    expect(checks.find((c) => c.label === "Ссылка на YouTube")).toBeUndefined();
  });
});

describe("KaspiCsvAdapter.serialize", () => {
  it("uses the exact 32 column keys, in template order, as the CSV header", () => {
    const { content } = KaspiCsvAdapter.serialize([buildKaspiRow(fullContext())]);
    const headerLine = content.split("\r\n")[0];
    expect(headerLine.split(",")).toHaveLength(KASPI_COLUMNS.length);
    expect(headerLine.startsWith("merchant_sku,name,brand,")).toBe(true);
  });

  it("declares utf-8 encoding, matching the supplied template's requirement", () => {
    expect(KaspiCsvAdapter.serialize([]).encoding).toBe("utf-8");
  });

  it("produces the same bytes for the same rows (deterministic export)", () => {
    const rows = [buildKaspiRow(fullContext())];
    expect(KaspiCsvAdapter.serialize(rows).content).toBe(KaspiCsvAdapter.serialize(rows).content);
  });
});
