import { RoadRuleSystem } from "./cityRules";
import { Direction, GroundType } from "./cityEnums";

let rules = new RoadRuleSystem("Downtown");

class RoadBuilder {
  public direction: Direction;
  public x: number;
  public y: number;

  constructor(x: number, y: number, direction: Direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }
}

class CityNode {
  public type: GroundType;

  constructor(type: GroundType) {
    this.type = type;
  }
}

export class City {
  public map: CityNode[][];
  public size: number;

  private queue: RoadBuilder[];

  constructor(size: number) {
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
  }

  createRoads() {
    // Starting road
    let builder = new RoadBuilder(
      Math.floor(this.size / 2),
      0,
      Direction.North
    );
    this.queue.push(builder);

    // Build loop.
    while (this.queue.length > 0) {
      let builder: RoadBuilder = this.queue.shift()!;
      if (!this.isValidRoadPosition(builder)) {
        continue;
      }
      this.map[builder.x][builder.y].type = GroundType.Street;
      // choose rule
      const nextAction = rules.getRule();
      switch (nextAction) {
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
            default:
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
            default:
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
            default:
              break;
          }
          break;
        default:
          throw new Error("Error in rule switch");
          break;
      }
      this.queue.push(builder);

      // Branch out
      // First branch out left, if valid
      if (rules.getBranchOutRule()) {
        let newBuilder = new RoadBuilder(
          builder.x,
          builder.y,
          builder.direction
        );
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
          default:
            break;
        }

        this.queue.push(newBuilder);
      }

      // Now to branch out right
      if (rules.getBranchOutRule()) {
        let newBuilder = new RoadBuilder(
          builder.x,
          builder.y,
          builder.direction
        );
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
        this.queue.push(newBuilder);
      }
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
      if (rules.getCrossingRule()) {
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

    // TODO: No dead ends.

    // Check if no streets bounding new position, except special cases.
    switch (builder.direction) {
      case Direction.North:
        if (
          this.map[builder.x + 1] !== undefined &&
          this.map[builder.x + 1][builder.y].type === GroundType.Street
        ) {
          if (this.map[builder.x + 1][builder.y - 1].type === GroundType.Street) {
            return false;
          }
        }
        if (
          this.map[builder.x - 1] !== undefined &&
          this.map[builder.x - 1][builder.y].type === GroundType.Street
        ) {
          if (this.map[builder.x - 1][builder.y - 1].type === GroundType.Street) {
            return false;
          }
        }
        break;
      case Direction.South:
        if (
          this.map[builder.x + 1] !== undefined &&
          this.map[builder.x + 1][builder.y].type === GroundType.Street
        ) {
          if (this.map[builder.x + 1][builder.y + 1].type === GroundType.Street) {
            return false;
          }
        }
        if (
          this.map[builder.x - 1] !== undefined &&
          this.map[builder.x - 1][builder.y].type === GroundType.Street
        ) {
          if (this.map[builder.x - 1][builder.y + 1].type === GroundType.Street) {
            return false;
          }
        }
        break;
      case Direction.East:
        if (
          this.map[builder.x][builder.y + 1] !== undefined &&
          this.map[builder.x][builder.y + 1].type === GroundType.Street
        ) {
          if (this.map[builder.x - 1][builder.y + 1].type === GroundType.Street) {
            return false;
          }
        }
        if (
          this.map[builder.x][builder.y - 1] !== undefined &&
          this.map[builder.x][builder.y - 1].type === GroundType.Street
        ) {
          if (this.map[builder.x - 1][builder.y - 1].type === GroundType.Street) {
            return false;
          }
        }
        break;
      case Direction.West:
        if (
          this.map[builder.x][builder.y + 1] !== undefined &&
          this.map[builder.x][builder.y + 1].type === GroundType.Street
        ) {
          if (this.map[builder.x + 1][builder.y + 1].type === GroundType.Street) {
            return false;
          }
        }
        if (
          this.map[builder.x][builder.y - 1] !== undefined &&
          this.map[builder.x][builder.y - 1].type === GroundType.Street
        ) {
          if (this.map[builder.x + 1][builder.y - 1].type === GroundType.Street) {
            return false;
          }
        }
        break;
    }

    return true;
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
