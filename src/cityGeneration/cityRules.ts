
class RoadRule {
  public action: string;
  public probability: number;

  constructor(action: string, probability: number) {
    this.action = action;
    this.probability = probability;
  }
}


export class RoadRuleSystem {
  public rules: RoadRule[];

  constructor(type: string) {

    this.rules = [];
    this.rules.push(new RoadRule("CS", 0.8));
    this.rules.push(new RoadRule("TL", 0.1));
    this.rules.push(new RoadRule("TR", 0.1));
    // TODO: Add rule for stopping (dead ends?)
  }

  getMovementAction(): string {
    const prob = Math.random();
    let accumulatedProb = 0.0;
    for (let rule of this.rules) {
      accumulatedProb += rule.probability;
      if (prob <= accumulatedProb) {
        return rule.action;
      }
    }
    throw new Error("Rules do not add up to 1.");
  }

  shouldBranchOut(): boolean {
    const prob = Math.random();
    if (prob > 0.8) {
      return true;
    } else {
      return false;
    }
  }

  shouldCrossIntersectingRoad(): boolean {
    const prob = Math.random();
    if (prob > 0.5) {
      return true;
    } else {
      return false;
    }
  }

  allowDeadEnd(): boolean {
    return false;
  }

  getAvailableMovementActions() {
    return this.rules.map(rule => rule.action);
  }
}
