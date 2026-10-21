import { describe, expect, it } from "vitest";
import { controlSchema, decodificarImagen, validarCoberturaItems } from "./validation";

const base = {
  clientId: "abc12345-0000",
  equipoCodigo: "AE-01",
  operarioId: 1,
  horas: 1234.5,
  items: [{ itemId: 1, ok: true }],
};

describe("controlSchema", () => {
  it("acepta un control válido", () => {
    expect(controlSchema.safeParse(base).success).toBe(true);
  });
  it("FALLA sin observación → inválido", () => {
    expect(controlSchema.safeParse({ ...base, items: [{ itemId: 1, ok: false }] }).success).toBe(false);
  });
  it("FALLA con observación → válido", () => {
    const r = controlSchema.safeParse({ ...base, items: [{ itemId: 1, ok: false, observacion: "No traba" }] });
    expect(r.success).toBe(true);
  });
  it("horas negativas → inválido", () => {
    expect(controlSchema.safeParse({ ...base, horas: -1 }).success).toBe(false);
  });
  it("PIN debe ser de 4 dígitos", () => {
    expect(controlSchema.safeParse({ ...base, pin: "12a4" }).success).toBe(false);
    expect(controlSchema.safeParse({ ...base, pin: "1234" }).success).toBe(true);
  });
});

describe("validarCoberturaItems", () => {
  it("ok si cubre exactamente los activos", () => {
    expect(validarCoberturaItems([1, 2, 3], [3, 2, 1])).toBeNull();
  });
  it("detecta faltantes, repetidos y extras", () => {
    expect(validarCoberturaItems([1, 2, 3], [1, 2])).toMatch(/Faltan 1/);
    expect(validarCoberturaItems([1, 2], [1, 1, 2])).toMatch(/repetidos/);
    expect(validarCoberturaItems([1, 2], [1, 2, 9])).toMatch(/no corresponden/);
  });
});

describe("decodificarImagen", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
  it("acepta JPEG real", () => {
    const r = decodificarImagen(`data:image/jpeg;base64,${jpeg.toString("base64")}`);
    expect("buffer" in r && r.ext).toBe("jpg");
  });
  it("rechaza contenido que no es imagen aunque declare image/png", () => {
    const r = decodificarImagen(`data:image/png;base64,${Buffer.from("<script>").toString("base64")}`);
    expect("error" in r).toBe(true);
  });
  it("rechaza MIME no permitido (svg)", () => {
    const r = decodificarImagen(`data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`);
    expect("error" in r).toBe(true);
  });
});
