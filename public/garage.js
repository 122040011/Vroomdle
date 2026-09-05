export class Car {
  x = 0;
  y = 0;
  angle = 0;
  speed = 0;
  currentSegmentIndex = 0;
  prevX = 0;
  prevY = 0;
  maxSpeed = 0;
  acceleration = 0;
  brake = 0;
  friction = 0;
  constructor({
    type,
    colour,
    maxSpeed,
    acceleration,
    brake,
    friction,
    turnSpeed,
  }) {
    this.type = type;
    this.colour = colour;

    this.baseMaxSpeed = maxSpeed;
    this.baseAcceleration = acceleration;
    this.baseBrake = brake;
    this.baseFriction = friction;

    this.turnSpeed = turnSpeed;
  }

  scaleCar(scale) {
    console.log(scale);
    this.maxSpeed = this.baseMaxSpeed * scale;
    this.acceleration = this.baseAcceleration * scale;
    this.brake = this.baseBrake * scale;
    this.friction = this.baseFriction * scale;
  }
}
export let garage = [];
garage.push(
  new Car({
    type: "basic",
    colour: "#538d4e",
    maxSpeed: 900,
    acceleration: 180,
    brake: 900,
    friction: 180,
    turnSpeed: 2.45,
  }),
);

garage.push(
  new Car({
    type: "daredevil",
    colour: "#bd2b32",
    maxSpeed: 1800,
    acceleration: 450,
    brake: 450,
    friction: 90,
    turnSpeed: 1.8,
  }),
);

garage.push(
  new Car({
    type: "drift",
    colour: "#3646c5",
    maxSpeed: 750,
    acceleration: 240,
    brake: 900,
    friction: 180,
    turnSpeed: 3,
  }),
);

garage.push(
  new Car({
    type: "tractor",
    colour: "#6f4e2d",
    maxSpeed: 500,
    acceleration: 100,
    brake: 650,
    friction: 300,
    turnSpeed: 2.1,
  }),
);

garage.push(
  new Car({
    type: "lambo",
    colour: "#e07911",
    maxSpeed: 1500,
    acceleration: 400,
    brake: 900,
    friction: 450,
    turnSpeed: 3,
  }),
);

garage.push(
  new Car({
    type: "cooper",
    colour: "#d560d7",
    maxSpeed: 1000,
    acceleration: 150,
    brake: 800,
    friction: 250,
    turnSpeed: 2.5,
  }),
);
