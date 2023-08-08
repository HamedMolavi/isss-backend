export { };

declare global {
  //define config type
  interface IConfig {
    timeDuplicationDiagnoses: number;
    threshold: number;
    min_people: number;
    max_people: number;
    zones: [[number, number, number, number]];
  };

};