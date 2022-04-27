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
      this.size - 1,
      Direction.North
    );
    this.queue.push(builder);
    while (this.queue.length > 0) {
      let builder: RoadBuilder = this.queue.shift()!;
      if (! this.isValidRoadPosition(builder)) {
        continue;
      }
      this.map[builder.y][builder.x].type = GroundType.Street;
      // choose rule
      const nextAction = rules.getRule();
      switch (nextAction) {
        case "CS":
          switch (builder.direction) {
            case Direction.North:
              builder.y -= 1;
              break;
            case Direction.South:
              builder.y += 1;
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
              builder.y += 1;
              builder.direction = Direction.South;
              break;
            case Direction.West:
              builder.y -= 1;
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
              builder.y -= 1;
              builder.direction = Direction.North;
              break;
            case Direction.West:
              builder.y += 1;
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
            newBuilder.y = builder.y - 1;
            newBuilder.direction = Direction.North;
            break;
          case Direction.West:
            newBuilder.y = builder.y + 1;
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
            newBuilder.y = builder.y + 1;
            newBuilder.direction = Direction.South;
            break;
          case Direction.West:
            newBuilder.y = builder.y - 1;
            newBuilder.direction = Direction.North;
            break;
          default:
            break;
        }
        this.queue.push(newBuilder);
      }
    }
  }

  isValidRoadPosition(builder: RoadBuilder) {
    // First check if road builder is within bounds.
    if (
      builder.x < 0 ||
      builder.x >= this.size ||
      builder.y < 0 ||
      builder.y >= this.size
    ) {
      return false;
    }

    if (this.map[builder.y][builder.x].type === GroundType.Street) {
      return false;
    }

    return true;
  }

  printCity() {
    for (let row of this.map) {
      let s = "|";
      for (let node of row) {
        s += node.type === GroundType.Street ? "*" : " ";
      }
      s += "|";
      console.log(s);
    }
  }
}
