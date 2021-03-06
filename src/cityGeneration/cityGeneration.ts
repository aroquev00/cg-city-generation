import { RoadRuleSystem } from "./cityRules.js";
import { Direction, GroundType, Side } from "./cityEnums.js";

class RoadBuilder {
  public direction: Direction;
  public x: number;
  public y: number;

  constructor(x: number, y: number, direction: Direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }

  equals(otherBuilder: RoadBuilder): boolean {
    return (
      this.direction === otherBuilder.direction &&
      this.x === otherBuilder.x &&
      this.y === otherBuilder.y
    );
  }

  copyState(otherBuilder: RoadBuilder) {
    this.x = otherBuilder.x;
    this.y = otherBuilder.y;
    this.direction = otherBuilder.direction;
  }
}

class CityNode {
  public type: GroundType;
  public direction: Direction

  constructor(type: GroundType) {
    this.type = type;
    this.direction = null;
  }
}

export class City {
  public map: CityNode[][];
  public size: number;
  public type: string;
  public rules: RoadRuleSystem;

  public streetsPos: [number, number][];

  private queue: RoadBuilder[];

  constructor(size: number, type: string) {
    this.type = type;
    this.rules = new RoadRuleSystem(type);

    this.queue = [];

    this.size = size;
    this.map = [];

    for (let _row = 0; _row < size; _row++) {
      let tempArr: CityNode[] = [];
      for (let _col = 0; _col < size; _col++) {
        tempArr.push(new CityNode(GroundType.Block));
      }
      this.map.push(tempArr);
    }

    this.createRoads();

    this.streetsPos = [];
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (this.map[x][y].type === GroundType.Street) {
          this.streetsPos.push([x, y]);
        }
      }
    }
  }

  // Method that procedurally builds roads according to rules.
  createRoads() {
    // Starting road
    this.queue.push(
      new RoadBuilder(Math.floor(this.size / 2), 0, Direction.North)
    );
    this.map[Math.floor(this.size / 2)][0].type = GroundType.Street;
    this.map[Math.floor(this.size / 2)][0].direction = Direction.North;

    // Build loop.
    while (this.queue.length > 0) {
      const mainBuilder: RoadBuilder = this.queue.shift()!;

      // Save current builder state.
      const prevMainBuilderState = new RoadBuilder(
        mainBuilder.x,
        mainBuilder.y,
        mainBuilder.direction
      );

      // Stochastically choose rule for next action.
      const nextAction = this.rules.getMovementAction();
      this.applyBuilderAction(mainBuilder, nextAction);

      // If the main builder has stopped and its state has not changed, then there is no need to check for position validation.
      if (!mainBuilder.equals(prevMainBuilderState)) {
        if (this.isValidRoadPosition(mainBuilder)) {
          // It is a valid road position.
          this.queue.push(mainBuilder);
          this.map[mainBuilder.x][mainBuilder.y].type = GroundType.Street;
          this.map[mainBuilder.x][mainBuilder.y].direction = mainBuilder.direction;
        } else {
          // Check if there is a no dead end rule.
          if (!this.rules.allowDeadEnd()) {
            // Try to apply the other rules.
            const availableActions = this.rules.getAvailableMovementActions();
            for (const action of availableActions) {
              mainBuilder.copyState(prevMainBuilderState);
              this.applyBuilderAction(mainBuilder, action);
              if (this.isValidRoadPosition(mainBuilder)) {
                this.queue.push(mainBuilder);
                this.map[mainBuilder.x][mainBuilder.y].type = GroundType.Street;
                this.map[mainBuilder.x][mainBuilder.y].direction = mainBuilder.direction;
                break;
              }
            }
          }
        }
      }

      // Branch out to sides.
      // First try to branch out to the left.
      if (this.rules.shouldBranchOut()) {
        this.branchOutToSide(prevMainBuilderState, Side.Left);
      }
      // Now try to branch out to the right.
      if (this.rules.shouldBranchOut()) {
        this.branchOutToSide(prevMainBuilderState, Side.Right);
      }
    }
  }

  applyBuilderAction(builder: RoadBuilder, action: string) {
    switch (action) {
      case "CS":
        switch (builder.direction) {
          case Direction.North:
            builder.y += 1;
            break;
          case Direction.South:
            builder.y -= 1;
            break;
          case Direction.East:
            builder.x += 1;
            break;
          case Direction.West:
            builder.x -= 1;
            break;
        }
        break;
      case "TR":
        switch (builder.direction) {
          case Direction.North:
            builder.x += 1;
            builder.direction = Direction.East;
            break;
          case Direction.South:
            builder.x -= 1;
            builder.direction = Direction.West;
            break;
          case Direction.East:
            builder.y -= 1;
            builder.direction = Direction.South;
            break;
          case Direction.West:
            builder.y += 1;
            builder.direction = Direction.North;
            break;
        }
        break;
      case "TL":
        switch (builder.direction) {
          case Direction.North:
            builder.x -= 1;
            builder.direction = Direction.West;
            break;
          case Direction.South:
            builder.x += 1;
            builder.direction = Direction.East;
            break;
          case Direction.East:
            builder.y += 1;
            builder.direction = Direction.North;
            break;
          case Direction.West:
            builder.y -= 1;
            builder.direction = Direction.South;
            break;
        }
        break;
      case "STOP":
        break;
      default:
        throw new Error("Error in rule switch.");
        break;
    }
  }

  isValidRoadPosition(builder: RoadBuilder): boolean {
    // First check if road builder is within bounds.
    if (
      builder.x < 0 ||
      builder.x >= this.size ||
      builder.y < 0 ||
      builder.y >= this.size
    ) {
      return false;
    }

    // Check if we have reached intersection.
    if (this.map[builder.x][builder.y].type === GroundType.Street) {
      // Check if we want to go across the street and create an intersection.
      if (this.rules.shouldCrossIntersectingRoad()) {
        switch (builder.direction) {
          case Direction.North:
            if (
              this.map[builder.x][builder.y + 1] !== undefined &&
              this.map[builder.x][builder.y + 1].type === GroundType.Block
            ) {
              builder.y += 1;
              return this.isValidRoadPosition(builder);
            }
            break;
          case Direction.South:
            if (
              this.map[builder.x][builder.y - 1] !== undefined &&
              this.map[builder.x][builder.y - 1].type === GroundType.Block
            ) {
              builder.y -= 1;
              return this.isValidRoadPosition(builder);
            }
            break;
          case Direction.East:
            if (
              this.map[builder.x + 1] !== undefined &&
              this.map[builder.x + 1][builder.y].type === GroundType.Block
            ) {
              builder.x += 1;
              return this.isValidRoadPosition(builder);
            }
            break;
          case Direction.West:
            if (
              this.map[builder.x - 1] !== undefined &&
              this.map[builder.x - 1][builder.y].type === GroundType.Block
            ) {
              builder.x -= 1;
              return this.isValidRoadPosition(builder);
            }
            break;
        }
      }
      return false;
    }

    // Check if no streets bounding new position, except special cases.
    switch (builder.direction) {
      case Direction.North:
        if (
          this.map[builder.x + 1] !== undefined &&
          this.map[builder.x + 1][builder.y].type === GroundType.Street
        ) {
          if (
            this.map[builder.x + 1][builder.y - 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        if (
          this.map[builder.x - 1] !== undefined &&
          this.map[builder.x - 1][builder.y].type === GroundType.Street
        ) {
          if (
            this.map[builder.x - 1][builder.y - 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        break;
      case Direction.South:
        if (
          this.map[builder.x + 1] !== undefined &&
          this.map[builder.x + 1][builder.y].type === GroundType.Street
        ) {
          if (
            this.map[builder.x + 1][builder.y + 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        if (
          this.map[builder.x - 1] !== undefined &&
          this.map[builder.x - 1][builder.y].type === GroundType.Street
        ) {
          if (
            this.map[builder.x - 1][builder.y + 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        break;
      case Direction.East:
        if (
          this.map[builder.x][builder.y + 1] !== undefined &&
          this.map[builder.x][builder.y + 1].type === GroundType.Street
        ) {
          if (
            this.map[builder.x - 1][builder.y + 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        if (
          this.map[builder.x][builder.y - 1] !== undefined &&
          this.map[builder.x][builder.y - 1].type === GroundType.Street
        ) {
          if (
            this.map[builder.x - 1][builder.y - 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        break;
      case Direction.West:
        if (
          this.map[builder.x][builder.y + 1] !== undefined &&
          this.map[builder.x][builder.y + 1].type === GroundType.Street
        ) {
          if (
            this.map[builder.x + 1][builder.y + 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        if (
          this.map[builder.x][builder.y - 1] !== undefined &&
          this.map[builder.x][builder.y - 1].type === GroundType.Street
        ) {
          if (
            this.map[builder.x + 1][builder.y - 1].type === GroundType.Street
          ) {
            return false;
          }
        }
        break;
    }

    return true;
  }

  branchOutToSide(builder: RoadBuilder, side: Side) {
    let newBuilder = new RoadBuilder(builder.x, builder.y, builder.direction);
    if (side === Side.Left) {
      switch (builder.direction) {
        case Direction.North:
          newBuilder.x = builder.x - 1;
          newBuilder.direction = Direction.West;
          break;
        case Direction.South:
          newBuilder.x = builder.x + 1;
          newBuilder.direction = Direction.East;
          break;
        case Direction.East:
          newBuilder.y = builder.y + 1;
          newBuilder.direction = Direction.North;
          break;
        case Direction.West:
          newBuilder.y = builder.y - 1;
          newBuilder.direction = Direction.South;
          break;
      }
    } else {
      switch (builder.direction) {
        case Direction.North:
          newBuilder.x = builder.x + 1;
          newBuilder.direction = Direction.East;
          break;
        case Direction.South:
          newBuilder.x = builder.x - 1;
          newBuilder.direction = Direction.West;
          break;
        case Direction.East:
          newBuilder.y = builder.y - 1;
          newBuilder.direction = Direction.South;
          break;
        case Direction.West:
          newBuilder.y = builder.y + 1;
          newBuilder.direction = Direction.North;
          break;
        default:
          break;
      }
    }
    if (this.isValidRoadPosition(newBuilder)) {
      this.queue.push(newBuilder);
      this.map[newBuilder.x][newBuilder.y].type = GroundType.Street;
      this.map[newBuilder.x][newBuilder.y].direction = newBuilder.direction;
    }
  }

  printCity() {
    for (let y = this.size - 1; y >= 0; y--) {
      let s = "|";
      for (let x = 0; x < this.size; x++) {
        s += this.map[x][y].type === GroundType.Street ? "*" : " ";
      }
      s += "|";
      console.log(s);
    }
  }
}
