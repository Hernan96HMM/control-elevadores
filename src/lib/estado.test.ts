import { describe, expect, it } from "vitest";
import { estadoEquipo, fallaPendiente, resultadoControl, transicionValida } from "./estado";

describe("resultadoControl", () => {
  it("todo OK → ok", () => {
    expect(resultadoControl([{ ok: true, critico: true }, { ok: true, critico: false }])).toBe("ok");
  });
  it("falla no crítica → observaciones", () => {
    expect(resultadoControl([{ ok: true, critico: true }, { ok: false, critico: false }])).toBe("observaciones");
  });
  it("falla crítica (ej. freno de mano) → fuera de servicio", () => {
    expect(resultadoControl([{ ok: false, critico: true }, { ok: true, critico: false }])).toBe("fuera_servicio");
  });
  it("crítica + no crítica → prevalece la crítica", () => {
    expect(resultadoControl([{ ok: false, critico: false }, { ok: false, critico: true }])).toBe("fuera_servicio");
  });
});

describe("estadoEquipo", () => {
  it("sin fallas y con control hoy → operativo", () => {
    expect(estadoEquipo({ fallas: [], controlHoy: true })).toBe("operativo");
  });
  it("sin fallas y sin control hoy → sin_control", () => {
    expect(estadoEquipo({ fallas: [], controlHoy: false })).toBe("sin_control");
  });
  it("falla crítica abierta → fuera de servicio aunque no haya control hoy", () => {
    expect(estadoEquipo({ fallas: [{ critica: true, estado: "abierta" }], controlHoy: false })).toBe("fuera_servicio");
  });
  it("falla crítica en reparación → sigue fuera de servicio", () => {
    expect(estadoEquipo({ fallas: [{ critica: true, estado: "en_reparacion" }], controlHoy: true })).toBe(
      "fuera_servicio",
    );
  });
  it("falla crítica resuelta → habilita el equipo", () => {
    expect(estadoEquipo({ fallas: [{ critica: true, estado: "resuelta" }], controlHoy: true })).toBe("operativo");
  });
  it("falla no crítica abierta → observaciones", () => {
    expect(estadoEquipo({ fallas: [{ critica: false, estado: "abierta" }], controlHoy: true })).toBe("observaciones");
  });
  it("crítica cerrada + no crítica en reparación → observaciones", () => {
    expect(
      estadoEquipo({
        fallas: [
          { critica: true, estado: "conformidad" },
          { critica: false, estado: "en_reparacion" },
        ],
        controlHoy: true,
      }),
    ).toBe("observaciones");
  });
});

describe("fallas", () => {
  it("pendiente solo abierta / en reparación", () => {
    expect(fallaPendiente("abierta")).toBe(true);
    expect(fallaPendiente("en_reparacion")).toBe(true);
    expect(fallaPendiente("resuelta")).toBe(false);
    expect(fallaPendiente("conformidad")).toBe(false);
  });
  it("la conformidad solo la da el operario sobre una falla resuelta", () => {
    expect(transicionValida("resuelta", "conformidad", "operario")).toBe(true);
    expect(transicionValida("resuelta", "conformidad", "mantenimiento")).toBe(false);
    expect(transicionValida("abierta", "conformidad", "operario")).toBe(false);
  });
  it("mantenimiento: abierta → en reparación → resuelta", () => {
    expect(transicionValida("abierta", "en_reparacion", "mantenimiento")).toBe(true);
    expect(transicionValida("en_reparacion", "resuelta", "mantenimiento")).toBe(true);
    expect(transicionValida("conformidad", "abierta", "mantenimiento")).toBe(false);
  });
});
