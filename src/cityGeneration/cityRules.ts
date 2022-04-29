import fs from 'fs'

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

    //const rulesJson = JSON.parse(fs.readFileSync('/static/cityGeneration/cityProbs.json', 'utf-8'));
    const rulesJson = JSON.parse(fs.readFileSync('./src/cityGeneration/static/cityGeneration/cityProbs.json', 'utf-8'));

    for (const ruleJson of rulesJson) {
      if (ruleJson.type === type) {
        this.movementActionRules = ruleJson.movementActionRules.map((rule: { action: string; probability: number; }) => new RoadRule(rule.action, rule.probability));
        this.branchOutRules = ruleJson.branchOutRules.map((rule: { action: string; probability: number; }) => new RoadRule(rule.action, rule.probability));
        this.crossIntersectionRules = ruleJson.crossIntersectionRules.map((rule: { action: string; probability: number; }) => new RoadRule(rule.action, rule.probability));
        this.deadEndRules = ruleJson.deadEndRules.map((rule: { action: string; probability: number; }) => new RoadRule(rule.action, rule.probability));
        break;
      }
    }
  }

  getAvailableMovementActions() {
    return this.movementActionRules.map(rule => rule.action);
  }

  getMovementAction(): string {
    return this.getActionFromRules(this.movementActionRules);
  }
  

  shouldBranchOut(): boolean {
    return (this.getActionFromRules(this.branchOutRules) === "doBranchOut");
  }

  shouldCrossIntersectingRoad(): boolean {
    return (this.getActionFromRules(this.crossIntersectionRules) === "doCrossIntersection");
  }

  allowDeadEnd(): boolean {
    return (this.getActionFromRules(this.deadEndRules) === "doAllowDeadEnd");
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
