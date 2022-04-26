import { RoadRuleSystem } from "./cityRules";

let rules = new RoadRuleSystem();

class RoadBuilder {
  public direction: string;
  public x: number;
  public y: number;

  constructor(x: number, y: number, direction: string) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }
}

class CityNode {
  public type: string;

  constructor(type?: string) {
    this.type = type ?? " ";
  }
}

class City {
  public map: CityNode[][];
  public size: number;

  constructor(size: number) {
    this.size = size;
    this.map = [];
    for (let _row = 0; _row < size; _row++) {
      let tempArr: CityNode[] = [];
      for (let _col = 0; _col < size; _col++) {
        tempArr.push(new CityNode());
      }
      this.map.push(tempArr);
    }
    this.createRoadsDriver();
  }

  createRoadsDriver() {
    // Starting road
    let builder = new RoadBuilder(Math.floor(this.size / 2), this.size - 1,"N");

    
    
    this.createRoad(builder);
  }

  createRoad(builder: RoadBuilder) {
    if (this.isOutOfBounds(builder)) {
      return;
    }
    this.map[builder.y][builder.x].type = "*";
    // choose rule
    const nextAction = rules.getRule();
    switch (nextAction) {
      case "CS":
        switch (builder.direction) {
          case "N":
            builder.y -= 1;
            break;
          case "S":
            builder.y += 1;
            break;
          case "E":
            builder.x += 1;
            break;
          case "W":
            builder.x -= 1;
            break;
          default:
            break;
        }
        break;
      case "TR":
        switch (builder.direction) {
          case "N":
            builder.x += 1;
            builder.direction = "E";
            break;
          case "S":
            builder.x -= 1;
            builder.direction = "W";
            break;
          case "E":
            builder.y += 1;
            builder.direction = "S";
            break;
          case "W":
            builder.y -= 1;
            builder.direction = "N";
            break;
          default:
            break;
        }
        break;
      case "TL":
        switch (builder.direction) {
          case "N":
            builder.x -= 1;
            builder.direction = "W";
            break;
          case "S":
            builder.x += 1;
            builder.direction = "E";
            break;
          case "E":
            builder.y -= 1;
            builder.direction = "N";
            break;
          case "W":
            builder.y += 1;
            builder.direction = "S";
            break;
          default:
            break;
        }
        break;
      default:
        throw new Error("Error in rule switch");
        break;
    }
    this.createRoad(builder);
  }

  isOutOfBounds(builder: RoadBuilder) {
    return builder.x < 0 || builder.x >= this.size || builder.y < 0 || builder.y >= this.size;
  }
}

let city = new City(20);

function printCity(city: City) {
  for (let row of city.map) {
    let s = "|";
    for (let node of row) {
      s += node.type;
    }
    s += "|"
    console.log(s);
  }
}



printCity(city);
