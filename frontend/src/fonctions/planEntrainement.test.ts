import { describe, expect, it } from "vitest";

import { AGE_PACE_FACTOR, DIST_PARAMS, VMA_MAX, VMA_MIN, buildSession, computeBasePeakKm, computeWeekPlanTypes, estVmaValide, generateWeeks, getSessionKinds, suggestPeakKm, weekTotals, type AgeBracket, type DistanceKey, type SessionKind } from "./planEntrainement";

const DISTANCES = Object.keys(DIST_PARAMS) as DistanceKey[];
const NB_SEANCES_AUTORISES = [2, 3, 4, 5, 6];
const TYPES_GERES: SessionKind[] = ["EF", "LONGUE", "SEUIL", "FRAC_COURT", "FRAC_LONG", "ALLURE_SPE", "RECUP", "PPG"];
const ALLURE_REGEX = /^Entre \d+:\d{2} et \d+:\d{2} \/km$/;

describe("getSessionKinds + buildSession", () => {
    for (const distance of DISTANCES) {
        for (const nbSeances of NB_SEANCES_AUTORISES) {
            for (const isLateBlock of [false, true]) {
                for (const weekIndex of [1, 2]) {
                    it(`${distance}, ${nbSeances} séances, semaine ${weekIndex}, ${isLateBlock ? "fin" : "début"} de bloc`, () => {
                        const kinds = getSessionKinds(nbSeances, weekIndex, isLateBlock);

                        expect(kinds).toHaveLength(nbSeances);
                        for (const kind of kinds) {
                            expect(TYPES_GERES).toContain(kind);

                            for (const factor of [1, 0.62, 0.42]) {
                                const session = buildSession(kind, 15.5, DIST_PARAMS[distance], factor, AGE_PACE_FACTOR["55+"]);

                                expect(session.kind).toBe(kind);
                                expect(session.durationMin).toBeGreaterThan(0);
                                expect(Number.isFinite(session.durationMin)).toBe(true);
                                expect(session.pace).not.toBe("");
                                if (kind === "PPG") {
                                    expect(session.distanceKm).toBe(0);
                                } else {
                                    expect(session.distanceKm).toBeGreaterThan(0);
                                    expect(Number.isFinite(session.distanceKm)).toBe(true);
                                    expect(session.pace).toMatch(ALLURE_REGEX);
                                }
                            }
                        }
                    });
                }
            }
        }
    }
});

describe("buildSession ALLURE_SPE (non-régression)", () => {
    it("getSessionKinds propose ALLURE_SPE en fin de bloc à partir de 4 séances", () => {
        expect(getSessionKinds(4, 1, true)).toContain("ALLURE_SPE");
        expect(getSessionKinds(4, 1, false)).not.toContain("ALLURE_SPE");
    });

    it("construit une séance d'allure spécifique au lieu de lever une erreur", () => {
        const session = buildSession("ALLURE_SPE", 15, DIST_PARAMS["10km"], 1);

        expect(session.label).toBe("Allure spécifique");
        // 10 km : 90 à 93 % de VMA 15 => 13,5 à 13,95 km/h
        expect(session.pace).toBe("Entre 4:27 et 4:18 /km");
        expect(session.vol).toBe("6km éch. + 20min allure spécifique + 3km récup");
        expect(session.distanceKm).toBeGreaterThan(9);
    });

    it("applique le facteur âge à l'allure spécifique", () => {
        const jeune = buildSession("ALLURE_SPE", 15, DIST_PARAMS["10km"], 1, AGE_PACE_FACTOR["<35"]);
        const senior = buildSession("ALLURE_SPE", 15, DIST_PARAMS["10km"], 1, AGE_PACE_FACTOR["55+"]);

        expect(senior.pace).not.toBe(jeune.pace);
        // Durée d'effort identique, courue moins vite : moins de distance.
        expect(senior.distanceKm).toBeLessThan(jeune.distanceKm);
    });

    it("un plan de 4 séances ou plus ne plante pas sur les semaines de fin de bloc", () => {
        for (const distance of DISTANCES) {
            expect(() => generateWeeks(distance, 15.5, 4, DIST_PARAMS[distance].defWeeks, 40, "<35")).not.toThrow();
        }
    });
});

describe("computeWeekPlanTypes", () => {
    it("termine par 1 semaine d'affûtage sur 5 et 10 km, 2 sur semi et marathon", () => {
        expect(computeWeekPlanTypes(8, "5km").filter((w) => w.type === "taper")).toHaveLength(1);
        expect(computeWeekPlanTypes(10, "10km").filter((w) => w.type === "taper")).toHaveLength(1);
        expect(computeWeekPlanTypes(12, "semi").filter((w) => w.type === "taper")).toHaveLength(2);
        expect(computeWeekPlanTypes(14, "marathon").filter((w) => w.type === "taper")).toHaveLength(2);
    });

    it("place une semaine d'assimilation toutes les 4 semaines hors affûtage", () => {
        const types = computeWeekPlanTypes(12, "10km").map((w) => w.type);

        expect(types[3]).toBe("recovery");
        expect(types[7]).toBe("recovery");
        expect(types[11]).toBe("taper");
    });
});

describe("computeBasePeakKm", () => {
    it("renvoie un volume positif pour chaque distance et nombre de séances", () => {
        for (const distance of DISTANCES) {
            for (const nbSeances of NB_SEANCES_AUTORISES) {
                expect(computeBasePeakKm(DIST_PARAMS[distance], nbSeances, 15.5)).toBeGreaterThan(0);
            }
        }
    });
});

describe("generateWeeks", () => {
    const PROFILS: { vma: number; age: AgeBracket }[] = [
        { vma: 12, age: "<35" },
        { vma: 12, age: "55+" },
        { vma: 15.5, age: "<35" },
        { vma: 15.5, age: "55+" },
        { vma: 19.2, age: "<35" },
        { vma: 19.2, age: "55+" },
    ];

    for (const distance of DISTANCES) {
        for (const { vma, age } of PROFILS) {
            for (const nbSeances of NB_SEANCES_AUTORISES) {
                it(`${distance}, VMA ${vma}, ${age}, ${nbSeances} séances`, () => {
                    const nbSemaines = DIST_PARAMS[distance].defWeeks;
                    const targetKm = parseFloat(suggestPeakKm(String(vma), distance));
                    const weeks = generateWeeks(distance, vma, nbSeances, nbSemaines, targetKm, age);

                    expect(weeks).toHaveLength(nbSemaines);
                    weeks.forEach((w, i) => {
                        expect(w.num).toBe(i + 1);
                        expect(w.sessions).toHaveLength(nbSeances);
                        for (const s of w.sessions) {
                            expect(Number.isNaN(s.durationMin)).toBe(false);
                            expect(Number.isNaN(s.distanceKm)).toBe(false);
                            expect(s.pace).not.toContain("NaN");
                            expect(s.vol).not.toContain("NaN");
                        }
                    });

                    const kmBuildMax = Math.max(...weeks.filter((w) => w.type === "build").map((w) => weekTotals(w).km));
                    const semainesAffutage = weeks.filter((w) => w.type === "taper");

                    expect(semainesAffutage.length).toBeGreaterThan(0);
                    expect(weeks[weeks.length - 1].type).toBe("taper");
                    for (const w of semainesAffutage) {
                        expect(weekTotals(w).km).toBeLessThan(kmBuildMax);
                    }
                });
            }
        }
    }

    it("accepte les bornes du formulaire (3 et 20 semaines)", () => {
        for (const distance of DISTANCES) {
            expect(generateWeeks(distance, 15.5, 6, 3, 40, "<35")).toHaveLength(3);
            expect(generateWeeks(distance, 15.5, 6, 20, 40, "<35")).toHaveLength(20);
        }
    });
});

describe("suggestPeakKm", () => {
    it("calcule un volume arrondi à 5 km selon la VMA et la distance", () => {
        // 6 × 15,5 − 30 = 63 km pour un 10 km
        expect(suggestPeakKm("15.5", "10km")).toBe("65");
        // plancher à 20 km, × 0,75 pour un 5 km
        expect(suggestPeakKm("", "5km")).toBe("15");
    });
});

describe("estVmaValide", () => {
    it("accepte les VMA comprises entre les bornes du formulaire", () => {
        expect(estVmaValide(VMA_MIN)).toBe(true);
        expect(estVmaValide(15.5)).toBe(true);
        expect(estVmaValide(VMA_MAX)).toBe(true);
    });

    it("refuse une VMA nulle, hors bornes ou non numérique", () => {
        expect(estVmaValide(0)).toBe(false);
        expect(estVmaValide(VMA_MIN - 0.1)).toBe(false);
        expect(estVmaValide(VMA_MAX + 0.1)).toBe(false);
        expect(estVmaValide(Number.NaN)).toBe(false);
    });
});
