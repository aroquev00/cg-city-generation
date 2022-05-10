import { cityProbs } from "./static/cityProbs.js";
class RoadRule {
  public action: string;
  public probability: number;

  constructor(action: string, probability: number) {
    this.action = action;
    this.probability = probability;
  }
}

export class RoadRuleSystem {
  public type: string;
  public movementActionRules: RoadRule[] = [];
  public branchOutRules: RoadRule[] = [];
  public crossIntersectionRules: RoadRule[] = [];
  public deadEndRules: RoadRule[] = [];

  constructor(type: string) {
    this.type = type;

    for (const ruleObject of cityProbs) {
      if (ruleObject.type === type) {
        this.movementActionRules = ruleObject.movementActionRules.map(
          (rule: { action: string; probability: number }) =>
            new RoadRule(rule.action, rule.probability)
        );
        this.branchOutRules = ruleObject.branchOutRules.map(
          (rule: { action: string; probability: number }) =>
            new RoadRule(rule.action, rule.probability)
        );
        this.crossIntersectionRules = ruleObject.crossIntersectionRules.map(
          (rule: { action: string; probability: number }) =>
            new RoadRule(rule.action, rule.probability)
        );
        this.deadEndRules = ruleObject.deadEndRules.map(
          (rule: { action: string; probability: number }) =>
            new RoadRule(rule.action, rule.probability)
        );
        break;
      }
    }
  }

  getAvailableMovementActions() {
    return this.movementActionRules.map((rule) => rule.action);
  }

  getMovementAction(): string {
    return this.getActionFromRules(this.movementActionRules);
  }

  shouldBranchOut(): boolean {
    return this.getActionFromRules(this.branchOutRules) === "doBranchOut";
  }

  shouldCrossIntersectingRoad(): boolean {
    return (
      this.getActionFromRules(this.crossIntersectionRules) ===
      "doCrossIntersection"
    );
  }

  allowDeadEnd(): boolean {
    return this.getActionFromRules(this.deadEndRules) === "doAllowDeadEnd";
  }

  getActionFromRules(rules: RoadRule[]): string {
    const prob = Math.random();
    let accumulatedProb = 0.0;
    for (let rule of rules) {
      accumulatedProb += rule.probability;
      if (prob <= accumulatedProb) {
        return rule.action;
      }
    }
    throw new Error("Rules do not add up to at least 1.");
  }
}
