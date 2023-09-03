import { log } from "../tools/util.tools";
//TODO: add more commands
const stdin = process.stdin;
export async function setupInteractive(): Promise<void> {
  // Setup Interactive stdin
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (key: string) {
    act(key.trim());
  });
};

async function act(action: string) {
  switch (action) { // explicit actions
    case '\u0003':// ctrl-c
      process.exit(0);
    case 'clear':
      console.clear();
      break;


    default: // implicit actions
      if (action.startsWith("close consumer")) {
        const consumerIds = action.split("close consumer ")[1];
        for (const consumerId of consumerIds.split(" ")) {
          const consumer = process["CONSUMERS"].get(consumerId);
          await consumer?.delete().then(_ => log("consumer", consumerId, "deleted!"))
        }
      } else {
        log("Unknown command!");
        break;
      }
  };




};