import { describe, expect, it } from "vitest";
import { referenceValue, zScore } from "@/data/growth-reference";

// Valores conferidos com as tabelas publicadas pela OMS (z-scores mensais).
describe("curvas OMS (LMS)", () => {
  it("mediana de peso ao nascer (menino) = 3,3464 kg", () => {
    expect(referenceValue("M", "weight", 0, 0)).toBeCloseTo(3.3464, 3);
  });
  it("peso menina 12 meses: -2 DP ≈ 7,0 kg e +2 DP ≈ 11,5 kg", () => {
    expect(referenceValue("F", "weight", 12, -2)).toBeCloseTo(7.0, 1);
    expect(referenceValue("F", "weight", 12, 2)).toBeCloseTo(11.5, 1);
  });
  it("estatura menino 24 meses: mediana ≈ 87,1 cm (tabela de estatura, em pé)", () => {
    expect(referenceValue("M", "height", 24, 0)).toBeCloseTo(87.1, 0);
  });
  it("escore z inverte o valor da curva", () => {
    const v = referenceValue("F", "head", 6, 1.5);
    expect(zScore("F", "head", 6, v)).toBeCloseTo(1.5, 6);
  });
  it("IMC 10 anos (menino) usa Referência 2007: mediana ≈ 16,4", () => {
    expect(referenceValue("M", "bmi", 120, 0)).toBeCloseTo(16.4, 1);
  });
  it("fora da faixa da OMS devolve NaN (peso após 10 anos)", () => {
    expect(Number.isNaN(zScore("M", "weight", 130, 30))).toBe(true);
  });
  it("peso muito alto usa a correção da OMS acima de +3 DP", () => {
    const sd3 = referenceValue("M", "weight", 24, 3);
    const sd2 = referenceValue("M", "weight", 24, 2);
    expect(zScore("M", "weight", 24, sd3 + (sd3 - sd2))).toBeCloseTo(4, 6);
  });
});
